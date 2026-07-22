const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const record = await prisma.borrowRecord.findFirst({ where: { status: 'BORROWED' } });
    if (!record) return console.log('No borrowed records');
    
    await prisma.$transaction(async (tx) => {
      await tx.borrowRecord.update({
        where: { id: record.id },
        data: {
          return_date: new Date(),
          status: 'RETURNED'
        }
      });
      await tx.book.update({
        where: { id: record.book_id },
        data: { available_copies: { increment: 1 } }
      });
    });
    console.log('Success');
  } catch(e) {
    console.error('ERROR', e);
  }
}
main();
