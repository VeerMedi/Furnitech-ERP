const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticate } = require('../middleware/auth');

// Inventory Dashboard
router.get('/dashboard/stats', authenticate, inventoryController.getDashboardStats);
router.get('/items', authenticate, inventoryController.getAllInventory);

// Purchase Management
router.get('/purchase/list', authenticate, inventoryController.getPurchaseList);
router.get('/purchase/:id', authenticate, inventoryController.getPurchaseDetails);
router.post('/purchase/indent', authenticate, inventoryController.createPurchaseIndent);
router.put('/purchase/:id', authenticate, inventoryController.updatePurchaseOrder);

// Purchase Orders
router.get('/purchase-orders', authenticate, inventoryController.getPurchaseOrders);

// Item History
router.get('/item-history/:itemName', authenticate, inventoryController.getItemPurchaseHistory);

// ========================================
// AI RECOMMENDATION ENGINE ROUTES
// ========================================

// Low Stock & Suggestions
router.get('/low-stock', authenticate, inventoryController.getLowStockItems);
router.get('/suggestions', authenticate, inventoryController.getActiveSuggestions);
router.get('/suggestions/:id', authenticate, inventoryController.getSuggestionById);
router.post('/suggestions/:id/confirm', authenticate, inventoryController.confirmSuggestion);
router.post('/suggestions/:id/dismiss', authenticate, inventoryController.dismissSuggestion);

// Vendor Recommendations
router.get('/vendors/recommend/:materialId', authenticate, inventoryController.getVendorRecommendations);

// PO Recommendations
router.get('/po-recommendation/:suggestionId', authenticate, inventoryController.getPORecommendation);

// Manual Stock Check Trigger (for testing)
router.post('/check-stock', authenticate, inventoryController.triggerStockCheck);

// Update Reorder Settings
router.patch('/items/:itemId/reorder-settings', authenticate, inventoryController.updateReorderSettings);

module.exports = router;
