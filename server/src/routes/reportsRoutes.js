const express = require('express');
const router = express.Router();
const { getSummary, getFullReport } = require('../controllers/reportsController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/summary', getSummary);
router.get('/full', getFullReport);

module.exports = router;
