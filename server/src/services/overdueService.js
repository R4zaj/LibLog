const prisma = require('../db');
const { notifyOverdue } = require('./notificationService');
const { sendOverdueNotice } = require('./emailService');
const { calculateOverdueDetails, syncUserPenaltyBalance } = require('../utils/penaltyCalculator');

/**
 * Overdue Detection and Reminder Engine
 * Scans active borrowings past their due date:
 * - Updates status to 'OVERDUE'
 * - Calculates & upserts penalty record
 * - Dispatches desktop & mobile notifications
 * - Dispatches a single consolidated overdue notice email per student (throttled to max 1 per 24 hours per user)
 */
async function checkAndProcessOverdueBooks() {
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 1. Fetch library settings for penalty calculation
  const settings = await prisma.librarySettings.findFirst();

  // 2. Find all active records that have NOT been returned and are past due date
  const overdueRecords = await prisma.borrowRecord.findMany({
    where: {
      status: { in: ['BORROWED', 'OVERDUE'] },
      return_date: null,
      due_date: { lt: now }
    },
    include: {
      user: true,
      book: {
        include: { author: true }
      },
      penalties: {
        where: { status: 'UNPAID', type: 'OVERDUE' }
      }
    }
  });

  const results = {
    scanned: overdueRecords.length,
    markedOverdue: 0,
    penaltiesUpdated: 0,
    emailsSent: 0,
    errors: []
  };

  // Group overdue records by student (userId) for a single consolidated email
  const userOverdueGroups = new Map();

  for (const record of overdueRecords) {
    try {
      // Transition BORROWED -> OVERDUE
      if (record.status !== 'OVERDUE') {
        await prisma.borrowRecord.update({
          where: { id: record.id },
          data: { status: 'OVERDUE' }
        });
        results.markedOverdue++;
      }

      // Calculate exact days overdue and penalty fee using central calculator
      const { daysOverdue, penaltyAmount } = calculateOverdueDetails(record, settings, record.penalties[0]);

      // Upsert unpaid overdue penalty record
      let penaltyRecord = record.penalties[0];
      if (!penaltyRecord) {
        penaltyRecord = await prisma.penalty.create({
          data: {
            borrow_id: record.id,
            user_id: record.user_id,
            type: 'OVERDUE',
            amount: penaltyAmount,
            days_overdue: daysOverdue,
            status: 'UNPAID'
          }
        });
        results.penaltiesUpdated++;
      } else {
        // Update days and amount if changed
        if (penaltyRecord.days_overdue !== daysOverdue) {
          await prisma.penalty.update({
            where: { id: penaltyRecord.id },
            data: {
              days_overdue: daysOverdue,
              amount: penaltyAmount
            }
          });
          results.penaltiesUpdated++;
        }
      }

      await syncUserPenaltyBalance(prisma, record.user_id, settings);

      // Check if overdue in-app notification was already sent today for this borrow record
      const notifiedToday = await prisma.notification.findFirst({
        where: {
          ref_table: 'borrow_records',
          ref_id: record.id,
          category: 'BORROWING',
          title: 'Book Overdue',
          created_at: { gte: todayStart }
        }
      });

      if (!notifiedToday) {
        // Dispatch mobile and desktop notifications per book
        await notifyOverdue({
          user: record.user,
          book: record.book,
          daysOverdue,
          penaltyAmount,
          borrowRecordId: record.id,
          tx: prisma
        });
      }

      // Collect for consolidated email dispatch if user has an email
      if (record.user?.email) {
        if (!userOverdueGroups.has(record.user_id)) {
          userOverdueGroups.set(record.user_id, {
            user: record.user,
            items: []
          });
        }
        userOverdueGroups.get(record.user_id).items.push({
          book: record.book,
          record,
          daysOverdue,
          penaltyAmount,
          borrowDate: record.borrow_date,
          dueDate: record.due_date
        });
      }
    } catch (recordErr) {
      console.error(`Error processing overdue record #${record.id}:`, recordErr);
      results.errors.push({ recordId: record.id, error: recordErr.message });
    }
  }

  // 3. Dispatch exactly ONE consolidated email per student across all their overdue books
  const dailyRate = parseFloat(settings?.penalty_fee_per_day || 5);

  for (const [userId, group] of userOverdueGroups.entries()) {
    try {
      // Check if consolidated overdue email was already dispatched to this student today
      const emailSentToday = await prisma.notification.findFirst({
        where: {
          target_user_id: userId,
          category: 'BORROWING',
          title: 'Overdue Email Notice Dispatched',
          created_at: { gte: todayStart }
        }
      });

      if (emailSentToday) {
        continue; // Throttled: max 1 consolidated overdue email per student per calendar day
      }

      // Dispatch single consolidated overdue email containing all overdue books
      await sendOverdueNotice({
        user: group.user,
        items: group.items,
        dailyRate
      });
      results.emailsSent++;

      // Record dispatch to enforce 24-hour daily throttle
      await prisma.notification.create({
        data: {
          category: 'BORROWING',
          title: 'Overdue Email Notice Dispatched',
          message: `Consolidated overdue notice dispatched to ${group.user.email} for ${group.items.length} overdue book${group.items.length > 1 ? 's' : ''}.`,
          target_user_id: userId,
          ref_table: 'users',
          ref_id: userId
        }
      });
    } catch (emailErr) {
      console.error(`Failed to send consolidated overdue email to ${group.user.email}:`, emailErr.message);
      results.errors.push({ userId, error: emailErr.message });
    }
  }

  return results;
}

module.exports = {
  checkAndProcessOverdueBooks
};
