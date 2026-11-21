const prisma = require('../src/db');

const SPECIAL_BOOKS = [
  {
    isbn: '9780134685991',
    title: 'Effective Java (Special Reference Edition)',
    authorName: 'Joshua Bloch',
    genreName: 'Information Technology',
    lccn: 'QA76.73.J38',
    year_published: 2018,
    shelf_number: 'REF-IT-01',
    total_copies: 2,
    condition: 'EXCELLENT',
    is_special: true,
    custom_penalty_fee: 25.00
  },
  {
    isbn: '9780323532570',
    title: "Varney's Midwifery (Board Review Edition)",
    authorName: 'Tekoa L. King',
    genreName: 'Midwifery',
    lccn: 'RG950.V37',
    year_published: 2019,
    shelf_number: 'REF-MID-01',
    total_copies: 2,
    condition: 'EXCELLENT',
    is_special: true,
    custom_penalty_fee: 30.00
  },
  {
    isbn: '9781544342290',
    title: 'Research Methods in Public Administration (Thesis Reserve)',
    authorName: "Elizabethann O'Sullivan",
    genreName: 'Public Administration',
    lccn: 'JF1351.O88',
    year_published: 2020,
    shelf_number: 'REF-PA-01',
    total_copies: 2,
    condition: 'GOOD',
    is_special: true,
    custom_penalty_fee: 20.00
  },
  {
    isbn: '9780262046305',
    title: 'Introduction to Algorithms (4th Ed. Reserve)',
    authorName: 'Thomas H. Cormen',
    genreName: 'Information Technology',
    lccn: 'QA76.6.I5858',
    year_published: 2022,
    shelf_number: 'REF-IT-02',
    total_copies: 1,
    condition: 'EXCELLENT',
    is_special: true,
    custom_penalty_fee: 50.00
  }
];

async function addSpecialBooks() {
  const results = [];
  for (const item of SPECIAL_BOOKS) {
    let author = await prisma.author.findUnique({ where: { name: item.authorName } });
    if (!author) {
      author = await prisma.author.create({ data: { name: item.authorName } });
    }

    let genre = await prisma.genre.findUnique({ where: { name: item.genreName } });
    if (!genre) {
      genre = await prisma.genre.create({ data: { name: item.genreName } });
    }

    const book = await prisma.book.upsert({
      where: { isbn: item.isbn },
      update: {
        is_special: true,
        custom_penalty_fee: item.custom_penalty_fee
      },
      create: {
        isbn: item.isbn,
        title: item.title,
        author_id: author.id,
        genre_id: genre.id,
        lccn: item.lccn,
        year_published: item.year_published,
        shelf_number: item.shelf_number,
        total_copies: item.total_copies,
        available_copies: item.total_copies,
        condition: item.condition,
        is_special: true,
        custom_penalty_fee: item.custom_penalty_fee,
        qr_code: `BOOK-${item.isbn}`
      }
    });
    results.push({
      id: book.id,
      isbn: book.isbn,
      title: book.title,
      custom_penalty_fee: parseFloat(book.custom_penalty_fee)
    });
  }

  console.log('Special books upserted:', results.length);
  results.forEach((b) => console.log(JSON.stringify(b)));
}

addSpecialBooks()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to add special books:', err);
    process.exit(1);
  });
