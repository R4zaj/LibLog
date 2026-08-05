const express = require('express');
const router = express.Router();
const { getOverview, getFullLog } = require('../controllers/dashboardController');

router.get('/overview', getOverview);
router.get('/full-log', getFullLog);

module.exports = router;
