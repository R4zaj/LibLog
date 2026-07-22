const express = require('express');
const router = express.Router();
const { getStats, scanQR, getActiveUsers, getMyHistory } = require('../controllers/attendanceController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/stats', getStats);
router.post('/scan', scanQR);
router.get('/active', getActiveUsers);
router.get('/my-history', verifyToken, getMyHistory);

module.exports = router;
