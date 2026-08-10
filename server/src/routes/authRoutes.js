const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, getQrToken, requestOtp } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/request-otp', requestOtp);
router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, getMe);
router.put('/me', verifyToken, updateProfile);
router.get('/qr-token', verifyToken, getQrToken);

module.exports = router;
