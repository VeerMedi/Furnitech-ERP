const express = require('express');
const router = express.Router();
const meetingLogController = require('../controllers/meetingLogController');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// Create a new meeting log
router.post('/', meetingLogController.createMeetingLog);

// Get all meeting logs for the logged-in salesman
router.get('/my-logs', meetingLogController.getMySalesmanMeetingLogs);

// Get upcoming meetings for the logged-in salesman
router.get('/upcoming', meetingLogController.getUpcomingMeetings);

// Get all meeting logs for a specific inquiry
router.get('/inquiry/:inquiryId', meetingLogController.getMeetingLogsByInquiry);

// Update a meeting log
router.put('/:id', meetingLogController.updateMeetingLog);

// Delete a meeting log
router.delete('/:id', meetingLogController.deleteMeetingLog);

module.exports = router;
