/**
 * Accurately calculates overdue days and penalty fees for LibLog.
 * 
 * Rules:
 * 1. For RETURNED books:
 *    - The overdue period is strictly between due_date and return_date.
 *    - Once returned, overdue days and penalty fees are FROZEN. They never increase over time.
 * 2. For ACTIVE (NOT RETURNED) books:
 *    - The overdue period is calculated from due_date up to the current date (now).
 * 3. Exact Rate:
 *    - Reads penalty_fee_per_day from LibrarySettings (e.g. ₱5.00/day).
 *    - days_overdue * dailyRate is GUARANTEED to match penalty_amount.
 */

function calculateOverdueDetails(borrow, settings, storedPenalty = null) {
  const penaltyFeePerDay = settings && settings.penalty_fee_per_day 
    ? parseFloat(settings.penalty_fee_per_day) 
    : 5.0;

  if (!borrow || !borrow.due_date) {
    const fallbackDays = storedPenalty?.days_overdue || 0;
    return {
      daysOverdue: fallbackDays,
      penaltyAmount: parseFloat(storedPenalty?.amount || (fallbackDays * penaltyFeePerDay)),
      isReturned: false,
      dailyRate: penaltyFeePerDay,
      returnDate: null
    };
  }

  const isReturned = Boolean(borrow.return_date || borrow.status === 'RETURNED');
  const cutoffDate = isReturned ? (borrow.return_date || borrow.updated_at) : new Date();

  const due = new Date(borrow.due_date);
  const cutoff = new Date(cutoffDate);

  // Normalize to calendar day midnight (local date)
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const cutoffMidnight = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate());

  const diffMs = cutoffMidnight.getTime() - dueMidnight.getTime();
  let daysOverdue = 0;
  if (diffMs > 0) {
    daysOverdue = Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  // If a returned book already has an amount stored in DB and days_overdue was 0,
  // derive the exact days_overdue from the amount (e.g. ₱80 / ₱5 = 16 days)
  if (isReturned && storedPenalty) {
    const storedAmount = parseFloat(storedPenalty.amount || 0);
    if (storedPenalty.days_overdue > 0) {
      daysOverdue = storedPenalty.days_overdue;
    } else if (storedAmount > 0) {
      const derived = Math.round(storedAmount / penaltyFeePerDay);
      if (derived > 0) {
        daysOverdue = derived;
      }
    }
  }

  // Ensure minimum 1 day if past due date
  if (diffMs > 0 && daysOverdue === 0) {
    daysOverdue = 1;
  }

  // Penalty amount calculation:
  // For OVERDUE type, amount is strictly daysOverdue * penaltyFeePerDay
  let penaltyAmount = daysOverdue * penaltyFeePerDay;

  // If the penalty has damage or lost add-on fees, preserve them
  if (storedPenalty && (storedPenalty.type === 'DAMAGE' || storedPenalty.type === 'LOST')) {
    penaltyAmount = parseFloat(storedPenalty.amount);
  }

  return {
    daysOverdue,
    penaltyAmount,
    isReturned,
    dailyRate: penaltyFeePerDay,
    returnDate: borrow.return_date
  };
}

function buildBorrowPenaltyInfo(borrow, settings) {
  const penaltyFeePerDay = settings && settings.penalty_fee_per_day
    ? parseFloat(settings.penalty_fee_per_day)
    : 5.0;

  const penalties = Array.isArray(borrow?.penalties) ? borrow.penalties : [];
  const unpaidPenalty = penalties.find(p => p.status === 'UNPAID');
  const paidPenalty = penalties.find(p => p.status === 'PAID');
  const targetPenalty = unpaidPenalty || paidPenalty || null;

  const details = calculateOverdueDetails(borrow, settings, targetPenalty);

  if (unpaidPenalty) {
    return {
      penalty_id: unpaidPenalty.id,
      status: 'UNPAID',
      type: unpaidPenalty.type || 'OVERDUE',
      days_overdue: details.daysOverdue,
      amount: details.penaltyAmount,
      daily_rate: details.dailyRate,
      paid_at: null
    };
  }

  if (!details.isReturned && details.daysOverdue > 0) {
    return {
      penalty_id: null,
      status: 'UNPAID',
      type: 'OVERDUE',
      days_overdue: details.daysOverdue,
      amount: details.penaltyAmount,
      daily_rate: details.dailyRate,
      paid_at: null
    };
  }

  if (paidPenalty) {
    return {
      penalty_id: paidPenalty.id,
      status: 'PAID',
      type: paidPenalty.type || 'OVERDUE',
      days_overdue: paidPenalty.days_overdue || details.daysOverdue,
      amount: parseFloat(paidPenalty.amount || 0),
      daily_rate: details.dailyRate,
      paid_at: paidPenalty.paid_at || null
    };
  }

  return {
    penalty_id: null,
    status: 'NONE',
    type: null,
    days_overdue: 0,
    amount: 0,
    daily_rate: penaltyFeePerDay,
    paid_at: null
  };
}

async function syncUserPenaltyBalance(tx, userId, settingsArg = null) {
  if (!userId) return 0;
  const settings = settingsArg || await tx.librarySettings.findFirst();
  const [unpaidPenalties, activeBorrows] = await Promise.all([
    tx.penalty.findMany({
      where: { user_id: userId, status: 'UNPAID' },
      include: { borrow: true }
    }),
    tx.borrowRecord.findMany({
      where: {
        user_id: userId,
        status: { in: ['BORROWED', 'OVERDUE'] },
        return_date: null
      },
      include: {
        penalties: { where: { status: 'UNPAID' } }
      }
    })
  ]);

  let totalUnpaid = 0;
  for (const p of unpaidPenalties) {
    const details = calculateOverdueDetails(p.borrow, settings, p);
    totalUnpaid += details.penaltyAmount;
  }

  for (const record of activeBorrows) {
    if (!record.penalties || record.penalties.length === 0) {
      const details = calculateOverdueDetails(record, settings, null);
      if (details.daysOverdue > 0) {
        totalUnpaid += details.penaltyAmount;
      }
    }
  }

  await tx.user.update({
    where: { id: userId },
    data: { penalty_balance: totalUnpaid }
  });

  return totalUnpaid;
}

module.exports = {
  calculateOverdueDetails,
  buildBorrowPenaltyInfo,
  syncUserPenaltyBalance
};
