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
  getAllBorrowRecords,
  returnBook,
  getPenalties,
  payPenalty
} = require('../controllers/borrowingController');

router.get('/stats', getStats);
router.get('/records', getAllBorrowRecords);
router.get('/validate-book/:identifier', validateBook);
router.get('/validate-user/:identifier', validateUser);
router.post('/checkout', checkout);
router.get('/user-active-borrow/:bookIdentifier/:userIdentifier', getUserActiveBorrow);
router.get('/user/:id', getUserActiveBorrowRecords);
router.get('/user/:id/history', getUserBorrowHistory);
router.post('/return', returnBook);
router.get('/penalties', getPenalties);
router.post('/penalties/:id/pay', payPenalty);

module.exports = router;
