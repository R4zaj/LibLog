const prisma = require('../db');
const jwt = require('jsonwebtoken');
const { notifyBorrow, notifyReturn, notifyPenalty, notifyPenaltyPaid } = require('../services/notificationService');
const { resolveDailyRate, calculateOverdueDetails, buildBorrowPenaltyInfo, syncUserPenaltyBalance } = require('../utils/penaltyCalculator');

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
    const isManual = req.query.source === 'manual';
    let searchId = identifier;
    let verifiedToken = false;

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
           verifiedToken = true;
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
          verifiedToken = true;
        }
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired QR token' });
      }
    }

    // Camera QR scans must match the hashed qr_code (or verified token); plain student IDs are only allowed via manual entry.
    let user = await prisma.user.findFirst({
      where: (verifiedToken || isManual)
        ? { OR: [{ student_id: searchId }, { card_no: searchId }, { qr_code: searchId }] }
        : { qr_code: searchId }
    });

    // If manual or verified token and identifier starts with CCC-, try without prefix
    if (!user && (verifiedToken || isManual) && searchId.startsWith('CCC-')) {
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

    if (!user && !verifiedToken && !isManual) {
      const plainMatch = await prisma.user.findFirst({
        where: {
          OR: [
            { student_id: searchId },
            { card_no: searchId },
            ...(searchId.startsWith('CCC-') ? [{ student_id: searchId.replace('CCC-', '') }] : [])
          ]
        },
        select: { id: true }
      });
      if (plainMatch) {
        return res.status(401).json({ error: 'Invalid QR code. Plain student IDs cannot be scanned; please use your official app QR pass.' });
      }
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

    if ((book.library_use_only || book.is_special) && borrowType === 'TAKE_OUT') {
      return res.status(400).json({ error: 'This book is restricted to Read in Library only.' });
    }

    if (user.role === 'VISITOR' && borrowType === 'TAKE_OUT') {
      return res.status(400).json({ error: 'Visitor accounts are restricted to Read in Library only.' });
    }

    if (book.available_copies <= 2 && borrowType === 'TAKE_OUT') {
      return res.status(400).json({ error: 'This book has 2 or fewer copies available and can only be read inside the library.' });
    }

    const user = await prisma.user.findUnique({ where: { id: uId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const settings = await prisma.librarySettings.findFirst();

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
      const duplicateBorrow = await tx.borrowRecord.findFirst({
        where: {
          book_id: bId,
          user_id: uId,
          status: { in: ['BORROWED', 'OVERDUE'] }
        },
        select: { id: true }
      });
      if (duplicateBorrow) {
        const err = new Error('User already has an active borrow for this book.');
        err.statusCode = 400;
        throw err;
      }

      if (settings) {
        const activeBorrows = await tx.borrowRecord.count({
          where: {
            user_id: uId,
            status: { in: ['BORROWED', 'OVERDUE'] }
          }
        });
        if (activeBorrows >= parseInt(settings.max_books_per_user)) {
          const err = new Error(`User has reached the maximum limit of ${settings.max_books_per_user} borrowed books.`);
          err.statusCode = 400;
          throw err;
        }
      }

      const decremented = await tx.book.updateMany({
        where: { id: bId, available_copies: { gt: 0 } },
        data: { available_copies: { decrement: 1 } }
      });
      if (decremented.count === 0) {
        const err = new Error('No available copies of this book');
        err.statusCode = 400;
        throw err;
      }

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
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Checkout Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getUserActiveBorrow = async (req, res) => {
  try {
    const { bookIdentifier, userIdentifier } = req.params;
    const isManual = req.query.source === 'manual';
    let studentId = userIdentifier;
    let verifiedToken = false;

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
           verifiedToken = true;
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
          verifiedToken = true;
        }
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired QR token' });
      }
    }

    if (!verifiedToken && !isManual) {
      const plainMatch = await prisma.user.findFirst({
        where: {
          OR: [{ student_id: studentId }, { card_no: studentId }],
          NOT: { qr_code: studentId }
        },
        select: { id: true }
      });
      if (plainMatch) {
        return res.status(401).json({ error: 'Invalid QR code. Plain student IDs cannot be scanned; please use your official app QR pass.' });
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
        user: (verifiedToken || isManual)
          ? {
              OR: [
                { student_id: studentId },
                { card_no: studentId },
                { qr_code: studentId }
              ]
            }
          : { qr_code: studentId },
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
      const claimed = await tx.borrowRecord.updateMany({
        where: {
          id: borrowId,
          status: { in: ['BORROWED', 'OVERDUE'] }
        },
        data: {
          return_date: new Date(),
          status: 'RETURNED'
        }
      });

      if (claimed.count === 0) {
        const err = new Error('This borrow record has already been returned.');
        err.statusCode = 400;
        throw err;
      }

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
        const penaltyFee = resolveDailyRate({ book: bookToReturn || record.book }, settings);
        
        const returnDate = new Date();
        const diffMs = returnDate.getTime() - new Date(record.due_date).getTime();
        const daysLate = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        const penaltyAmount = daysLate * penaltyFee;
        
        if (daysLate > 0) {
          // Check all OVERDUE penalties for this borrow (including PAID) to prevent duplicates
          let penalty = await tx.penalty.findFirst({
            where: { borrow_id: record.id, type: 'OVERDUE' }
          });

          if (penalty && penalty.status === 'UNPAID') {
            penalty = await tx.penalty.update({
              where: { id: penalty.id },
              data: {
                days_overdue: daysLate,
                amount: penaltyAmount
              }
            });
          } else if (!penalty) {
            penalty = await tx.penalty.create({
              data: {
                user_id: record.user_id,
                borrow_id: record.id,
                type: 'OVERDUE',
                amount: penaltyAmount,
                days_overdue: daysLate,
                status: 'UNPAID'
              }
            });
          }

          if (penalty && penalty.status === 'UNPAID') {
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
    const { formatReceiptNumber } = require('../services/emailService');
    const settings = await prisma.librarySettings.findFirst();

    const statusFilter = req.query.status || 'UNPAID';
    const whereClause = {};
    if (statusFilter !== 'ALL') {
      whereClause.status = statusFilter;
    }

    const penalties = await prisma.penalty.findMany({
      where: whereClause,
      include: {
        user: true,
        collector: true,
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
      const isPaid = p.status === 'PAID';
      const amount = isPaid ? parseFloat(p.amount || 0) : details.penaltyAmount;
      const daysOverdue = isPaid ? (p.days_overdue ?? details.daysOverdue) : details.daysOverdue;

      // Asynchronously ensure database row stays synchronized if days or amount differed for unpaid overdue penalties
      if (!isPaid && p.type === 'OVERDUE' && (p.days_overdue !== details.daysOverdue || parseFloat(p.amount) !== details.penaltyAmount)) {
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
        receipt_number: formatReceiptNumber(p.id, p.paid_at || p.created_at),
        days_overdue: daysOverdue,
        amount,
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

    // Extract staff/librarian user ID from JWT authorization token if available
    let collectorId = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token && token !== 'null' && token !== 'undefined') {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          if (decoded && decoded.id) {
            collectorId = decoded.id;
          }
        } catch (e) {
          // Token verification error, proceed without collectorId
        }
      }
    }

    const paidDate = new Date();

    await prisma.$transaction(async (tx) => {
      let finalAmount = parseFloat(penalty.amount);
      const settings = await tx.librarySettings.findFirst();

      if (condition === 'RETURNED') {
        // If the book was not previously returned via scanner, close the borrow record now
        if (penalty.borrow && penalty.borrow.status !== 'RETURNED') {
          await tx.borrowRecord.update({
            where: { id: penalty.borrow_id },
            data: { 
              status: 'RETURNED',
              return_date: paidDate
            }
          });
          const bookToReturn = await tx.book.findUnique({ where: { id: penalty.borrow.book_id } });
          if (bookToReturn && bookToReturn.available_copies < bookToReturn.total_copies) {
            await tx.book.update({
              where: { id: penalty.borrow.book_id },
              data: { available_copies: { increment: 1 } }
            });
          }
        }
      } else if (condition === 'DAMAGED') {
        finalAmount += parseFloat(settings?.damage_fee || 5.00);
        await tx.borrowRecord.update({
          where: { id: penalty.borrow_id },
          data: { 
            status: 'RETURNED',
            return_date: penalty.borrow?.return_date || paidDate
          }
        });
        await tx.book.update({
          where: { id: penalty.borrow.book_id },
          data: { condition: 'POOR' }
        });
      } else if (condition === 'LOST') {
        finalAmount += parseFloat(settings?.lost_book_fee || 5.00);
        await tx.borrowRecord.update({
          where: { id: penalty.borrow_id },
          data: { 
            status: 'LOST',
            return_date: penalty.borrow?.return_date || paidDate
          }
        });
        await tx.book.update({
          where: { id: penalty.borrow.book_id },
          data: { total_copies: { decrement: 1 } }
        });
      }

      const claimedPenalty = await tx.penalty.updateMany({
        where: { id: parseInt(id), status: 'UNPAID' },
        data: { 
          status: 'PAID', 
          paid_at: paidDate,
          collected_by: collectorId,
          type: condition === 'LOST' ? 'LOST' : (condition === 'DAMAGED' ? 'DAMAGE' : penalty.type),
          amount: finalAmount
        }
      });

      if (claimedPenalty.count === 0) {
        const err = new Error('Penalty is already paid.');
        err.statusCode = 400;
        throw err;
      }

      await syncUserPenaltyBalance(tx, penalty.user_id, settings);

      await notifyPenaltyPaid({
        user: penalty.user,
        amount: finalAmount,
        penaltyId: penalty.id,
        tx
      });
    });

    // Fetch full penalty record with user and book details for receipt generation
    const fullPaidPenalty = await prisma.penalty.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: true,
        collector: true,
        borrow: {
          include: {
            book: {
              include: { author: true }
            }
          }
        }
      }
    });

    const { sendPenaltyReceiptEmail, formatReceiptNumber } = require('../services/emailService');
    const receiptNumber = formatReceiptNumber(fullPaidPenalty.id, fullPaidPenalty.paid_at || paidDate);
    let emailSent = false;
    let emailError = null;

    if (fullPaidPenalty.user?.email) {
      try {
        await sendPenaltyReceiptEmail({
          user: fullPaidPenalty.user,
          penalty: fullPaidPenalty,
          book: fullPaidPenalty.borrow?.book,
          record: fullPaidPenalty.borrow,
          collector: fullPaidPenalty.collector,
          receiptNumber
        });
        emailSent = true;
      } catch (err) {
        console.error('Failed to send penalty receipt email:', err.message);
        emailError = err.message;
      }
    }

    res.json({
      message: 'Penalty paid',
      receiptNumber,
      emailSent,
      emailError,
      penalty: {
        id: fullPaidPenalty.id,
        receipt_number: receiptNumber,
        amount: parseFloat(fullPaidPenalty.amount),
        paid_at: fullPaidPenalty.paid_at,
        status: fullPaidPenalty.status,
        type: fullPaidPenalty.type,
        collector: fullPaidPenalty.collector
      }
    });
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
        book: true,
        penalties: {
          where: { type: 'OVERDUE' }
        }
      }
    });

    for (const record of activeBorrows) {
      const existingPenalty = record.penalties[0] || null;
      const details = calculateOverdueDetails(record, settings, existingPenalty);
      if (details.daysOverdue > 0) {
        if (record.status !== 'OVERDUE') {
          await prisma.borrowRecord.update({
            where: { id: record.id },
            data: { status: 'OVERDUE' }
          });
        }
        if (!existingPenalty) {
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
          existingPenalty.status === 'UNPAID' && (
            existingPenalty.days_overdue !== details.daysOverdue ||
            parseFloat(existingPenalty.amount) !== details.penaltyAmount
          )
        ) {
          await prisma.penalty.update({
            where: { id: existingPenalty.id },
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

      const { formatReceiptNumber } = require('../services/emailService');

      return {
        id: p.id,
        receipt_number: formatReceiptNumber(p.id, p.paid_at || p.created_at),
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

const resendPenaltyReceiptEmail = async (req, res) => {
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
        collector: true,
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

    if (penalty.status !== 'PAID') {
      return res.status(400).json({ error: 'Receipt is only available for paid penalties.' });
    }

    if (!penalty.user?.email) {
      return res.status(400).json({ error: 'The student does not have a registered email address.' });
    }

    const { sendPenaltyReceiptEmail, formatReceiptNumber } = require('../services/emailService');
    const receiptNumber = formatReceiptNumber(penalty.id, penalty.paid_at || penalty.updated_at);

    const emailResult = await sendPenaltyReceiptEmail({
      user: penalty.user,
      penalty,
      book: penalty.borrow?.book,
      record: penalty.borrow,
      collector: penalty.collector,
      receiptNumber
    });

    res.json({
      success: true,
      message: `Official receipt ${receiptNumber} successfully emailed to ${penalty.user.email}!`,
      receiptNumber,
      sentTo: penalty.user.email,
      emailResult
    });
  } catch (error) {
    console.error('Resend Penalty Receipt Email Error:', error);
    res.status(500).json({ error: error.message || 'Failed to resend receipt email.' });
  }
};

const sendUserOverdueNoticeEmail = async (req, res) => {
  try {
    const { userId } = req.params;
    const uid = parseInt(userId, 10);
    if (isNaN(uid)) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: uid }
    });

    if (!user) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    if (!user.email) {
      return res.status(400).json({ error: 'The student does not have a registered email address.' });
    }

    const penalties = await prisma.penalty.findMany({
      where: {
        user_id: uid,
        paid_at: null
      },
      include: {
        borrow: {
          include: {
            book: {
              include: { author: true }
            }
          }
        }
      }
    });

    if (!penalties || penalties.length === 0) {
      return res.status(400).json({ error: 'No unpaid overdue penalties found for this student.' });
    }

    const { sendOverdueNotice } = require('../services/emailService');
    const { calculateOverdueDetails } = require('../utils/penaltyCalculator');
    const settings = await prisma.librarySettings.findFirst();

    const items = penalties.map(p => {
      const details = calculateOverdueDetails(p.borrow, settings, p);
      return {
        book: p.borrow?.book,
        record: p.borrow,
        daysOverdue: details.daysOverdue,
        penaltyAmount: details.penaltyAmount,
        borrowDate: p.borrow?.borrow_date,
        dueDate: p.borrow?.due_date
      };
    });

    const emailResult = await sendOverdueNotice({
      user,
      items,
      dailyRate: settings?.daily_penalty_rate || 5
    });

    // Log the notification event
    await prisma.notification.create({
      data: {
        category: 'PENALTIES',
        title: 'Overdue Notice Dispatched',
        message: `Consolidated overdue email notice (${items.length} book${items.length > 1 ? 's' : ''}) sent to ${user.email}.`,
        target_user_id: user.id,
        ref_table: 'users',
        ref_id: user.id
      }
    });

    res.json({
      success: true,
      message: `Consolidated overdue notice (${items.length} book${items.length > 1 ? 's' : ''}) successfully sent to ${user.email}!`,
      sentTo: user.email,
      bookCount: items.length,
      emailResult
    });
  } catch (error) {
    console.error('Send User Overdue Notice Email Error:', error);
    res.status(500).json({ error: error.message || 'Failed to dispatch consolidated overdue notice email.' });
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
  resendPenaltyReceiptEmail,
  checkOverdue,
  sendPenaltyNoticeEmail,
  sendUserOverdueNoticeEmail
};
