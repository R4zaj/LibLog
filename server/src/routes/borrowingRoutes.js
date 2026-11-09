const express = require('express');
const router = express.Router();
const {
  getStats,
  validateBook,
  validateUser,
  checkout,
  getUserActiveBorrow,
  getUserActiveBorrowRecords,
  getUserBorrowHistory,
  getUserPenalties,
  getAllBorrowRecords,
  returnBook,
  getPenalties,
  payPenalty,
  resendPenaltyReceiptEmail,
  checkOverdue,
  sendPenaltyNoticeEmail,
  sendUserOverdueNoticeEmail
} = require('../controllers/borrowingController');

router.get('/stats', getStats);
router.get('/records', getAllBorrowRecords);
router.get('/validate-book/:identifier', validateBook);
router.get('/validate-user/:identifier', validateUser);
router.post('/checkout', checkout);
router.get('/user-active-borrow/:bookIdentifier/:userIdentifier', getUserActiveBorrow);
router.get('/user/:id', getUserActiveBorrowRecords);
router.get('/user/:id/history', getUserBorrowHistory);
router.get('/user/:id/penalties', getUserPenalties);
router.post('/return', returnBook);
router.get('/penalties', getPenalties);
router.post('/penalties/:id/pay', payPenalty);
router.post('/penalties/:id/send-email', sendPenaltyNoticeEmail);
router.post('/penalties/user/:userId/send-email', sendUserOverdueNoticeEmail);
router.post('/penalties/:id/resend-receipt', resendPenaltyReceiptEmail);
router.post('/check-overdue', checkOverdue);

module.exports = router;
