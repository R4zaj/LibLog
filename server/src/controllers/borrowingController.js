const prisma = require('../db');
const jwt = require('jsonwebtoken');
const { notifyBorrow, notifyReturn, notifyPenalty, notifyPenaltyPaid } = require('../services/notificationService');
const { calculateOverdueDetails, buildBorrowPenaltyInfo, syncUserPenaltyBalance } = require('../utils/penaltyCalculator');

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

    if (identifier.startsWith('OFFLINE:')) {
      const parts = identifier.split(':');
      if (parts.length === 4) {
        const [, stId, ts, hmac] = parts;
        const timestamp = parseInt(ts, 10);
        if (Date.now() - timestamp > 60000 || Date.now() - timestamp < -5000) {
           return res.status(401).json({ error: 'Expired offline QR token' });
        }
        const crypto = require('crypto');
        const offlineSecret = crypto.createHmac('sha256', process.env.JWT_SECRET).update(stId).digest('hex');
        const expectedHmac = crypto.createHmac('sha256', offlineSecret).update(ts).digest('hex');
        if (hmac === expectedHmac) {
           searchId = stId;
        } else {
           return res.status(401).json({ error: 'Invalid offline QR signature' });
        }
      } else {
        return res.status(401).json({ error: 'Malformed offline QR token' });
      }
    } else if (identifier.split('.').length === 3) {
      try {
        const decoded = jwt.verify(identifier, process.env.JWT_SECRET);
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
    const livePenaltyBalance = await syncUserPenaltyBalance(prisma, user.id, settings);
    user.penalty_balance = livePenaltyBalance.toFixed(2);
    if (settings && livePenaltyBalance >= parseFloat(settings.suspension_threshold)) {
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

    if (book.library_use_only && borrowType === 'TAKE_OUT') {
      return res.status(400).json({ error: 'This book is In Circulation and can only be read inside the library.' });
    }

    if (book.available_copies <= 2 && borrowType === 'TAKE_OUT') {
      return res.status(400).json({ error: 'This book has 2 or fewer copies available and can only be read inside the library.' });
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

      await notifyBorrow({ user, book, dueDate, borrowRecordId: record.id, tx });

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
    let studentId = userIdentifier;

    if (userIdentifier.startsWith('OFFLINE:')) {
      const parts = userIdentifier.split(':');
      if (parts.length === 4) {
        const [, stId, ts, hmac] = parts;
        const timestamp = parseInt(ts, 10);
        if (Date.now() - timestamp > 60000 || Date.now() - timestamp < -5000) {
           return res.status(401).json({ error: 'Expired offline QR token' });
        }
        const crypto = require('crypto');
        const offlineSecret = crypto.createHmac('sha256', process.env.JWT_SECRET).update(stId).digest('hex');
        const expectedHmac = crypto.createHmac('sha256', offlineSecret).update(ts).digest('hex');
        if (hmac === expectedHmac) {
           studentId = stId;
        } else {
           return res.status(401).json({ error: 'Invalid offline QR signature' });
        }
      } else {
        return res.status(401).json({ error: 'Malformed offline QR token' });
      }
    } else if (userIdentifier.split('.').length === 3) {
      try {
        const decoded = jwt.verify(userIdentifier, process.env.JWT_SECRET);
        if (decoded && decoded.student_id) {
          studentId = decoded.student_id;
        }
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired QR token' });
      }
    }

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
            { student_id: studentId },
            { card_no: studentId }
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

    const record = await prisma.borrowRecord.findUnique({
      where: { id: borrowId },
      include: { user: true, book: true }
    });
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
        const settings = await tx.librarySettings.findFirst();
        const penaltyFee = settings && settings.penalty_fee_per_day 
          ? parseFloat(settings.penalty_fee_per_day) 
          : 5.0;
        
        const returnDate = new Date();
        const diffMs = returnDate.getTime() - new Date(record.due_date).getTime();
        const daysLate = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        const penaltyAmount = daysLate * penaltyFee;
        
        if (daysLate > 0) {
          // Check if an UNPAID penalty record already exists for this borrow to prevent duplicates
          let penalty = await tx.penalty.findFirst({
            where: { borrow_id: record.id, status: 'UNPAID' }
          });

          if (penalty) {
            penalty = await tx.penalty.update({
              where: { id: penalty.id },
              data: {
                days_overdue: daysLate,
                amount: penaltyAmount
              }
            });
          } else {
            penalty = await tx.penalty.create({
              data: {
                user_id: record.user_id,
                borrow_id: record.id,
                amount: penaltyAmount,
                days_overdue: daysLate,
                status: 'UNPAID'
              }
            });
          }

          await notifyPenalty({
            user: record.user,
            book: record.book,
            amount: penaltyAmount,
            reason: 'OVERDUE',
            penaltyId: penalty.id,
            tx
          });
        }
      }

      await syncUserPenaltyBalance(tx, record.user_id);

      await notifyReturn({
        user: record.user,
        book: record.book,
        borrowRecordId: record.id,
        tx
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
    const { calculateOverdueDetails } = require('../utils/penaltyCalculator');
    const settings = await prisma.librarySettings.findFirst();

    const penalties = await prisma.penalty.findMany({
      where: { status: 'UNPAID' },
      include: {
        user: true,
        borrow: {
          include: {
            book: {
              include: { author: true }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Map each penalty with exact overdue days and strictly consistent amount
    const mappedPenalties = penalties.map(p => {
      const details = calculateOverdueDetails(p.borrow, settings, p);

      // Asynchronously ensure database row stays synchronized if days or amount differed
      if (p.type === 'OVERDUE' && (p.days_overdue !== details.daysOverdue || parseFloat(p.amount) !== details.penaltyAmount)) {
        prisma.penalty.update({
          where: { id: p.id },
          data: {
            days_overdue: details.daysOverdue,
            amount: details.penaltyAmount
          }
        }).catch(err => console.error('Failed to sync penalty in DB:', err.message));
      }

      return {
        ...p,
        days_overdue: details.daysOverdue,
        amount: details.penaltyAmount,
        is_returned: details.isReturned,
        return_date: details.returnDate,
        daily_rate: details.dailyRate
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
    const { condition = 'RETURNED' } = req.body;

    const penalty = await prisma.penalty.findUnique({ 
      where: { id: parseInt(id) },
      include: { borrow: { include: { book: true } }, user: true }
    });
    
    if (!penalty) {
      return res.status(404).json({ error: 'Penalty not found' });
    }

    if (condition === 'RETURNED' && penalty.borrow && penalty.borrow.status !== 'RETURNED') {
      return res.status(400).json({ error: 'Cannot process payment: The book must be returned first.' });
    }

    await prisma.$transaction(async (tx) => {
      let finalAmount = parseFloat(penalty.amount);
      const settings = await tx.librarySettings.findFirst();

      if (condition === 'DAMAGED') {
        finalAmount += parseFloat(settings?.damage_fee || 5.00);
        await tx.borrowRecord.update({
          where: { id: penalty.borrow_id },
          data: { status: 'RETURNED' }
        });
        await tx.book.update({
          where: { id: penalty.borrow.book_id },
          data: { condition: 'POOR' }
        });
      } else if (condition === 'LOST') {
        finalAmount += parseFloat(settings?.lost_book_fee || 5.00);
        await tx.borrowRecord.update({
          where: { id: penalty.borrow_id },
          data: { status: 'LOST' }
        });
        await tx.book.update({
          where: { id: penalty.borrow.book_id },
          data: { total_copies: { decrement: 1 } }
        });
      }

      await tx.penalty.update({
        where: { id: parseInt(id) },
        data: { 
          status: 'PAID', 
          paid_at: new Date(),
          type: condition === 'LOST' ? 'LOST' : (condition === 'DAMAGED' ? 'DAMAGE' : penalty.type),
          amount: finalAmount
        }
      });

      await syncUserPenaltyBalance(tx, penalty.user_id, settings);

      await notifyPenaltyPaid({
        user: penalty.user,
        amount: finalAmount,
        penaltyId: penalty.id,
        tx
      });
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

    const [settings, records] = await Promise.all([
      prisma.librarySettings.findFirst(),
      prisma.borrowRecord.findMany({
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
          },
          penalties: {
            orderBy: { created_at: 'desc' }
          }
        },
        orderBy: {
          due_date: 'asc'
        }
      })
    ]);

    const enriched = records.map(record => ({
      ...record,
      penalty_info: buildBorrowPenaltyInfo(record, settings)
    }));

    res.json(enriched);
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

    const limit = parseInt(req.query.limit) || 50;

    const [settings, records] = await Promise.all([
      prisma.librarySettings.findFirst(),
      prisma.borrowRecord.findMany({
        where: {
          user_id: userId
        },
        take: limit,
        include: {
          book: {
            include: {
              author: true,
              genre: true
            }
          },
          penalties: {
            orderBy: { created_at: 'desc' }
          }
        },
        orderBy: {
          borrow_date: 'desc'
        }
      })
    ]);

    const enriched = records.map(record => ({
      ...record,
      penalty_info: buildBorrowPenaltyInfo(record, settings)
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching user borrow history:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getUserPenalties = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const settings = await prisma.librarySettings.findFirst();
    const dailyRate = settings && settings.penalty_fee_per_day
      ? parseFloat(settings.penalty_fee_per_day)
      : 5.0;

    const activeBorrows = await prisma.borrowRecord.findMany({
      where: {
        user_id: userId,
        status: { in: ['BORROWED', 'OVERDUE'] },
        return_date: null
      },
      include: {
        penalties: {
          where: { status: 'UNPAID', type: 'OVERDUE' }
        }
      }
    });

    for (const record of activeBorrows) {
      const details = calculateOverdueDetails(record, settings, record.penalties[0] || null);
      if (details.daysOverdue > 0) {
        if (record.status !== 'OVERDUE') {
          await prisma.borrowRecord.update({
            where: { id: record.id },
            data: { status: 'OVERDUE' }
          });
        }
        if (!record.penalties || record.penalties.length === 0) {
          await prisma.penalty.create({
            data: {
              borrow_id: record.id,
              user_id: userId,
              type: 'OVERDUE',
              amount: details.penaltyAmount,
              days_overdue: details.daysOverdue,
              status: 'UNPAID'
            }
          });
        } else if (
          record.penalties[0].days_overdue !== details.daysOverdue ||
          parseFloat(record.penalties[0].amount) !== details.penaltyAmount
        ) {
          await prisma.penalty.update({
            where: { id: record.penalties[0].id },
            data: {
              days_overdue: details.daysOverdue,
              amount: details.penaltyAmount
            }
          });
        }
      }
    }

    const penalties = await prisma.penalty.findMany({
      where: { user_id: userId },
      include: {
        borrow: {
          include: {
            book: {
              include: { author: true }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    let totalUnpaid = 0;
    let todayAccrual = 0;
    let weekAccrual = 0;
    let unpaidCount = 0;

    const mappedPenalties = penalties.map(p => {
      const details = calculateOverdueDetails(p.borrow, settings, p);
      const isUnpaid = p.status === 'UNPAID';
      const amount = isUnpaid ? details.penaltyAmount : parseFloat(p.amount || 0);
      const daysOverdue = isUnpaid ? details.daysOverdue : (p.days_overdue || details.daysOverdue);

      if (isUnpaid && p.type === 'OVERDUE' && (p.days_overdue !== details.daysOverdue || parseFloat(p.amount) !== details.penaltyAmount)) {
        prisma.penalty.update({
          where: { id: p.id },
          data: {
            days_overdue: details.daysOverdue,
            amount: details.penaltyAmount
          }
        }).catch(err => console.error('Failed to sync user penalty in DB:', err.message));
      }

      if (isUnpaid) {
        unpaidCount++;
        totalUnpaid += amount;

        if (!details.isReturned && daysOverdue > 0 && p.type === 'OVERDUE') {
          todayAccrual += details.dailyRate;
          weekAccrual += Math.min(daysOverdue, 7) * details.dailyRate;
        } else {
          const refDate = new Date(details.returnDate || p.created_at);
          if (refDate >= todayStart) {
            todayAccrual += amount;
          }
          if (refDate >= weekStart) {
            weekAccrual += amount;
          }
        }
      }

      return {
        id: p.id,
        borrow_id: p.borrow_id,
        book_title: p.borrow?.book?.title || 'Library Book',
        book_author: p.borrow?.book?.author?.name || 'Unknown Author',
        type: p.type,
        status: p.status,
        days_overdue: daysOverdue,
        daily_rate: details.dailyRate,
        amount,
        is_returned: details.isReturned,
        due_date: p.borrow?.due_date || null,
        return_date: details.returnDate || null,
        paid_at: p.paid_at || null,
        created_at: p.created_at
      };
    });

    await prisma.user.update({
      where: { id: userId },
      data: { penalty_balance: totalUnpaid }
    }).catch(() => {});

    res.json({
      totalUnpaid,
      todayAccrual,
      weekAccrual,
      unpaidCount,
      rules: {
        penalty_fee_per_day: dailyRate,
        damage_fee: settings?.damage_fee ? parseFloat(settings.damage_fee) : 5.0,
        lost_book_fee: settings?.lost_book_fee ? parseFloat(settings.lost_book_fee) : 5.0,
        suspension_threshold: settings?.suspension_threshold ? parseFloat(settings.suspension_threshold) : 100.0
      },
      penalties: mappedPenalties
    });
  } catch (error) {
    console.error('Get User Penalties Error:', error);
    res.status(500).json({ error: 'Server error fetching user penalties' });
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

const checkOverdue = async (req, res) => {
  try {
    const { checkAndProcessOverdueBooks } = require('../services/overdueService');
    const results = await checkAndProcessOverdueBooks();
    res.json({ message: 'Overdue check completed', results });
  } catch (error) {
    console.error('Check Overdue Error:', error);
    res.status(500).json({ error: 'Server error checking overdue books' });
  }
};

const sendPenaltyNoticeEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const penaltyId = parseInt(id, 10);
    if (isNaN(penaltyId)) {
      return res.status(400).json({ error: 'Invalid penalty ID.' });
    }

    const penalty = await prisma.penalty.findUnique({
      where: { id: penaltyId },
      include: {
        user: true,
        borrow: {
          include: {
            book: {
              include: { author: true }
            }
          }
        }
      }
    });

    if (!penalty) {
      return res.status(404).json({ error: 'Penalty record not found.' });
    }

    if (!penalty.user?.email) {
      return res.status(400).json({ error: 'The student does not have a registered email address.' });
    }

    const { sendOverdueNotice } = require('../services/emailService');
    const { calculateOverdueDetails } = require('../utils/penaltyCalculator');
    const settings = await prisma.librarySettings.findFirst();
    const details = calculateOverdueDetails(penalty.borrow, settings, penalty);

    const emailResult = await sendOverdueNotice({
      user: penalty.user,
      book: penalty.borrow?.book,
      record: penalty.borrow,
      daysOverdue: details.daysOverdue,
      penaltyAmount: details.penaltyAmount,
      dailyRate: details.dailyRate
    });

    // Log the notification event
    await prisma.notification.create({
      data: {
        category: 'PENALTIES',
        title: 'Overdue Notice Dispatched',
        message: `Overdue email notice sent to ${penalty.user.email} for "${penalty.borrow?.book?.title || 'Borrowed Book'}".`,
        target_user_id: penalty.user_id,
        ref_table: 'penalties',
        ref_id: penalty.id
      }
    });

    res.json({
      success: true,
      message: `Overdue notice email successfully sent to ${penalty.user.email}!`,
      sentTo: penalty.user.email,
      emailResult
    });
  } catch (error) {
    console.error('Send Penalty Notice Email Error:', error);
    res.status(500).json({ error: error.message || 'Failed to dispatch overdue notice email' });
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
  getUserPenalties,
  getAllBorrowRecords,
  returnBook,
  getPenalties,
  payPenalty,
  checkOverdue,
  sendPenaltyNoticeEmail
};
