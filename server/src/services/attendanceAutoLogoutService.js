const prisma = require('../db');
const { notifySystem } = require('./notificationService');

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Returns the UTC Date corresponding to 00:00:00.000 Asia/Manila time
 * for the given reference Date.
 */
function getStartOfDayManila(date = new Date()) {
  const manila = new Date(date.getTime() + MANILA_OFFSET_MS);
  const utcMidnight = Date.UTC(
    manila.getUTCFullYear(),
    manila.getUTCMonth(),
    manila.getUTCDate(),
    0, 0, 0, 0
  );
  return new Date(utcMidnight - MANILA_OFFSET_MS);
}

/**
 * Returns the UTC Date corresponding to 23:59:59.000 Asia/Manila time
 * for the calendar day of the given Date.
 */
function getEndOfDayManila(date) {
  const manila = new Date(date.getTime() + MANILA_OFFSET_MS);
  const utcEndOfDay = Date.UTC(
    manila.getUTCFullYear(),
    manila.getUTCMonth(),
    manila.getUTCDate(),
    23, 59, 59, 0
  );
  return new Date(utcEndOfDay - MANILA_OFFSET_MS);
}

/**
 * Automatically checks out any user whose latest attendance log is a CHECK_IN
 * from a previous calendar day (Asia/Manila), recording a CHECK_OUT at 23:59:59
 * of their check-in day so forgotten sign-outs do not remain open.
 */
async function autoLogoutEndOfDay(now = new Date(), prismaClient = prisma) {
  const startOfToday = getStartOfDayManila(now);

  const latestLogsPerUser = await prismaClient.attendanceLog.findMany({
    distinct: ['user_id'],
    orderBy: [
      { user_id: 'asc' },
      { logged_at: 'desc' }
    ]
  });

  const unclosedLogs = latestLogsPerUser.filter(
    (log) => log.action === 'CHECK_IN' && new Date(log.logged_at) < startOfToday
  );

  if (unclosedLogs.length === 0) {
    return { checkedOutCount: 0 };
  }

  const checkOutRows = unclosedLogs.map((log) => {
    const checkInTime = new Date(log.logged_at);
    const endOfCheckInDay = getEndOfDayManila(checkInTime);
    const durationMinutes = Math.max(
      0,
      Math.round((endOfCheckInDay.getTime() - checkInTime.getTime()) / (1000 * 60))
    );

    return {
      user_id: log.user_id,
      action: 'CHECK_OUT',
      scanned_qr: 'AUTO_LOGOUT_EOD',
      logged_at: endOfCheckInDay,
      duration_minutes: durationMinutes
    };
  });

  await prismaClient.attendanceLog.createMany({
    data: checkOutRows
  });

  if (prismaClient === prisma) {
    try {
      await notifySystem({
        title: 'End-of-Day Auto-Logout',
        message: `Automatically checked out ${checkOutRows.length} user(s) with unclosed attendance from a previous day.`,
        refTable: 'attendance_logs'
      });
    } catch (sysErr) {
      console.error('Failed to log system notification for auto-logout:', sysErr.message);
    }
  }

  return { checkedOutCount: checkOutRows.length };
}

module.exports = {
  getStartOfDayManila,
  getEndOfDayManila,
  autoLogoutEndOfDay
};
