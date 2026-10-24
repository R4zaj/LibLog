const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  previewEmail
} = require('../controllers/notificationController');

// Email template visual preview (accessible for admin desktop preview / iframes)
router.get('/preview-email', previewEmail);

// Apply auth middleware to all remaining notification routes
router.use(verifyToken);

router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

module.exports = router;
