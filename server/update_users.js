require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  let updatedCount = 0;

  for (const user of users) {
    let changed = false;
    let newStudentId = user.student_id;
    let newCardNo = user.card_no;

    if (newStudentId && newStudentId.startsWith('USR-')) {
      newStudentId = newStudentId.replace('USR-', 'CCC-');
      changed = true;
    }

    if (newCardNo && newCardNo.startsWith('USR-')) {
      newCardNo = newCardNo.replace('USR-', 'CCC-');
      changed = true;
    }

    if (changed) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            student_id: newStudentId,
            card_no: newCardNo
          }
        });
        updatedCount++;
      } catch (err) {
        console.error(`Failed to update user ${user.id}: ${err.message}`);
      }
    }
  }

  console.log(`Successfully updated ${updatedCount} users.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
