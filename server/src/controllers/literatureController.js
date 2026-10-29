const prisma = require('../db');

const toBool = (v) => v === true || ['true', 'yes', 'y', '1', 'in circulation', 'library use only'].includes(String(v || '').trim().toLowerCase());

const mapBook = (b) => ({
  id: b.id,
  isbn: b.isbn,
  title: b.title,
  author: b.author?.name || 'Unknown',
  genre: b.genre?.name || 'Unknown',
  lccn: b.lccn || 'N/A',
  year: b.year_published || 'N/A',
  shelf: b.shelf_number || 'N/A',
  total: b.total_copies,
  available: b.available_copies,
  stocks: `${b.total_copies} copies`,
  condition: b.condition,
  is_archived: b.is_archived || false,
  library_use_only: Boolean(b.library_use_only),
  updated_at: b.updated_at
});

const getBooks = async (req, res) => {
  try {
    const { archived } = req.query;
    const isArchived = archived === 'true';

    const books = await prisma.book.findMany({
      where: {
        is_archived: isArchived
      },
      include: {
        author: true,
        genre: true
      },
      orderBy: {
        title: 'asc'
      }
    });

    res.json(books.map(mapBook));
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Server error fetching books', details: error.message });
  }
};

const getArchivedBooks = async (req, res) => {
  try {
    const books = await prisma.book.findMany({
      where: {
        is_archived: true
      },
      include: {
        author: true,
        genre: true
      },
      orderBy: {
        updated_at: 'desc'
      }
    });

    res.json(books.map(mapBook));
  } catch (error) {
    console.error('Error fetching archived books:', error);
    res.status(500).json({ error: 'Server error fetching archived books' });
  }
};

const getAuthors = async (req, res) => {
  try {
    const authors = await prisma.author.findMany({
      where: {
        books: {
          some: {
            is_archived: false
          }
        }
      },
      include: {
        books: {
          where: {
            is_archived: false
          },
          select: { total_copies: true }
        }
      }
    });

    const mappedAuthors = authors.map(a => {
      const booksCount = a.books.length;
      const copiesCount = a.books.reduce((acc, b) => acc + b.total_copies, 0);
      return {
        id: a.id,
        name: a.name,
        books: booksCount,
        copies: copiesCount,
        expanded: false
      };
    });

    res.json(mappedAuthors);
  } catch (error) {
    console.error('Error fetching authors:', error);
    res.status(500).json({ error: 'Server error fetching authors' });
  }
};

const getGenres = async (req, res) => {
  try {
    const genres = await prisma.genre.findMany({
      where: {
        books: {
          some: {
            is_archived: false
          }
        }
      },
      include: {
        books: {
          where: {
            is_archived: false
          },
          select: { total_copies: true }
        }
      }
    });

    const colors = [
      { bg: 'bg-cyan-400', text: 'text-cyan-600', light: 'bg-cyan-50' },
      { bg: 'bg-purple-400', text: 'text-purple-600', light: 'bg-purple-50' },
      { bg: 'bg-orange-400', text: 'text-orange-600', light: 'bg-orange-50' },
      { bg: 'bg-green-400', text: 'text-green-600', light: 'bg-green-50' },
      { bg: 'bg-red-400', text: 'text-red-600', light: 'bg-red-50' }
    ];

    const mappedGenres = genres.map((g, idx) => {
      const booksCount = g.books.length;
      const copiesCount = g.books.reduce((acc, b) => acc + b.total_copies, 0);
      const colorSet = colors[idx % colors.length];
      return {
        id: g.id,
        name: g.name,
        color: colorSet.bg,
        colorText: colorSet.text,
        colorBg: colorSet.light,
        books: booksCount,
        copies: copiesCount,
        expanded: false
      };
    });

    res.json(mappedGenres);
  } catch (error) {
    console.error('Error fetching genres:', error);
    res.status(500).json({ error: 'Server error fetching genres' });
  }
};

const createBook = async (req, res) => {
  try {
    const { isbn, title, authorName, genreName, lccn, year_published, shelf_number, total_copies, condition, library_use_only } = req.body;
    
    // Connect or create author
    let author_id = null;
    if (authorName && authorName.trim() !== '') {
      let author = await prisma.author.findUnique({ where: { name: authorName.trim() } });
      if (!author) {
        author = await prisma.author.create({ data: { name: authorName.trim() } });
      }
      author_id = author.id;
    }

    // Connect or create genre
    let genre_id = null;
    if (genreName && genreName.trim() !== '') {
      let genre = await prisma.genre.findUnique({ where: { name: genreName.trim() } });
      if (!genre) {
        genre = await prisma.genre.create({ data: { name: genreName.trim() } });
      }
      genre_id = genre.id;
    }

    const book = await prisma.book.create({
      data: {
        isbn,
        title,
        author_id,
        genre_id,
        lccn: lccn || null,
        year_published: year_published ? parseInt(year_published) : null,
        shelf_number: shelf_number || null,
        total_copies: parseInt(total_copies),
        available_copies: parseInt(total_copies),
        library_use_only: toBool(library_use_only),
        condition: condition || 'GOOD'
      }
    });

    res.json(book);
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ error: 'Server error creating book' });
  }
};

const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const { isbn, title, authorName, genreName, lccn, year_published, shelf_number, total_copies, condition, library_use_only } = req.body;
    
    // Connect or create author
    let author_id = null;
    if (authorName && authorName.trim() !== '') {
      let author = await prisma.author.findUnique({ where: { name: authorName.trim() } });
      if (!author) {
        author = await prisma.author.create({ data: { name: authorName.trim() } });
      }
      author_id = author.id;
    }

    // Connect or create genre
    let genre_id = null;
    if (genreName && genreName.trim() !== '') {
      let genre = await prisma.genre.findUnique({ where: { name: genreName.trim() } });
      if (!genre) {
        genre = await prisma.genre.create({ data: { name: genreName.trim() } });
      }
      genre_id = genre.id;
    }

    const existingBook = await prisma.book.findUnique({ where: { id: parseInt(id) } });
    if (!existingBook) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Adjust available copies if total copies changed
    const diff = parseInt(total_copies) - existingBook.total_copies;
    const newAvailable = Math.max(0, existingBook.available_copies + diff);

    const book = await prisma.book.update({
      where: { id: parseInt(id) },
      data: {
        isbn,
        title,
        author_id,
        genre_id,
        lccn: lccn || null,
        year_published: year_published ? parseInt(year_published) : null,
        shelf_number: shelf_number || null,
        total_copies: parseInt(total_copies),
        available_copies: newAvailable,
        library_use_only: library_use_only !== undefined ? toBool(library_use_only) : existingBook.library_use_only,
        condition: condition || 'GOOD'
      }
    });

    res.json(book);
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ error: 'Server error updating book' });
  }
};

const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingBook = await prisma.book.findUnique({ where: { id: parseInt(id) } });
    if (!existingBook) {
      return res.status(404).json({ error: 'Book not found' });
    }

    await prisma.book.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete this book because it has existing borrowing records.' });
    }
    res.status(500).json({ error: 'Server error deleting book' });
  }
};

// Archive single book
const archiveBook = async (req, res) => {
  try {
    const { id } = req.params;
    const bookId = parseInt(id, 10);

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        borrow_records: {
          where: { status: { in: ['BORROWED', 'OVERDUE'] } }
        }
      }
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (book.is_archived) {
      return res.status(400).json({ error: 'Book is already archived' });
    }

    if (book.borrow_records && book.borrow_records.length > 0) {
      return res.status(400).json({
        error: `Cannot archive "${book.title}" because it currently has ${book.borrow_records.length} active or overdue borrow(s). All copies must be returned first.`
      });
    }

    const updated = await prisma.book.update({
      where: { id: bookId },
      data: {
        is_archived: true,
        updated_at: new Date()
      },
      include: {
        author: true,
        genre: true
      }
    });

    res.json({ message: `"${updated.title}" was successfully archived.`, book: mapBook(updated) });
  } catch (error) {
    console.error('Error archiving book:', error);
    res.status(500).json({ error: 'Server error archiving book' });
  }
};

// Restore single book
const restoreBook = async (req, res) => {
  try {
    const { id } = req.params;
    const bookId = parseInt(id, 10);

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (!book.is_archived) {
      return res.status(400).json({ error: 'Book is not archived' });
    }

    const updated = await prisma.book.update({
      where: { id: bookId },
      data: {
        is_archived: false,
        updated_at: new Date()
      },
      include: {
        author: true,
        genre: true
      }
    });

    res.json({ message: `"${updated.title}" was successfully restored to active catalog.`, book: mapBook(updated) });
  } catch (error) {
    console.error('Error restoring book:', error);
    res.status(500).json({ error: 'Server error restoring book' });
  }
};

// Preview books to be archived by year
const previewArchiveByYear = async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    if (isNaN(year) || year < 1000 || year > 3000) {
      return res.status(400).json({ error: 'Please provide a valid publication year' });
    }

    const matchingBooks = await prisma.book.findMany({
      where: {
        is_archived: false,
        year_published: {
          lte: year,
          not: null
        }
      },
      include: {
        author: true,
        genre: true,
        borrow_records: {
          where: { status: { in: ['BORROWED', 'OVERDUE'] } }
        }
      },
      orderBy: {
        year_published: 'asc'
      }
    });

    const eligible = [];
    const withActiveBorrows = [];

    matchingBooks.forEach(b => {
      const item = {
        id: b.id,
        title: b.title,
        author: b.author?.name || 'Unknown',
        year: b.year_published,
        isbn: b.isbn,
        genre: b.genre?.name || 'Unknown',
        activeBorrowsCount: b.borrow_records.length
      };
      if (b.borrow_records.length > 0) {
        withActiveBorrows.push(item);
      } else {
        eligible.push(item);
      }
    });

    res.json({
      cutoffYear: year,
      totalMatching: matchingBooks.length,
      eligibleCount: eligible.length,
      borrowedCount: withActiveBorrows.length,
      eligible,
      withActiveBorrows
    });
  } catch (error) {
    console.error('Error previewing archive by year:', error);
    res.status(500).json({ error: 'Server error previewing archive by year' });
  }
};

// Archive books by publication year
const archiveByYear = async (req, res) => {
  try {
    const year = parseInt(req.body.year, 10);
    if (isNaN(year) || year < 1000 || year > 3000) {
      return res.status(400).json({ error: 'Please provide a valid publication year' });
    }

    const matchingBooks = await prisma.book.findMany({
      where: {
        is_archived: false,
        year_published: {
          lte: year,
          not: null
        }
      },
      include: {
        borrow_records: {
          where: { status: { in: ['BORROWED', 'OVERDUE'] } }
        }
      }
    });

    const eligibleIds = [];
    const skippedBooks = [];

    for (const b of matchingBooks) {
      if (b.borrow_records.length > 0) {
        skippedBooks.push({ id: b.id, title: b.title, activeLoans: b.borrow_records.length });
      } else {
        eligibleIds.push(b.id);
      }
    }

    if (eligibleIds.length > 0) {
      await prisma.book.updateMany({
        where: { id: { in: eligibleIds } },
        data: {
          is_archived: true,
          updated_at: new Date()
        }
      });
    }

    let message = `Successfully archived ${eligibleIds.length} book(s) published in or before ${year}.`;
    if (skippedBooks.length > 0) {
      message += ` ${skippedBooks.length} book(s) were skipped because they have active loans.`;
    }

    res.json({
      message,
      archivedCount: eligibleIds.length,
      skippedCount: skippedBooks.length,
      skippedBooks
    });
  } catch (error) {
    console.error('Error archiving books by year:', error);
    res.status(500).json({ error: 'Server error archiving books by year' });
  }
};

// Batch archive selected books
const archiveBatch = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of book IDs to archive' });
    }

    const numericIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

    const books = await prisma.book.findMany({
      where: { id: { in: numericIds } },
      include: {
        borrow_records: {
          where: { status: { in: ['BORROWED', 'OVERDUE'] } }
        }
      }
    });

    const eligibleIds = [];
    const skippedBooks = [];

    for (const b of books) {
      if (b.is_archived) continue;
      if (b.borrow_records.length > 0) {
        skippedBooks.push({ id: b.id, title: b.title, activeLoans: b.borrow_records.length });
      } else {
        eligibleIds.push(b.id);
      }
    }

    if (eligibleIds.length > 0) {
      await prisma.book.updateMany({
        where: { id: { in: eligibleIds } },
        data: {
          is_archived: true,
          updated_at: new Date()
        }
      });
    }

    let message = `Successfully archived ${eligibleIds.length} book(s).`;
    if (skippedBooks.length > 0) {
      message += ` ${skippedBooks.length} book(s) were skipped because they have active loans.`;
    }

    res.json({
      message,
      archivedCount: eligibleIds.length,
      skippedCount: skippedBooks.length,
      skippedBooks
    });
  } catch (error) {
    console.error('Error in batch archive:', error);
    res.status(500).json({ error: 'Server error archiving books' });
  }
};

// Batch restore selected books
const restoreBatch = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of book IDs to restore' });
    }

    const numericIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));

    const result = await prisma.book.updateMany({
      where: { id: { in: numericIds } },
      data: {
        is_archived: false,
        updated_at: new Date()
      }
    });

    res.json({
      message: `Successfully restored ${result.count} book(s) to active catalog.`,
      restoredCount: result.count
    });
  } catch (error) {
    console.error('Error in batch restore:', error);
    res.status(500).json({ error: 'Server error restoring books' });
  }
};

module.exports = {
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
};
