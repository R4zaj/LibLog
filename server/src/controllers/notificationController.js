const prisma = require('../db');
const {
  generateOtpEmailHtml,
  generateOtpEmailText,
  generateOverdueEmailHtml,
  generateOverdueEmailText
} = require('../services/emailService');

// Get all notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let whereClause;
    
    // Admins and Librarians see operational alerts on desktop (target_user_id IS NULL)
    // or system messages explicitly targeted to them
    if (userRole === 'ADMIN' || userRole === 'LIBRARIAN') {
      whereClause = {
        OR: [
          { target_user_id: null },
          { target_user_id: userId }
        ]
      };
    } else {
      // Mobile students only see their personal notifications
      whereClause = {
        target_user_id: userId
      };
    }
    
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      take: 50, // Limit to 50 recent notifications
      include: {
        trigger_user: {
          select: { first_name: true, last_name: true, role: true, student_id: true }
        }
      }
    });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark a specific notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notificationId = parseInt(id, 10);
    
    if (isNaN(notificationId)) {
      return res.status(400).json({ error: 'Invalid notification ID' });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark all unread notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let whereClause;
    if (userRole === 'ADMIN' || userRole === 'LIBRARIAN') {
      whereClause = {
        OR: [
          { target_user_id: null },
          { target_user_id: userId }
        ],
        is_read: false
      };
    } else {
      whereClause = {
        target_user_id: userId,
        is_read: false
      };
    }
    
    const result = await prisma.notification.updateMany({
      where: whereClause,
      data: { is_read: true }
    });

    res.json({ success: true, updatedCount: result.count });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Preview rendered email templates (OTP and Penalty notices)
const previewEmail = async (req, res) => {
  try {
    const { type = 'otp', format = 'json' } = req.query;

    if (type === 'otp') {
      const otp = req.query.code || '849201';
      const actionType = req.query.actionType || 'verify';
      const studentName = req.query.studentName || 'Juan Dela Cruz';
      const html = generateOtpEmailHtml({ otp, type: actionType, studentName });
      const text = generateOtpEmailText({ otp, type: actionType, studentName });

      if (format === 'html') {
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }
      return res.json({ type: 'otp', otp, actionType, studentName, html, text });
    } else {
      // Overdue Penalty Notice
      const dummyUser = {
        first_name: req.query.firstName || 'Maria',
        last_name: req.query.lastName || 'Santos',
        student_id: req.query.studentId || 'CCC-2023-0149',
        email: req.query.email || 'msantos@calauan.edu.ph'
      };
      const dummyBook = {
        title: req.query.bookTitle || 'Data Structures and Algorithms in Java (4th Edition)',
        author: { name: req.query.author || 'Robert Lafore' }
      };
      const borrowDate = new Date();
      borrowDate.setDate(borrowDate.getDate() - 17);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 10);
      const dummyRecord = {
        borrow_date: borrowDate.toISOString(),
        due_date: dueDate.toISOString()
      };
      const daysOverdue = parseInt(req.query.daysOverdue || '10', 10);
      const dailyRate = parseFloat(req.query.dailyRate || '5');
      const penaltyAmount = parseFloat(req.query.penaltyAmount || (daysOverdue * dailyRate));

      const html = generateOverdueEmailHtml({
        user: dummyUser,
        book: dummyBook,
        record: dummyRecord,
        daysOverdue,
        penaltyAmount,
        dailyRate
      });
      const text = generateOverdueEmailText({
        user: dummyUser,
        book: dummyBook,
        record: dummyRecord,
        daysOverdue,
        penaltyAmount,
        dailyRate
      });

      if (format === 'html') {
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }
      return res.json({
        type: 'penalty',
        user: dummyUser,
        book: dummyBook,
        daysOverdue,
        dailyRate,
        penaltyAmount,
        html,
        text
      });
    }
  } catch (error) {
    console.error('Error generating email preview:', error);
    res.status(500).json({ error: 'Failed to generate email preview' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  previewEmail
};
