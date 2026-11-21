const prisma = require('../src/db');

const TARGET_DUMMY_IDS = [1, 2, 3, 11, 13, 34, 36];
const LIBRARIAN_ID = 12;

/**
 * Safely deletes confirmed dummy user accounts inside a single transaction,
 * restoring available_copies for any active borrows and reassigning audit FKs
 * to the main librarian account (id: 12) before deletion.
 */
async function removeDummyUsers() {
  const result = await prisma.$transaction(
    async (tx) => {
      const existingTargets = await tx.user.findMany({
        where: { id: { in: TARGET_DUMMY_IDS } },
        select: { id: true, student_id: true, first_name: true, last_name: true, email: true },
      });

      if (existingTargets.length === 0) {
        return { deletedCount: 0, restoredBooks: 0, deletedUsers: [] };
      }

      const activeBorrows = await tx.borrowRecord.findMany({
        where: {
          user_id: { in: TARGET_DUMMY_IDS },
          status: { in: ['BORROWED', 'OVERDUE'] },
          return_date: null,
        },
        select: { id: true, book_id: true },
      });

      const restoreCountByBook = new Map();
      for (const b of activeBorrows) {
        restoreCountByBook.set(b.book_id, (restoreCountByBook.get(b.book_id) || 0) + 1);
      }

      let restoredBooks = 0;
      for (const [bookId, count] of restoreCountByBook.entries()) {
        const book = await tx.book.findUnique({
          where: { id: bookId },
          select: { id: true, available_copies: true, total_copies: true },
        });
        if (book) {
          const nextAvailable = Math.min(book.total_copies, book.available_copies + count);
          if (nextAvailable !== book.available_copies) {
            await tx.book.update({
              where: { id: bookId },
              data: { available_copies: nextAvailable },
            });
            restoredBooks += nextAvailable - book.available_copies;
          }
        }
      }

      // Reassign or nullify non-cascading foreign key references before deleting users
      await tx.borrowRecord.updateMany({
        where: { processed_by: { in: TARGET_DUMMY_IDS } },
        data: { processed_by: LIBRARIAN_ID },
      });
      await tx.penalty.updateMany({
        where: { collected_by: { in: TARGET_DUMMY_IDS } },
        data: { collected_by: LIBRARIAN_ID },
      });
      await tx.notification.updateMany({
        where: { triggered_by: { in: TARGET_DUMMY_IDS } },
        data: { triggered_by: null },
      });
      await tx.announcement.updateMany({
        where: { created_by: { in: TARGET_DUMMY_IDS } },
        data: { created_by: LIBRARIAN_ID },
      });
      await tx.reportSnapshot.updateMany({
        where: { generated_by: { in: TARGET_DUMMY_IDS } },
        data: { generated_by: LIBRARIAN_ID },
      });

      // Delete dependent records owned by target dummy users
      await tx.penalty.deleteMany({
        where: { user_id: { in: TARGET_DUMMY_IDS } },
      });
      await tx.borrowRecord.deleteMany({
        where: { user_id: { in: TARGET_DUMMY_IDS } },
      });
      await tx.attendanceLog.deleteMany({
        where: { user_id: { in: TARGET_DUMMY_IDS } },
      });
      await tx.notification.deleteMany({
        where: { target_user_id: { in: TARGET_DUMMY_IDS } },
      });

      const deleted = await tx.user.deleteMany({
        where: { id: { in: TARGET_DUMMY_IDS } },
      });

      return {
        deletedCount: deleted.count,
        restoredBooks,
        deletedUsers: existingTargets,
      };
    },
    { timeout: 30000 }
  );

  const remaining = await prisma.user.findMany({
    select: { id: true, student_id: true, first_name: true, last_name: true, email: true, role: true },
    orderBy: { id: 'asc' },
  });

  console.log('Deleted count:', result.deletedCount);
  console.log('Restored available_copies:', result.restoredBooks);
  console.log('Remaining users:', remaining.length);
  remaining.forEach((u) => console.log(JSON.stringify(u)));
}

removeDummyUsers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Cleanup failed:', err);
    process.exit(1);
  });
