const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Creating mock notifications...');
  
  // Find a user or use null
  const user = await prisma.user.findFirst();
  
  await prisma.notification.createMany({
    data: [
      {
        category: 'BORROWING',
        title: 'New Borrow',
        message: 'A book has been borrowed.',
        target_user_id: user ? user.id : null,
      },
      {
        category: 'ATTENDANCE',
        title: 'New Check In',
        message: 'A student checked in.',
        target_user_id: user ? user.id : null,
      },
      {
        category: 'PENALTIES',
        title: 'Penalty Paid',
        message: 'A penalty was marked as paid.',
        target_user_id: user ? user.id : null,
      }
    ]
  });

  console.log('Mock notifications created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
