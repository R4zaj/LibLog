const prisma = require('../db');

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

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
