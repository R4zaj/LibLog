const express = require('express');
const router = express.Router();
const { getStudentsSummary, getStudentDossier } = require('../controllers/studentActivityController');

router.get('/students', getStudentsSummary);
router.get('/students/:id', getStudentDossier);

module.exports = router;
