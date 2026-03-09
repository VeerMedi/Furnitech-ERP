const express = require('express');
const router = express.Router();
const machineController = require('../controllers/machineController');
const { authenticate } = require('../middleware/auth');

// Get all machines
router.get('/', authenticate, machineController.getAllMachines);

// Get dashboard statistics
router.get('/dashboard/stats', authenticate, machineController.getDashboardStats);

// Get machine usage chart data
router.get('/chart/usage', authenticate, machineController.getMachineUsageChartData);

// Get maintenance alerts
router.get('/maintenance/alerts', authenticate, machineController.getMaintenanceAlerts);

// Create machine
router.post('/', authenticate, machineController.createMachine);

// Get machine by ID
router.get('/:id', authenticate, machineController.getMachineById);

// Update machine
router.put('/:id', authenticate, machineController.updateMachine);

// Update machine condition
router.put('/:id/condition', authenticate, machineController.updateMachineCondition);

// Update service status
router.put('/:id/service', authenticate, machineController.updateServiceStatus);

// Get machine usage history
router.get('/:id/usage', authenticate, machineController.getMachineUsageHistory);

// Delete machine
router.delete('/:id', authenticate, machineController.deleteMachine);

module.exports = router;
