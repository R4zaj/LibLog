const prisma = require('../db');

// Get all notifications for the logged-in user
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    // For admin users (if we want to see system notifications without a specific target)
    // We can fetch notifications where target_user_id is userId OR target_user_id is null (broadcasts)
    
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { target_user_id: userId },
          { target_user_id: null }
        ]
      },
      orderBy: { created_at: 'desc' },
      take: 50, // Limit to 50 recent notifications
      include: {
        trigger_user: {
          select: { first_name: true, last_name: true, role: true }
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
    
    const result = await prisma.notification.updateMany({
      where: {
        OR: [
          { target_user_id: userId },
          { target_user_id: null }
        ],
        is_read: false
      },
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
