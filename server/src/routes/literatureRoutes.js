const express = require('express');
const router = express.Router();
const { getBooks, getAuthors, getGenres, createBook, updateBook } = require('../controllers/literatureController');

router.get('/books', getBooks);
router.post('/books', createBook);
router.put('/books/:id', updateBook);

router.get('/authors', getAuthors);
router.get('/genres', getGenres);

module.exports = router;
