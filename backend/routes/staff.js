const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { authenticate } = require('../middleware/auth');

// Get all staff
router.get('/', authenticate, staffController.getAllStaff);

// Get staff by ID
router.get('/:id', authenticate, staffController.getStaffById);

// Create new staff
router.post('/', authenticate, staffController.createStaff);

// Update staff
router.put('/:id', authenticate, staffController.updateStaff);

// Delete staff
router.delete('/:id', authenticate, staffController.deleteStaff);

module.exports = router;
