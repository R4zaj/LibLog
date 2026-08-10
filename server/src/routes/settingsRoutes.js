const express = require('express');
const router = express.Router();
const { 
  getStats, 
  getLibraryRules, 
  updateLibraryRules, 
  getUsers, 
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  updateUserRole
} = require('../controllers/settingsController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.get('/stats', verifyToken, isAdmin, getStats);
router.get('/library-rules', verifyToken, isAdmin, getLibraryRules);
router.put('/library-rules', verifyToken, isAdmin, updateLibraryRules);
router.get('/users', verifyToken, isAdmin, getUsers);
router.put('/users/:id/role', verifyToken, isAdmin, updateUserRole);
router.get('/announcements', getAnnouncements); // public or all users
router.post('/announcements', verifyToken, isAdmin, createAnnouncement);
router.delete('/announcements/:id', verifyToken, isAdmin, deleteAnnouncement);
router.get('/programs', getPrograms);
router.post('/programs', verifyToken, isAdmin, createProgram);
router.put('/programs/:id', verifyToken, isAdmin, updateProgram);
router.delete('/programs/:id', verifyToken, isAdmin, deleteProgram);

module.exports = router;
