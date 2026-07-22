const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  
  let count = 0;
  for (const u of users) {
    if (!u.qr_code || !u.qr_code.startsWith('QR-')) {
      await prisma.user.update({
        where: { id: u.id },
        data: { qr_code: `QR-${crypto.randomUUID()}` }
      });
      count++;
    }
  }
  console.log(`Updated ${count} users with unique QR codes.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
