const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const books = await prisma.book.findMany({
      where: {
        is_archived: false
      },
      include: {
        author: true,
        genre: true
      },
      orderBy: {
        title: 'asc'
      }
    });
    console.log('SUCCESS:', books.length);
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
