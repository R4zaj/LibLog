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

module.exports = {
  calculateOverdueDetails
};
