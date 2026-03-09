const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { 
  getPayments, 
  createPayment, 
  updatePayment, 
  deletePayment 
} = require('../controllers/paymentController');

router.use(authenticate);

router.get('/', getPayments);
router.post('/', createPayment);
router.put('/:id', updatePayment);
router.delete('/:id', deletePayment);

module.exports = router;
