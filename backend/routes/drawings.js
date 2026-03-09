const express = require('express');
const router = express.Router();
const multer = require('multer');
const drawingController = require('../controllers/drawingController');
const { authenticate } = require('../middleware/auth');

// Configure multer for file uploads (store in memory)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit per file (increased for CAD files)
  }
});

// ============ PUBLIC ROUTES (No Authentication) ============
// Client approval via email link (must be public)
router.get('/approve/:token', drawingController.handleClientApproval);

// ============ AUTHENTICATED ROUTES ============
// All routes below require authentication
router.use(authenticate);

// Upload drawings and assign to SPOC
router.post('/upload-to-spoc', upload.array('files', 10), drawingController.uploadDrawingsToSPOC);

// Get all drawings
router.get('/', drawingController.getAllDrawings);

// Get all drawings for a specific SPOC
router.get('/spoc/:spocId', drawingController.getDrawingsForSPOC);

// ============ DRAWING DASHBOARD ROUTES ============

// Get customers from orders (for Drawing Dashboard main view)
router.get('/customers-from-orders', drawingController.getCustomersFromOrders);

// Get order details for a customer (including all notes)
router.get('/customer/:customerId/orders', drawingController.getOrderDetailsForCustomer);

// Upload files to Drawing Dashboard and assign to salesman
router.post('/upload-files', upload.array('files', 20), drawingController.uploadFilesToDrawing);

// Get drawings for a specific salesman
router.get('/salesman/:salesmanName', drawingController.getDrawingsForSalesman);

// Get design team members for assignment
router.get('/design-team', drawingController.getDesignTeamMembers);

// Assign designer to customer
router.post('/assign-designer', drawingController.assignDesigner);

// Get Salesman Drawing Dashboard
router.get('/salesman-dashboard', drawingController.getSalesmanDrawingDashboard);

// Approve/Reject Drawing
router.put('/:id/approve', drawingController.approveDrawing);
router.put('/:id/reject', drawingController.rejectDrawing);

// Mark customer drawings as complete (for Pre-Production workflow)
router.put('/customer/:customerId/mark-complete', drawingController.markCustomerDrawingsComplete);
router.put('/customer/:customerId/undo-complete', drawingController.undoCustomerDrawingsComplete);

// ============ CLIENT APPROVAL WORKFLOW ============
// Send drawing approval email to client
router.post('/:id/send-approval-email', drawingController.sendDrawingApprovalEmail);

module.exports = router;
