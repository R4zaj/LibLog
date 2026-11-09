const prisma = require('../db');
const {
  sendOtpEmail,
  sendOverdueNotice,
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

      const dailyRate = parseFloat(req.query.dailyRate || '5');
      const isMulti = req.query.multi === 'true' || req.query.count > 1;

      let items = [];
      if (isMulti) {
        items = [
          {
            book: {
              title: req.query.bookTitle || 'Data Structures and Algorithms in Java (4th Edition)',
              author: { name: req.query.author || 'Robert Lafore' }
            },
            record: {
              borrow_date: new Date(Date.now() - 17 * 86400000).toISOString(),
              due_date: new Date(Date.now() - 10 * 86400000).toISOString()
            },
            daysOverdue: 10,
            penaltyAmount: 10 * dailyRate
          },
          {
            book: {
              title: 'Database System Concepts (6th Edition)',
              author: { name: 'Abraham Silberschatz' }
            },
            record: {
              borrow_date: new Date(Date.now() - 14 * 86400000).toISOString(),
              due_date: new Date(Date.now() - 7 * 86400000).toISOString()
            },
            daysOverdue: 7,
            penaltyAmount: 7 * dailyRate
          }
        ];
      } else {
        const borrowDate = new Date();
        borrowDate.setDate(borrowDate.getDate() - 17);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() - 10);
        const daysOverdue = parseInt(req.query.daysOverdue || '10', 10);
        const penaltyAmount = parseFloat(req.query.penaltyAmount || (daysOverdue * dailyRate));

        items = [
          {
            book: {
              title: req.query.bookTitle || 'Data Structures and Algorithms in Java (4th Edition)',
              author: { name: req.query.author || 'Robert Lafore' }
            },
            record: {
              borrow_date: borrowDate.toISOString(),
              due_date: dueDate.toISOString()
            },
            daysOverdue,
            penaltyAmount
          }
        ];
      }

      const html = generateOverdueEmailHtml({
        user: dummyUser,
        items,
        dailyRate
      });
      const text = generateOverdueEmailText({
        user: dummyUser,
        items,
        dailyRate
      });

      if (format === 'html') {
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }
      return res.json({
        type: 'penalty',
        user: dummyUser,
        items,
        dailyRate,
        html,
        text
      });
    }
  } catch (error) {
    console.error('Error generating email preview:', error);
    res.status(500).json({ error: 'Failed to generate email preview' });
  }
};

// Dispatch real test email to an actual inbox (Brevo / SendGrid)
const sendTestEmail = async (req, res) => {
  try {
    const { 
      to, 
      type = 'otp', 
      otp = '849201', 
      actionType = 'verify', 
      studentName = 'Student', 
      bookTitle, 
      author, 
      daysOverdue = 10, 
      penaltyAmount = 50, 
      dailyRate = 5 
    } = req.body;

    if (!to || !to.includes('@')) {
      return res.status(400).json({ error: 'A valid recipient email address (to) is required.' });
    }

    if (type === 'otp') {
      const result = await sendOtpEmail({
        to,
        otp,
        type: actionType,
        studentName
      });
      return res.json({ success: true, message: `Verification code email dispatched to ${to}`, result });
    } else {
      const dummyUser = { 
        email: to, 
        first_name: studentName.split(' ')[0] || 'Student', 
        last_name: studentName.split(' ').slice(1).join(' ') || '' 
      };
      const items = req.body.items && req.body.items.length > 0
        ? req.body.items
        : [{
            book: { 
              title: bookTitle || 'Data Structures and Algorithms in Java (4th Edition)', 
              author: { name: author || 'Robert Lafore' } 
            },
            record: { 
              borrow_date: new Date().toISOString(), 
              due_date: new Date().toISOString() 
            },
            daysOverdue,
            penaltyAmount
          }];
      const result = await sendOverdueNotice({
        user: dummyUser,
        items,
        dailyRate
      });
      return res.json({ success: true, message: `Overdue penalty notice email dispatched to ${to}`, result });
    }
  } catch (error) {
    console.error('Failed to send test email:', error);
    res.status(500).json({ error: error.message || 'Failed to dispatch email' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  previewEmail,
  sendTestEmail
};
