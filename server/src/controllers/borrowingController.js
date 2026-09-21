const prisma = require('../db');
const jwt = require('jsonwebtoken');

const getStats = async (req, res) => {
  try {
    const active = await prisma.borrowRecord.count({ where: { status: 'BORROWED' } });
    const overdue = await prisma.borrowRecord.count({ where: { status: 'OVERDUE' } });
    const returned = await prisma.borrowRecord.count({ where: { status: 'RETURNED' } });
    
    res.json({ active, overdue, returned });
  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const validateBook = async (req, res) => {
  try {
    const { identifier } = req.params;
    const { action } = req.query; // 'return' or undefined

    const book = await prisma.book.findFirst({
      where: {
        OR: [
          { isbn: identifier },
          { qr_code: identifier }
        ]
      },
      include: { author: true }
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (action !== 'return' && book.is_archived) {
      return res.status(400).json({ error: 'This book has been archived and is not available for borrowing' });
    }

    if (action !== 'return' && book.available_copies <= 0) {
      return res.status(400).json({ error: 'No available copies of this book' });
    }

    res.json(book);
  } catch (error) {
    console.error('Validate Book Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const validateUser = async (req, res) => {
  try {
    const { identifier } = req.params;

    let searchId = identifier;

    // Check if identifier is a JWT
    if (identifier.split('.').length === 3) {
      try {
        const decoded = jwt.verify(identifier, process.env.JWT_SECRET || 'fallback_secret_key');
        if (decoded && decoded.student_id) {
          searchId = decoded.student_id;
        }
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired QR token' });
      }
    }

    // First, try to match against the full exact identifier
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { student_id: searchId },
          { card_no: searchId }
        ]
      }
    });

    // If not found and identifier starts with CCC-, try without prefix
    if (!user && searchId.startsWith('CCC-')) {
      const studentId = searchId.replace('CCC-', '');
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { student_id: studentId },
            { card_no: studentId }
          ]
        }
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(400).json({ error: 'User account is suspended' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'User account is not active' });
    }

    const settings = await prisma.librarySettings.findFirst();
    if (settings && parseFloat(user.penalty_balance) >= parseFloat(settings.suspension_threshold)) {
      return res.status(400).json({ error: `User is suspended due to unpaid penalties (Threshold: ₱${settings.suspension_threshold}).` });
    }

    // Also check max books limit upfront so the UI can show a clear error early
    if (settings) {
      const activeBorrows = await prisma.borrowRecord.count({
        where: {
          user_id: user.id,
          status: { in: ['BORROWED', 'OVERDUE'] }
        }
      });
      if (activeBorrows >= parseInt(settings.max_books_per_user)) {
        return res.status(400).json({ error: `User has reached the maximum limit of ${settings.max_books_per_user} borrowed books.` });
      }
    }

    res.json(user);
  } catch (error) {
    console.error('Validate User Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const checkout = async (req, res) => {
  try {
    const { bookId, userId, borrowType = 'TAKE_OUT' } = req.body;

    const bId = parseInt(bookId, 10);
    const uId = parseInt(userId, 10);

    const book = await prisma.book.findUnique({ where: { id: bId } });
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (book.is_archived) {
      return res.status(400).json({ error: 'This book has been archived and cannot be checked out' });
    }

    if (book.available_copies <= 0) {
      return res.status(400).json({ error: 'Book is not available' });
    }

    const user = await prisma.user.findUnique({ where: { id: uId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const settings = await prisma.librarySettings.findFirst();
    if (settings) {
      const activeBorrows = await prisma.borrowRecord.count({
        where: {
          user_id: uId,
          status: { in: ['BORROWED', 'OVERDUE'] }
        }
      });

      if (activeBorrows >= parseInt(settings.max_books_per_user)) {
        return res.status(400).json({ error: `User has reached the maximum limit of ${settings.max_books_per_user} borrowed books.` });
      }
    }

    const dueDate = new Date();
    
    if (borrowType === 'READ_IN_LIBRARY') {
      // Due at the end of the current day
      dueDate.setHours(23, 59, 59, 999);
    } else {
      let duration = 7; // fallback
      if (settings) {
        duration = user.role === 'FACULTY' ? parseInt(settings.borrow_duration_faculty) : parseInt(settings.borrow_duration_students);
      }
      dueDate.setDate(dueDate.getDate() + duration);
    }

    const record = await prisma.$transaction(async (tx) => {
      await tx.book.update({
        where: { id: bId },
        data: { available_copies: { decrement: 1 } }
      });

      const record = await tx.borrowRecord.create({
        data: {
          book_id: bId,
          user_id: uId,
          borrow_date: new Date(),
          due_date: dueDate,
          status: 'BORROWED',
          type: borrowType
        }
      });

      await tx.notification.create({
        data: {
          category: 'BORROWING',
          title: 'Book Borrowed',
          message: `You borrowed "${book.title}". It is due on ${dueDate.toLocaleDateString()}.`,
          target_user_id: uId,
        }
      });

      return record;
    });

    res.json({ message: 'Checkout successful', record });
  } catch (error) {
    console.error('Checkout Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getUserActiveBorrow = async (req, res) => {
  try {
    const { bookIdentifier, userIdentifier } = req.params;

    const record = await prisma.borrowRecord.findFirst({
      where: {
        book: {
          OR: [
            { isbn: bookIdentifier },
            { qr_code: bookIdentifier }
          ]
        },
        user: {
          OR: [
            { student_id: userIdentifier },
            { card_no: userIdentifier }
          ]
        },
        status: {
          in: ['BORROWED', 'OVERDUE']
        }
      },
      include: {
        book: true,
        user: true
      }
    });

    if (!record) {
      return res.status(404).json({ error: 'No active borrow record found for this user and book' });
    }

    res.json(record);
  } catch (error) {
    console.error('User Active Borrow Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const returnBook = async (req, res) => {
  try {
    const { borrowId } = req.body;

    const record = await prisma.borrowRecord.findUnique({ where: { id: borrowId } });
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.borrowRecord.update({
        where: { id: borrowId },
        data: {
          return_date: new Date(),
          status: 'RETURNED'
        }
      });

      const bookToReturn = await tx.book.findUnique({ where: { id: record.book_id } });
      if (bookToReturn && bookToReturn.available_copies < bookToReturn.total_copies) {
        await tx.book.update({
          where: { id: record.book_id },
          data: { available_copies: { increment: 1 } }
        });
      }

      // Secure penalty calculation
      if (new Date() > new Date(record.due_date)) {
        const settings = await tx.settings.findFirst();
        const penaltyFee = settings && settings.penalty_fee_per_day 
          ? parseFloat(settings.penalty_fee_per_day) 
          : 10.0;
        
        const daysLate = Math.ceil((new Date() - new Date(record.due_date)) / (1000 * 60 * 60 * 24));
        
        if (daysLate > 0) {
          await tx.penalty.create({
            data: {
              user_id: record.user_id,
              borrow_id: record.id,
              amount: daysLate * penaltyFee,
              status: 'UNPAID'
            }
          });

          await tx.notification.create({
            data: {
              category: 'PENALTIES',
              title: 'Overdue Penalty',
              message: `You were assessed a penalty for returning a book late.`,
              target_user_id: record.user_id,
            }
          });
        }
      }

      await tx.notification.create({
        data: {
          category: 'BORROWING',
          title: 'Book Returned',
          message: `You successfully returned a book.`,
          target_user_id: record.user_id,
        }
      });
    });

    res.json({ message: 'Return successful' });
  } catch (error) {
    console.error('Return Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getPenalties = async (req, res) => {
  try {
    const penalties = await prisma.penalty.findMany({
      where: { status: 'UNPAID' },
      include: {
        user: true,
        borrow: {
          include: { book: true }
        }
      }
    });

    // We map it to include days_overdue for the frontend display
    const mappedPenalties = penalties.map(p => {
      let daysOverdue = 0;
      if (p.borrow && p.borrow.due_date) {
        const diffTime = Math.abs(new Date() - new Date(p.borrow.due_date));
        daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      return {
        ...p,
        days_overdue: daysOverdue
      };
    });

    res.json(mappedPenalties);
  } catch (error) {
    console.error('Get Penalties Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const payPenalty = async (req, res) => {
  try {
    const { id } = req.params;

    const penalty = await prisma.penalty.update({
      where: { id: parseInt(id) },
      data: { status: 'PAID', paid_date: new Date() }
    });

    await prisma.notification.create({
      data: {
        category: 'PENALTIES',
        title: 'Penalty Paid',
        message: `Your penalty of $${penalty.amount} was marked as paid.`,
        target_user_id: penalty.user_id,
      }
    });

    res.json({ message: 'Penalty paid' });
  } catch (error) {
    console.error('Pay Penalty Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getUserActiveBorrowRecords = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const records = await prisma.borrowRecord.findMany({
      where: {
        user_id: userId,
        status: { in: ['BORROWED', 'OVERDUE'] }
      },
      include: {
        book: {
          include: {
            author: true,
            genre: true
          }
        }
      },
      orderBy: {
        due_date: 'asc'
      }
    });

    res.json(records);
  } catch (error) {
    console.error('Error fetching user active borrows:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getUserBorrowHistory = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const records = await prisma.borrowRecord.findMany({
      where: {
        user_id: userId
      },
      include: {
        book: {
          include: {
            author: true,
            genre: true
          }
        }
      },
      orderBy: {
        borrow_date: 'desc'
      }
    });

    res.json(records);
  } catch (error) {
    console.error('Error fetching user borrow history:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getAllBorrowRecords = async (req, res) => {
  try {
    const records = await prisma.borrowRecord.findMany({
      include: {
        book: true,
        user: true
      },
      orderBy: {
        borrow_date: 'desc'
      }
    });
    res.json(records);
  } catch (error) {
    console.error('Error fetching all borrow records:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getStats,
  validateBook,
  validateUser,
  checkout,
  getUserActiveBorrow,
  getUserActiveBorrowRecords,
  getUserBorrowHistory,
  getAllBorrowRecords,
  returnBook,
  getPenalties,
  payPenalty
};
