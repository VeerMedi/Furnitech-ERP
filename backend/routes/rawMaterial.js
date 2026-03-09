const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getAllRawMaterials,
  getRawMaterialsByCategory,
  getRawMaterial,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  getDashboardStats,
  getPriceBook,
  getPriceBookStats,
  updateMaterialPrice,
} = require('../controllers/rawMaterialController');
const { getSpecificationFields, getSpecificationStats, getAllCategories } = require('../controllers/rawMaterialMetadataController');  // 🎯 DYNAMIC METADATA
const { getLastImport, undoLastImport } = require('../controllers/importManagementController');  // 🔄 IMPORT MANAGEMENT
const { importFromExcelIntelligent } = require('../controllers/intelligentImportFixed');  // ✅ NEW WORKING VERSION!
const { dynamicImportFromExcel } = require('../controllers/dynamicRawMaterialImport');  // 🚀 TRULY DYNAMIC PARSER!
const { importFromExcelStrict } = require('../controllers/strictTemplateImport');  // 📋 STRICT TEMPLATE IMPORT
const { downloadTemplate } = require('../controllers/templateDownload');  // 📥 TEMPLATE DOWNLOAD
const { authenticate } = require('../middleware/auth');

// Configure multer for Excel file uploads (store in memory)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept only Excel files
    const allowedMimes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xls, .xlsx) are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// All routes require authentication
router.use(authenticate);

// Download template route
router.get('/download-template', downloadTemplate);

// Dashboard stats
router.get('/stats/dashboard', getDashboardStats);

// Metadata routes - Dynamic specification fields
router.get('/metadata/specification-fields', getSpecificationFields);
router.get('/metadata/specification-stats', getSpecificationStats);
router.get('/metadata/categories', getAllCategories); // 🚀GET ALL DYNAMIC CATEGORIES

// Import Management routes - Undo Last Import
router.get('/import/last', getLastImport);       // 🔍 GET last import info
router.delete('/import/last', undoLastImport);   // 🗑️ UNDO last import

// Price Book routes
router.get('/price-book/stats', getPriceBookStats);
router.get('/price-book', getPriceBook);
router.post('/price-book/:id/update-price', updateMaterialPrice);

// Import from Excel - TRULY DYNAMIC PARSER! 🚀🧠 (Auto-detects ALL columns)
router.post('/import', upload.single('file'), dynamicImportFromExcel);

// Import from Excel - STRICT TEMPLATE! 📋✅
router.post('/import-strict', upload.single('file'), importFromExcelStrict);

// CRUD operations
router.route('/')
  .get(getAllRawMaterials)
  .post(createRawMaterial);

router.route('/:id')
  .get(getRawMaterial)
  .put(updateRawMaterial)
  .delete(deleteRawMaterial);

// Get by category
router.get('/category/:category', getRawMaterialsByCategory);

module.exports = router;
