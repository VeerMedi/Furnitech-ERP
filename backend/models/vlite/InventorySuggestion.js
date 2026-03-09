const mongoose = require('mongoose');
const { tenantPlugin } = require('./TenantBase');

/**
 * Inventory Suggestion Schema
 * Tracks AI-generated suggestions for low stock materials
 */
const inventorySuggestionSchema = new mongoose.Schema({
  suggestionId: {
    type: String,
    unique: true,
    trim: true,
  },

  // Material Information
  rawMaterial: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RawMaterial',
    required: true,
  },
  materialName: {
    type: String,
    required: true,
  },
  materialCode: {
    type: String,
  },
  category: {
    type: String,
  },

  // Stock Information
  currentStock: {
    type: Number,
    required: true,
  },
  minThreshold: {
    type: Number,
    required: true,
  },
  reorderPoint: {
    type: Number,
  },
  suggestedQuantity: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    default: 'units',
  },

  // Suggestion Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'dismissed', 'expired'],
    default: 'pending',
  },

  // Priority Level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },

  // AI-Generated Message
  message: {
    type: String,
    required: true,
  },

  // Metadata
  metadata: {
    detectedAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
    },
    stockPercentage: {
      type: Number,
    },
  },

  // Recommended Vendors
  recommendedVendors: [{
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    vendorName: String,
    lastPrice: Number,
    avgDeliveryTime: Number,
    rating: Number,
    isPreferred: Boolean,
    totalOrders: Number,
  }],

  // User Action
  userAction: {
    actionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    actionAt: Date,
    notes: String,
  },

  // Created Purchase Order (if confirmed)
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
  },

  // Expiration (suggestions expire after 7 days if not acted upon)
  expiresAt: {
    type: Date,
  },

}, {
  timestamps: true,
});

// Apply tenant plugin
inventorySuggestionSchema.plugin(tenantPlugin);

// Indexes
inventorySuggestionSchema.index({ organizationId: 1, status: 1 });
inventorySuggestionSchema.index({ organizationId: 1, rawMaterial: 1, status: 1 });
inventorySuggestionSchema.index({ suggestionId: 1 }, { unique: true });
inventorySuggestionSchema.index({ expiresAt: 1 }); // For expiration cleanup

// Auto-generate suggestion ID
inventorySuggestionSchema.pre('save', async function (next) {
  if (!this.suggestionId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.suggestionId = `SUG-${timestamp}-${random}`;
  }

  // Set expiration date (7 days from now)
  if (!this.expiresAt) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    this.expiresAt = expiryDate;
  }

  next();
});

// Method to check if suggestion is expired
inventorySuggestionSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

// Method to mark as confirmed
inventorySuggestionSchema.methods.markConfirmed = function (userId, poId, notes = '') {
  this.status = 'confirmed';
  this.userAction = {
    actionBy: userId,
    actionAt: new Date(),
    notes: notes,
  };
  this.purchaseOrder = poId;
  return this.save();
};

// Method to mark as dismissed
inventorySuggestionSchema.methods.markDismissed = function (userId, notes = '') {
  this.status = 'dismissed';
  this.userAction = {
    actionBy: userId,
    actionAt: new Date(),
    notes: notes,
  };
  return this.save();
};

// Static method to expire old suggestions
inventorySuggestionSchema.statics.expireOldSuggestions = async function () {
  const now = new Date();
  const result = await this.updateMany(
    {
      status: 'pending',
      expiresAt: { $lt: now },
    },
    {
      $set: { status: 'expired' },
    }
  );
  return result.modifiedCount;
};

module.exports = mongoose.model('InventorySuggestion', inventorySuggestionSchema);
