const express = require('express');
const router = express.Router();
const multer = require('multer');
const inquiryController = require('../controllers/inquiryController');
const { authenticate } = require('../middleware/auth');

// Configure multer for PDF uploads (store in memory)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for PDFs
    },
    fileFilter: (req, file, cb) => {
        // Accept only PDF files
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// All routes require authentication
router.use(authenticate);

// Get inquiries assigned to me (for salesman) - MUST be before /:id route
router.get('/assigned/me', inquiryController.getAssignedToMe);

// POC Assignment route
router.patch('/:id/assign', inquiryController.assignInquiry);

// Unassign route (for salesmen to remove assignment)
router.patch('/:id/unassign', inquiryController.unassignInquiry);

// Retrieve route (for POC to move removed inquiries back to unassigned)
router.patch('/:id/retrieve', inquiryController.retrieveInquiry);

// Inquiry routes
router.get('/', inquiryController.getAllInquiries);

// AI Lead Scoring route - Must come BEFORE /:id to avoid route conflict
router.post('/:id/rescore', inquiryController.rescoreInquiry);

router.get('/:id', inquiryController.getInquiryById);
router.post('/', inquiryController.createInquiry);
router.put('/:id', inquiryController.updateInquiry);

// Upload layout plan PDF
router.post('/:id/upload-layout-plan', upload.single('file'), inquiryController.uploadLayoutPlan);

router.delete('/:id', inquiryController.deleteInquiry);

// AI Lead Scoring route
router.post('/:id/rescore', inquiryController.rescoreInquiry);

// Onboard client route
router.post('/:id/onboard', inquiryController.onboardClient);

// Un-onboard client route
router.post('/:id/unonboard', inquiryController.unOnboardClient);

// Send Follow-up Reminders (Bulk)
router.post('/reminders/send', inquiryController.sendFollowUpReminders);

// Reminder Settings Management
router.get('/reminders/settings', inquiryController.getReminderSettings);
router.post('/reminders/settings', inquiryController.updateReminderSettings);
router.delete('/reminders/settings', inquiryController.disableReminderSettings);

module.exports = router;

