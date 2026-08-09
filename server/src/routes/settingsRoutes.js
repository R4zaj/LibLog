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
router.get('/programs', getPrograms); // public or all users

module.exports = router;
