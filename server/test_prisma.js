const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const records = await prisma.borrowRecord.findMany({
      where: {
        user_id: 1,
        status: { in: ['BORROWED', 'OVERDUE'] }
      },
      include: {
        book: {
          include: {
            author: true,
            genre: true
          }
        }
      },
      orderBy: {
        due_date: 'asc'
      }
    });
    console.log('SUCCESS');
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
