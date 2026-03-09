const InventoryStock = require('../models/vlite/InventoryStock');
const PurchaseIndent = require('../models/vlite/PurchaseIndent');
const GRN = require('../models/vlite/GRN');
const InventoryTransaction = require('../models/vlite/InventoryTransaction');

// Get Inventory Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    // Get stock stats
    const stocks = await InventoryStock.find({ organizationId });
    const totalStock = stocks.reduce((sum, item) => sum + item.totalStock, 0);
    const blockedStock = stocks.reduce((sum, item) => sum + item.blockedStock, 0);
    const upcomingStock = stocks.reduce((sum, item) => sum + item.upcomingStock, 0);
    const issued = stocks.reduce((sum, item) => sum + item.issued, 0);
    const returned = stocks.reduce((sum, item) => sum + item.returned, 0);

    // Get purchase order stats
    const purchaseOrders = await PurchaseIndent.find({ organizationId });
    const posCreated = purchaseOrders.length;
    const posApproved = purchaseOrders.filter(po => po.poStatus === 'Approved').length;

    // Get GRN stats
    const grns = await GRN.find({ organizationId });
    const grnsCreated = grns.length;

    // Get category-wise stock
    const categoryWiseStock = await InventoryStock.aggregate([
      { $match: { organizationId: organizationId } },
      {
        $group: {
          _id: '$category',
          totalStock: { $sum: '$totalStock' },
          blockedStock: { $sum: '$blockedStock' },
          availableStock: { $sum: '$availableStock' }
        }
      }
    ]);

    // Get monthly data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await InventoryTransaction.aggregate([
      {
        $match: {
          organizationId: organizationId,
          transactionDate: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$transactionDate' },
            year: { $year: '$transactionDate' }
          },
          total: { $sum: '$quantity' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get recent transactions
    const recentTransactions = await InventoryTransaction
      .find({ organizationId })
      .sort({ transactionDate: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        stats: {
          totalStock,
          blockedStock,
          upcomingStock,
          issued,
          returned,
          posCreated,
          posApproved,
          grnsCreated
        },
        categoryWiseStock,
        monthlyData,
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

// Get All Inventory Items
exports.getAllInventory = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const { category, search } = req.query;

    let query = { organizationId };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const items = await InventoryStock.find(query).sort({ itemName: 1 });

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inventory items',
      error: error.message
    });
  }
};

// Get Purchase List (Indent, PO, or GRN)
exports.getPurchaseList = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const { type = 'indent' } = req.query;

    let Model;
    if (type === 'indent' || type === 'po') {
      Model = PurchaseIndent;
    } else if (type === 'grn') {
      Model = GRN;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be indent, po, or grn'
      });
    }

    const purchases = await Model.find({ organizationId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: purchases
    });
  } catch (error) {
    console.error('Error fetching purchase list:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching purchase list',
      error: error.message
    });
  }
};

// Get Purchase Details by ID
exports.getPurchaseDetails = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const { id } = req.params;
    const { type = 'indent' } = req.query;

    let Model;
    if (type === 'indent' || type === 'po') {
      Model = PurchaseIndent;
    } else if (type === 'grn') {
      Model = GRN;
    } else {
      Model = PurchaseIndent; // default
    }

    const purchase = await Model.findOne({ _id: id, organizationId });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    res.json({
      success: true,
      data: purchase
    });
  } catch (error) {
    console.error('Error fetching purchase details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching purchase details',
      error: error.message
    });
  }
};

// Get Item Purchase History
exports.getItemPurchaseHistory = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const { itemName } = req.params;

    const transactions = await InventoryTransaction
      .find({ organizationId, itemName })
      .sort({ transactionDate: -1 });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching item history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching item purchase history',
      error: error.message
    });
  }
};

// Get Purchase Orders
exports.getPurchaseOrders = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    const purchaseOrders = await PurchaseIndent
      .find({ organizationId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: purchaseOrders
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching purchase orders',
      error: error.message
    });
  }
};

// Create Purchase Indent
exports.createPurchaseIndent = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    // Generate unique indent number
    const count = await PurchaseIndent.countDocuments({ organizationId });
    const indentNo = `IND-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const indentData = {
      ...req.body,
      indentNo,
      organizationId,
      createdBy: req.user?._id
    };

    const indent = new PurchaseIndent(indentData);
    await indent.save();

    res.status(201).json({
      success: true,
      message: 'Purchase indent created successfully',
      data: indent
    });
  } catch (error) {
    console.error('Error creating purchase indent:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating purchase indent',
      error: error.message
    });
  }
};

// Update Purchase Order
exports.updatePurchaseOrder = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const { id } = req.params;
    const updateData = req.body;

    const purchase = await PurchaseIndent.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    res.json({
      success: true,
      message: 'Purchase order updated successfully',
      data: purchase
    });
  } catch (error) {
    console.error('Error updating purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating purchase order',
      error: error.message
    });
  }
};

// ========================================
// AI RECOMMENDATION ENGINE CONTROLLERS
// ========================================

const InventorySuggestion = require('../models/vlite/InventorySuggestion');
const inventoryMonitoringService = require('../services/inventoryMonitoringService');
const vendorRecommendationService = require('../services/vendorRecommendationService');
const poRecommendationService = require('../services/poRecommendationService');
const RawMaterial = require('../models/vlite/RawMaterial');

// Get Low Stock Items
exports.getLowStockItems = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    const lowStockItems = await inventoryMonitoringService.getLowStockItems(organizationId);

    res.json({
      success: true,
      data: lowStockItems,
      count: lowStockItems.length
    });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching low stock items',
      error: error.message
    });
  }
};

// Get Active Suggestions
exports.getActiveSuggestions = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const { priority } = req.query;

    let query = {
      organizationId,
      status: 'pending',
    };

    if (priority) {
      query.priority = priority;
    }

    const suggestions = await InventorySuggestion.find(query)
      .populate('rawMaterial')
      .sort({ priority: 1, createdAt: -1 });

    const activeSuggestions = suggestions.filter(s => !s.isExpired());

    res.json({
      success: true,
      data: activeSuggestions,
      count: activeSuggestions.length
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching suggestions',
      error: error.message
    });
  }
};

// Get Suggestion by ID
exports.getSuggestionById = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const { id } = req.params;

    const suggestion = await InventorySuggestion.findOne({
      _id: id,
      organizationId,
    }).populate('rawMaterial');

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: 'Suggestion not found'
      });
    }

    res.json({
      success: true,
      data: suggestion
    });
  } catch (error) {
    console.error('Error fetching suggestion:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching suggestion',
      error: error.message
    });
  }
};

// Confirm Suggestion (Create PO)
exports.confirmSuggestion = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const { id } = req.params;
    const { vendorId, quantity, unitPrice, expectedDeliveryDate, notes } = req.body;

    if (!vendorId || !quantity || !unitPrice) {
      return res.status(400).json({
        success: false,
        message: 'vendorId, quantity, and unitPrice are required'
      });
    }

    const suggestion = await InventorySuggestion.findOne({
      _id: id,
      organizationId,
    });

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: 'Suggestion not found'
      });
    }

    if (suggestion.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Suggestion has already been processed'
      });
    }

    const purchaseOrder = await poRecommendationService.createPOFromSuggestion(
      id,
      { vendorId, quantity, unitPrice, expectedDeliveryDate, notes },
      req.user?._id
    );

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully from suggestion',
      data: { suggestion, purchaseOrder }
    });
  } catch (error) {
    console.error('Error confirming suggestion:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming suggestion',
      error: error.message
    });
  }
};

// Dismiss Suggestion
exports.dismissSuggestion = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const { id } = req.params;
    const { notes } = req.body;

    const suggestion = await InventorySuggestion.findOne({
      _id: id,
      organizationId,
    });

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: 'Suggestion not found'
      });
    }

    if (suggestion.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Suggestion has already been processed'
      });
    }

    await suggestion.markDismissed(req.user?._id, notes);

    res.json({
      success: true,
      message: 'Suggestion dismissed successfully',
      data: suggestion
    });
  } catch (error) {
    console.error('Error dismissing suggestion:', error);
    res.status(500).json({
      success: false,
      message: 'Error dismissing suggestion',
      error: error.message
    });
  }
};

// Get Vendor Recommendations
exports.getVendorRecommendations = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const { materialId } = req.params;

    const recommendations = await vendorRecommendationService.getRecommendations(
      materialId,
      organizationId
    );

    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Error fetching vendor recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vendor recommendations',
      error: error.message
    });
  }
};

// Get PO Recommendation
exports.getPORecommendation = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const { suggestionId } = req.params;
    const { vendorId } = req.query;

    const suggestion = await InventorySuggestion.findOne({
      _id: suggestionId,
      organizationId,
    });

    if (!suggestion) {
      return res.status(404).json({
        success: false,
        message: 'Suggestion not found'
      });
    }

    const recommendation = await poRecommendationService.generatePORecommendation(
      suggestion,
      vendorId
    );

    res.json({
      success: true,
      data: recommendation
    });
  } catch (error) {
    console.error('Error generating PO recommendation:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating PO recommendation',
      error: error.message
    });
  }
};

const Subscription = require('../models/shared/Subscription');

// Trigger Manual Stock Check
exports.triggerStockCheck = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    // --- SUBSCRIPTION & TOKEN CHECK ---
    const subscription = await Subscription.findOne({ organizationId });
    if (!subscription) {
      return res.status(403).json({ success: false, message: 'No active subscription found.' });
    }

    try {
      await subscription.consumeTokens(
        'aiDemandForecasting',
        1,
        req.user?._id || 'system',
        'Real-time Stock Check (Refresh)',
        'Inventory Analysis Triggered'
      );
    } catch (err) {
      if (err.message === 'Insufficient tokens') {
        return res.status(402).json({
          success: false,
          message: 'You have run out of AI Forecasting tokens.'
        });
      }
      throw err;
    }
    // ----------------------------------

    const suggestionsCreated = await inventoryMonitoringService.checkOrganization(organizationId);

    res.json({
      success: true,
      message: `Stock check completed. ${suggestionsCreated} new suggestions created.`,
      suggestionsCreated
    });
  } catch (error) {
    console.error('Error triggering stock check:', error);
    res.status(500).json({
      success: false,
      message: 'Error triggering stock check',
      error: error.message
    });
  }
};

// Update Reorder Settings for an Item
exports.updateReorderSettings = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const { itemId } = req.params;
    const { minStockLevel, reorderQuantity } = req.body;

    // Validation
    if (minStockLevel !== undefined && (typeof minStockLevel !== 'number' || minStockLevel < 0)) {
      return res.status(400).json({
        success: false,
        message: 'minStockLevel must be a positive number'
      });
    }

    if (reorderQuantity !== undefined && (typeof reorderQuantity !== 'number' || reorderQuantity <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'reorderQuantity must be a positive number'
      });
    }

    // Update the raw material record
    const updateData = {};
    if (minStockLevel !== undefined) updateData.minStockLevel = minStockLevel;
    if (reorderQuantity !== undefined) updateData.reorderQuantity = reorderQuantity;

    const material = await RawMaterial.findOneAndUpdate(
      { _id: itemId, organizationId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found'
      });
    }

    res.json({
      success: true,
      message: 'Reorder settings updated successfully',
      data: material
    });
  } catch (error) {
    console.error('Error updating reorder settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating reorder settings',
      error: error.message
    });
  }
};
