const express = require('express');
const router = express.Router();
const multer = require('multer');
const productController = require('../controllers/productController');
const productImportController = require('../controllers/productImportController');
const { authenticate } = require('../middleware/auth');

// Configure multer for file upload (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(authenticate);

// Import routes (must come before /:id to avoid matching issues)
router.post('/import', upload.single('file'), productImportController.importProducts);
router.get('/last-import', productImportController.getLastImport);
router.delete('/undo-last-import', productImportController.undoLastImport);
router.get('/download-template', productImportController.downloadTemplate);
router.post('/export-template', productImportController.exportSelectedProducts);


// Product routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
