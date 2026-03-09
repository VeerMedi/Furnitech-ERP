const express = require('express');
const router = express.Router();
const googleSheetsController = require('../controllers/googleSheetsController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/google-sheets/test
 * @desc    Test route without auth
 * @access  Public
 */
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Google Sheets route is working!' });
});

/**
 * @route   POST /api/google-sheets/fetch-inquiries
 * @desc    Fetch and import inquiries from Google Sheets
 * @access  Private (Admin/POC only)
 */
router.post('/fetch-inquiries', googleSheetsController.fetchInquiriesFromSheet);

/**
 * @route   GET /api/google-sheets/preview-inquiries
 * @desc    Preview inquiries from Google Sheets (without creating)
 * @access  Public (for preview only)
 */
router.get('/preview-inquiries', googleSheetsController.previewInquiriesFromSheet);

/**
 * @route   DELETE /api/google-sheets/delete-last-24h
 * @desc    Delete inquiries imported in last 24 hours
 * @access  Private (Admin/POC only)
 */
router.delete('/delete-last-24h', googleSheetsController.deleteLastImportedInquiries);

/**
 * @route   GET /api/google-sheets/config
 * @desc    Get Google Sheets configuration
 * @access  Public (no auth needed - just returns sheet names)
 */
router.get('/config', googleSheetsController.getSheetConfig);

// Get available tabs for a sheet (Public)
router.get('/tabs', googleSheetsController.getTabsFromSheet);

// Preview inquiries from Google Sheet (Public)
router.post('/preview-inquiries', googleSheetsController.previewInquiriesFromSheet); // POST to support body params
router.get('/preview-inquiries', googleSheetsController.previewInquiriesFromSheet); // Keep GET for backward compat

/**
 * @route   GET /api/google-sheets/test-connection
 * @desc    Test Google Sheets API connection
 * @access  Private
 */
router.get('/test-connection', authenticate, googleSheetsController.testConnection);

module.exports = router;
