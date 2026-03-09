const mongoose = require('mongoose');
const { tenantPlugin } = require('./TenantBase');

/**
 * InventoryItem Schema
 * - Tracks stock levels per product/SKU per tenant
 * - Includes AI forecasting fields (`aiForecast`)
 */
const movementSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['IN', 'OUT', 'ADJUSTMENT', 'RESERVE', 'RELEASE'],
    required: true,
  },
  quantity: { type: Number, required: true },
  reference: { type: mongoose.Schema.Types.ObjectId }, // e.g., PurchaseOrder, ProductionOrder
  referenceType: { type: String },
  note: String,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedAt: { type: Date, default: Date.now },
}, { _id: false });

const inventoryItemSchema = new mongoose.Schema({
  itemCode: { type: String, trim: true },
  sku: { type: String, trim: true, index: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  description: { type: String },

  // Location within warehouse/plant
  warehouse: {
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    bin: { type: String },
  },

  // Quantities
  quantityOnHand: { type: Number, default: 0 },
  reservedQuantity: { type: Number, default: 0 },
  damagedQuantity: { type: Number, default: 0 },

  // Reorder and procurement
  reorderLevel: { type: Number, default: 0 },
  reorderQuantity: { type: Number, default: 0 },
  preferredVendors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],

  // Costs
  unitCost: { type: Number, default: 0 },
  lastPurchasePrice: { type: Number, default: 0 },
  averageCost: { type: Number, default: 0 },

  // Movements history (lightweight)
  movements: [movementSchema],

  // AI forecasting for demand / replenishment
  aiForecast: {
    // Predicted demand grouped by period (e.g., { '2025-12': 120 })
    predictedDemand: { type: Object, default: {} },
    // Forecasted aggregate quantity for the configured horizon
    forecastedQty: { type: Number, default: 0 },
    // Confidence score 0..1
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    // Forecast horizon in days
    horizonDays: { type: Number, default: 30 },
    // Model metadata / version
    modelVersion: { type: String },
    generatedAt: Date,
    notes: String,
  },

  tags: [String],
  notes: String,
}, { timestamps: true });

// Apply tenant plugin for organizationId, audit fields
inventoryItemSchema.plugin(tenantPlugin);

// Virtual available quantity
inventoryItemSchema.virtual('availableQuantity').get(function() {
  return (this.quantityOnHand || 0) - (this.reservedQuantity || 0) - (this.damagedQuantity || 0);
});

// Helpers
inventoryItemSchema.methods.reserve = function(qty, opts = {}) {
  const n = Math.max(0, qty || 0);
  this.reservedQuantity = (this.reservedQuantity || 0) + n;
  this.movements = this.movements || [];
  this.movements.push({ type: 'RESERVE', quantity: n, reference: opts.reference, referenceType: opts.referenceType, note: opts.note, performedBy: opts.user });
  return this.save();
};

inventoryItemSchema.methods.release = function(qty, opts = {}) {
  const n = Math.max(0, qty || 0);
  this.reservedQuantity = Math.max(0, (this.reservedQuantity || 0) - n);
  this.movements = this.movements || [];
  this.movements.push({ type: 'RELEASE', quantity: n, reference: opts.reference, referenceType: opts.referenceType, note: opts.note, performedBy: opts.user });
  return this.save();
};

inventoryItemSchema.methods.adjust = function(delta, opts = {}) {
  // delta may be positive or negative
  this.quantityOnHand = (this.quantityOnHand || 0) + delta;
  const type = delta >= 0 ? 'IN' : 'OUT';
  this.movements = this.movements || [];
  this.movements.push({ type, quantity: Math.abs(delta), reference: opts.reference, referenceType: opts.referenceType, note: opts.note, performedBy: opts.user });
  return this.save();
};

inventoryItemSchema.index({ organizationId: 1, sku: 1 });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
