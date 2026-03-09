const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Dashboard statistics
router.get('/stats', orderController.getDashboardStats);

// Invoice (must come before /:id routes)
router.post('/:id/invoice/generate', orderController.generateInvoice);
router.get('/:id/invoice/download', orderController.downloadInvoice);

// Status update (must come before /:id routes)
router.patch('/:id/status', orderController.updateOrderStatus);

// Payment (must come before /:id routes)
router.post('/:id/payment', orderController.addPayment);

// CRUD operations
router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.post('/', orderController.createOrder);
router.put('/:id', orderController.updateOrder);
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
