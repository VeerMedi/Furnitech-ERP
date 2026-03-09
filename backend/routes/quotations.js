const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  approveQuotation,
  rejectQuotation,
  sendQuotationEmail,
  generatePDF,
  customerApproveQuotation,
  scanLayoutPDF,
  getQuotationScanResult,
  importWithAI
} = require('../controllers/quotationController');

// Multer config for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit for PDFs
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Public routes (No authentication required)
router.get('/public/:id/customer-approve', customerApproveQuotation);

router.use(authenticate);

router.get('/', getQuotations);
router.get('/:id', getQuotationById);
router.get('/:id/pdf', generatePDF);
router.post('/', createQuotation);
router.put('/:id', updateQuotation);
router.delete('/:id', deleteQuotation);
router.patch('/:id/approve', approveQuotation);
router.patch('/:id/reject', rejectQuotation);
router.post('/:id/send', sendQuotationEmail);

// 🚀 AI Layout Scanner Endpoints
router.post('/scan-layout', upload.single('file'), scanLayoutPDF);
router.get('/:id/scan-result', getQuotationScanResult);
router.post('/:id/import-with-ai', importWithAI);

module.exports = router;

