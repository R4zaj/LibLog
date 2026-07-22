const prisma = require('./db');

async function test() {
  console.time('TopBooks');
  const topBooksRaw = await prisma.borrowRecord.groupBy({ by: ['book_id'], _count: { book_id: true }, orderBy: { _count: { book_id: 'desc' } }, take: 5 });
  console.timeEnd('TopBooks');

  console.time('LeastBooks');
  const leastBooksRaw = await prisma.borrowRecord.groupBy({ by: ['book_id'], _count: { book_id: true }, orderBy: { _count: { book_id: 'asc' } }, take: 5 });
  console.timeEnd('LeastBooks');

  console.time('PopularGenres');
  const allBooks = await prisma.borrowRecord.findMany({ include: { book: { include: { genre: true } } } });
  console.timeEnd('PopularGenres');

  console.time('TopStudents');
  const topStudentsRaw = await prisma.attendanceLog.groupBy({ by: ['user_id'], _count: { user_id: true }, orderBy: { _count: { user_id: 'desc' } }, take: 3 });
  console.timeEnd('TopStudents');

  console.time('VisitsByProgram');
  const allAttendance = await prisma.attendanceLog.findMany({ where: { action: 'CHECK_IN' }, include: { user: { include: { program: true } } } });
  console.timeEnd('VisitsByProgram');

  console.time('Penalties');
  const unpaidPenaltiesRaw = await prisma.penalty.findMany({ where: { status: 'UNPAID' }, include: { user: true } });
  console.timeEnd('Penalties');

  console.time('Overdue');
  const overdueRaw = await prisma.borrowRecord.findMany({ where: { status: 'OVERDUE' }, include: { user: { include: { program: true } } } });
  console.timeEnd('Overdue');

  console.time('Trend');
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentBorrows = await prisma.borrowRecord.findMany({ where: { created_at: { gte: thirtyDaysAgo } }, select: { created_at: true } });
  console.timeEnd('Trend');
}

test().then(() => process.exit(0)).catch(console.error);
