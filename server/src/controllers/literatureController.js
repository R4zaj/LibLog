const prisma = require('../db');

const getBooks = async (req, res) => {
  try {
    const books = await prisma.book.findMany({
      include: {
        author: true,
        genre: true
      },
      orderBy: {
        title: 'asc'
      }
    });

    const mappedBooks = books.map(b => ({
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
      condition: b.condition
    }));

    res.json(mappedBooks);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Server error fetching books' });
  }
};

const getAuthors = async (req, res) => {
  try {
    const authors = await prisma.author.findMany({
      include: {
        books: {
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
      include: {
        books: {
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
    const { isbn, title, authorName, genreName, lccn, year_published, shelf_number, total_copies, condition } = req.body;
    
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
    const { isbn, title, authorName, genreName, lccn, year_published, shelf_number, total_copies, condition } = req.body;
    
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

module.exports = { getBooks, getAuthors, getGenres, createBook, updateBook, deleteBook };
