const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  getNotifications,
  markAsRead,
  markAllAsRead
} = require('../controllers/notificationController');

// Apply auth middleware to all notification routes
router.use(verifyToken);

router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

module.exports = router;
