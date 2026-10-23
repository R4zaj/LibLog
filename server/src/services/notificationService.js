const prisma = require('../db');

/**
 * Helper service to dispatch dual-stream notifications:
 * 1. Mobile (Personal): targeted to the specific student (target_user_id = user.id)
 * 2. Desktop (Operational): visible to Librarians & Admins (target_user_id = null, triggered_by = user.id)
 */

/**
 * Dispatches attendance check-in / check-out notifications
 */
async function notifyAttendance({ user, action, duration = 0, logId = null, tx = prisma }) {
  const isCheckIn = action === 'CHECK_IN';
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.student_id || 'Student';
  const studentIdentifier = user.student_id ? `(${user.student_id})` : '';

  // 1. Mobile Student Notification (Personal)
  const mobileNotif = tx.notification.create({
    data: {
      category: 'ATTENDANCE',
      title: isCheckIn ? 'Checked In' : 'Checked Out',
      message: isCheckIn
        ? 'You have successfully checked in to the library.'
        : `You have checked out of the library. Duration: ${duration} mins.`,
      target_user_id: user.id,
      triggered_by: user.id,
      ref_table: 'attendance_logs',
      ref_id: logId
    }
  });

  // 2. Desktop Librarian / Admin Notification (Operational)
  const desktopNotif = tx.notification.create({
    data: {
      category: 'ATTENDANCE',
      title: isCheckIn ? 'Student Check-In' : 'Student Check-Out',
      message: isCheckIn
        ? `${fullName} ${studentIdentifier} has checked in to the library.`.replace(/\s+/g, ' ')
        : `${fullName} ${studentIdentifier} has checked out (Duration: ${duration} mins).`.replace(/\s+/g, ' '),
      target_user_id: null, // Broadcast to desktop staff
      triggered_by: user.id,
      ref_table: 'attendance_logs',
      ref_id: logId
    }
  });

  return Promise.all([mobileNotif, desktopNotif]);
}

/**
 * Dispatches book checkout notifications
 */
async function notifyBorrow({ user, book, dueDate, borrowRecordId = null, tx = prisma }) {
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.student_id || 'Student';
  const studentIdentifier = user.student_id ? `(${user.student_id})` : '';
  const formattedDueDate = new Date(dueDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // 1. Mobile Student Notification
  const mobileNotif = tx.notification.create({
    data: {
      category: 'BORROWING',
      title: 'Book Borrowed',
      message: `You borrowed "${book.title}". It is due on ${formattedDueDate}.`,
      target_user_id: user.id,
      triggered_by: user.id,
      ref_table: 'borrow_records',
      ref_id: borrowRecordId
    }
  });

  // 2. Desktop Notification
  const desktopNotif = tx.notification.create({
    data: {
      category: 'BORROWING',
      title: 'Book Issued',
      message: `${fullName} ${studentIdentifier} borrowed "${book.title}". Due on ${formattedDueDate}.`.replace(/\s+/g, ' '),
      target_user_id: null,
      triggered_by: user.id,
      ref_table: 'borrow_records',
      ref_id: borrowRecordId
    }
  });

  return Promise.all([mobileNotif, desktopNotif]);
}

/**
 * Dispatches book return notifications
 */
async function notifyReturn({ user, book, borrowRecordId = null, tx = prisma }) {
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.student_id || 'Student';
  const studentIdentifier = user.student_id ? `(${user.student_id})` : '';

  // 1. Mobile Student Notification
  const mobileNotif = tx.notification.create({
    data: {
      category: 'BORROWING',
      title: 'Book Returned',
      message: `You successfully returned "${book.title}".`,
      target_user_id: user.id,
      triggered_by: user.id,
      ref_table: 'borrow_records',
      ref_id: borrowRecordId
    }
  });

  // 2. Desktop Notification
  const desktopNotif = tx.notification.create({
    data: {
      category: 'BORROWING',
      title: 'Book Returned',
      message: `${fullName} ${studentIdentifier} returned "${book.title}".`.replace(/\s+/g, ' '),
      target_user_id: null,
      triggered_by: user.id,
      ref_table: 'borrow_records',
      ref_id: borrowRecordId
    }
  });

  return Promise.all([mobileNotif, desktopNotif]);
}

/**
 * Dispatches penalty assessed notifications
 */
async function notifyPenalty({ user, book, amount, reason = 'OVERDUE', penaltyId = null, tx = prisma }) {
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.student_id || 'Student';
  const studentIdentifier = user.student_id ? `(${user.student_id})` : '';
  const formattedAmount = `₱${parseFloat(amount || 0).toFixed(2)}`;

  // 1. Mobile Student Notification
  const mobileNotif = tx.notification.create({
    data: {
      category: 'PENALTIES',
      title: 'Penalty Assessed',
      message: `You were assessed a penalty of ${formattedAmount} for "${book?.title || 'a book'}" (${reason.toLowerCase()}).`,
      target_user_id: user.id,
      triggered_by: user.id,
      ref_table: 'penalties',
      ref_id: penaltyId
    }
  });

  // 2. Desktop Notification
  const desktopNotif = tx.notification.create({
    data: {
      category: 'PENALTIES',
      title: 'Penalty Assessed',
      message: `${fullName} ${studentIdentifier} incurred a ${formattedAmount} penalty for "${book?.title || 'a book'}".`.replace(/\s+/g, ' '),
      target_user_id: null,
      triggered_by: user.id,
      ref_table: 'penalties',
      ref_id: penaltyId
    }
  });

  return Promise.all([mobileNotif, desktopNotif]);
}

/**
 * Dispatches penalty settled / paid notifications
 */
async function notifyPenaltyPaid({ user, amount, penaltyId = null, tx = prisma }) {
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.student_id || 'Student';
  const studentIdentifier = user.student_id ? `(${user.student_id})` : '';
  const formattedAmount = `₱${parseFloat(amount || 0).toFixed(2)}`;

  // 1. Mobile Student Notification
  const mobileNotif = tx.notification.create({
    data: {
      category: 'PENALTIES',
      title: 'Penalty Paid',
      message: `Your penalty payment of ${formattedAmount} was marked as paid.`,
      target_user_id: user.id,
      triggered_by: user.id,
      ref_table: 'penalties',
      ref_id: penaltyId
    }
  });

  // 2. Desktop Notification
  const desktopNotif = tx.notification.create({
    data: {
      category: 'PENALTIES',
      title: 'Penalty Settled',
      message: `${fullName} ${studentIdentifier} settled penalty of ${formattedAmount}.`.replace(/\s+/g, ' '),
      target_user_id: null,
      triggered_by: user.id,
      ref_table: 'penalties',
      ref_id: penaltyId
    }
  });

  return Promise.all([mobileNotif, desktopNotif]);
}

/**
 * Dispatches overdue notifications
 */
async function notifyOverdue({ user, book, daysOverdue, penaltyAmount, borrowRecordId = null, tx = prisma }) {
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.student_id || 'Student';
  const studentIdentifier = user.student_id ? `(${user.student_id})` : '';
  const formattedAmount = `₱${parseFloat(penaltyAmount || 0).toFixed(2)}`;

  // 1. Mobile Student Notification
  const mobileNotif = tx.notification.create({
    data: {
      category: 'BORROWING',
      title: 'Book Overdue',
      message: `"${book.title}" is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue. Current accrued penalty: ${formattedAmount}. Please return it immediately.`,
      target_user_id: user.id,
      triggered_by: user.id,
      ref_table: 'borrow_records',
      ref_id: borrowRecordId
    }
  });

  // 2. Desktop Notification
  const desktopNotif = tx.notification.create({
    data: {
      category: 'BORROWING',
      title: 'Overdue Alert',
      message: `${fullName} ${studentIdentifier} has an overdue book: "${book.title}" (${daysOverdue} days late).`.replace(/\s+/g, ' '),
      target_user_id: null,
      triggered_by: user.id,
      ref_table: 'borrow_records',
      ref_id: borrowRecordId
    }
  });

  return Promise.all([mobileNotif, desktopNotif]);
}

module.exports = {
  notifyAttendance,
  notifyBorrow,
  notifyReturn,
  notifyPenalty,
  notifyPenaltyPaid,
  notifyOverdue
};
