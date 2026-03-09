const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transportController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, transportController.getAllTransports);
router.get('/stats', authenticate, transportController.getTransportStatistics);
router.get('/orders', authenticate, transportController.getDeliveryOrders);
router.get('/driver/:driverId', authenticate, transportController.getDriverInfo);
router.get('/vehicle/:vehicleNumber', authenticate, transportController.getVehicleInfo);
router.get('/:id', authenticate, transportController.getTransportById);

router.post('/', authenticate, transportController.createTransport);
router.put('/:id', authenticate, transportController.updateTransport);
router.put('/:id/status', authenticate, transportController.updateTransportStatus);
router.put('/:id/location', authenticate, transportController.updateVehicleLocation);
router.delete('/:id', authenticate, transportController.deleteTransport);

module.exports = router;
