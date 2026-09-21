const express = require('express');
const router = express.Router();
const { 
  getBooks, 
  getArchivedBooks,
  getAuthors, 
  getGenres, 
  createBook, 
  updateBook, 
  deleteBook,
  archiveBook,
  restoreBook,
  previewArchiveByYear,
  archiveByYear,
  archiveBatch,
  restoreBatch
} = require('../controllers/literatureController');

router.get('/books', getBooks);
router.get('/archived', getArchivedBooks);
router.get('/archive-preview', previewArchiveByYear);
router.post('/archive-by-year', archiveByYear);
router.post('/archive-batch', archiveBatch);
router.post('/restore-batch', restoreBatch);

router.post('/books', createBook);
router.put('/books/:id', updateBook);
router.delete('/books/:id', deleteBook);

router.post('/books/:id/archive', archiveBook);
router.patch('/books/:id/archive', archiveBook);
router.post('/books/:id/restore', restoreBook);
router.patch('/books/:id/restore', restoreBook);

router.get('/authors', getAuthors);
router.get('/genres', getGenres);

module.exports = router;
