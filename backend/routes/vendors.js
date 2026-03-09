const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, vendorController.getAllVendors);
router.get('/:id', authenticate, vendorController.getVendorById);
router.post('/', authenticate, vendorController.createVendor);
router.put('/:id', authenticate, vendorController.updateVendor);
router.delete('/:id', authenticate, vendorController.deleteVendor);
router.post('/:id/purchase', authenticate, vendorController.addPurchaseRecord);
router.post('/:id/payment', authenticate, vendorController.updatePayment);
router.put('/:vendorId/purchase/:purchaseId', authenticate, vendorController.updatePurchaseHistory);

module.exports = router;
