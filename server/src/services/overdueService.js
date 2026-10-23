const prisma = require('../db');
const { notifyOverdue } = require('./notificationService');
const { sendOverdueNotice } = require('./emailService');
const { calculateOverdueDetails } = require('../utils/penaltyCalculator');

/**
 * Overdue Detection and Reminder Engine
 * Scans active borrowings past their due date:
 * - Updates status to 'OVERDUE'
 * - Calculates & upserts penalty record
 * - Dispatches desktop & mobile notifications
 * - Sends overdue notice email via Brevo API (throttled to max 1 per 24 hours per borrow record)
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

      // Check if overdue notification/email was already sent today for this borrow record
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
        // Dispatch mobile and desktop notifications
        await notifyOverdue({
          user: record.user,
          book: record.book,
          daysOverdue,
          penaltyAmount,
          borrowRecordId: record.id,
          tx: prisma
        });

        // Send Email Notice via Brevo if student has an email
        if (record.user?.email) {
          try {
            await sendOverdueNotice({
              user: record.user,
              book: record.book,
              record,
              daysOverdue,
              penaltyAmount
            });
            results.emailsSent++;
          } catch (emailErr) {
            console.error(`Failed to send overdue email to ${record.user.email}:`, emailErr.message);
            results.errors.push({ userId: record.user_id, error: emailErr.message });
          }
        }
      }
    } catch (recordErr) {
      console.error(`Error processing overdue record #${record.id}:`, recordErr);
      results.errors.push({ recordId: record.id, error: recordErr.message });
    }
  }

  return results;
}

module.exports = {
  checkAndProcessOverdueBooks
};
