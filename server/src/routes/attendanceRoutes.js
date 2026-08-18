const express = require('express');
const router = express.Router();
const { getStats, scanQR, getActiveUsers, getMyHistory } = require('../controllers/attendanceController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/stats', verifyToken, getStats);
// Writes attendance rows, so it must not stay open - anyone could forge check-ins.
router.post('/scan', verifyToken, scanQR);
router.get('/active', verifyToken, getActiveUsers);
router.get('/my-history', verifyToken, getMyHistory);

module.exports = router;
