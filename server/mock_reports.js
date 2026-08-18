const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up previously generated mock users and books...');
  
  // Find mock users
  const mockUsers = await prisma.user.findMany({ where: { student_id: { startsWith: 'MOCK' } }, select: { id: true } });
  const mockUserIds = mockUsers.map(u => u.id);

  if (mockUserIds.length > 0) {
    // Delete dependent records
    await prisma.penalty.deleteMany({ where: { user_id: { in: mockUserIds } } });
    await prisma.borrowRecord.deleteMany({ where: { user_id: { in: mockUserIds } } });
    await prisma.attendanceLog.deleteMany({ where: { user_id: { in: mockUserIds } } });
  }

  // Clean up mock users, books, authors, genres, programs created previously
  await prisma.user.deleteMany({ where: { student_id: { startsWith: 'MOCK' } } });
  
  const mockBooks = await prisma.book.findMany({ where: { isbn: { startsWith: 'MOCK' } }, select: { id: true } });
  if (mockBooks.length > 0) {
    await prisma.borrowRecord.deleteMany({ where: { book_id: { in: mockBooks.map(b => b.id) } } });
  }
  await prisma.book.deleteMany({ where: { isbn: { startsWith: 'MOCK' } } });
  
  await prisma.author.deleteMany({ where: { name: 'John Doe Mock' } });
  await prisma.genre.deleteMany({ where: { name: 'Fiction', color: '#112233' } });
  await prisma.program.deleteMany({ where: { name: { endsWith: 'Program' }, code: { in: ['BSCS', 'BSIT', 'BSCpE', 'BSEd'] } } });

  console.log('Fetching real users and books from the database...');
  
  const users = await prisma.user.findMany();
  const books = await prisma.book.findMany();

  if (users.length === 0) {
    console.error('Error: No real users found in the database. Please register some users first.');
    return;
  }
  if (books.length === 0) {
    console.error('Error: No real books found in the database. Please add some books first.');
    return;
  }

  console.log(`Found ${users.length} users and ${books.length} books. Generating realistic report data...`);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // 1. Create Borrow Records & Penalties
  console.log('Inserting Borrow Records for real users...');
  
  // Generate 50 random borrow records
  for (let i = 0; i < 50; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomBook = books[Math.floor(Math.random() * books.length)];
    const isOverdue = i % 5 === 0;
    const isReturned = i % 2 === 0;

    let borrowDate = new Date(thirtyDaysAgo);
    borrowDate.setDate(borrowDate.getDate() + Math.floor(Math.random() * 30));
    let dueDate = new Date(borrowDate);
    dueDate.setDate(dueDate.getDate() + 3);

    let status = 'BORROWED';
    if (isReturned) {
      status = 'RETURNED';
    } else if (isOverdue) {
      status = 'OVERDUE';
      // Shift borrowDate far into the past so dueDate is also in the past but > borrowDate
      borrowDate = new Date();
      borrowDate.setDate(borrowDate.getDate() - 20); // 20 days ago
      dueDate = new Date(borrowDate);
      dueDate.setDate(dueDate.getDate() + 3); // 17 days ago
    }

    const borrow = await prisma.borrowRecord.create({
      data: {
        user_id: randomUser.id,
        book_id: randomBook.id,
        borrow_date: borrowDate,
        due_date: dueDate,
        return_date: isReturned ? new Date() : null,
        status: status,
        created_at: borrowDate
      }
    });

    if (status === 'OVERDUE') {
      await prisma.penalty.create({
        data: {
          borrow_id: borrow.id,
          user_id: randomUser.id,
          amount: 50.00,
          status: i % 10 === 0 ? 'PAID' : 'UNPAID',
          created_at: new Date()
        }
      });
    }
  }

  // 2. Create Attendance Logs
  console.log('Inserting Attendance Logs for real users...');
  for (let i = 0; i < 100; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const logDate = new Date(thirtyDaysAgo);
    logDate.setDate(logDate.getDate() + Math.floor(Math.random() * 30));

    await prisma.attendanceLog.create({
      data: {
        user_id: randomUser.id,
        action: 'CHECK_IN',
        logged_at: logDate,
        duration_minutes: Math.floor(Math.random() * 120) + 10
      }
    });
  }

  console.log('Real data simulation complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
