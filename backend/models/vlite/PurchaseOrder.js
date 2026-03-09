const mongoose = require('mongoose');
const { tenantPlugin } = require('./TenantBase');

/**
 * PurchaseOrder Schema
 * - Tracks purchase orders to vendors for replenishment
 */
const poItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  description: String,
  quantity: { type: Number, required: true, min: 0 },
  receivedQuantity: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  expectedDeliveryDate: Date,
  tax: { type: Number, default: 0 },
  meta: { type: Object, default: {} },
}, { _id: false });

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: { type: String, required: true, trim: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  items: [poItemSchema],
  currency: { type: String, default: 'USD' },

  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
    default: 'DRAFT',
  },

  totalValue: { type: Number, default: 0 },
  placedAt: Date,
  receivedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  notes: String,
}, { timestamps: true });

// Apply tenant plugin (adds organizationId if not set and common fields)
purchaseOrderSchema.plugin(tenantPlugin);

purchaseOrderSchema.index({ organizationId: 1, poNumber: 1 }, { unique: true });

purchaseOrderSchema.methods.recalculateTotal = function() {
  const total = (this.items || []).reduce((sum, it) => sum + ((it.unitPrice || 0) * (it.quantity || 0) + (it.tax || 0)), 0);
  this.totalValue = total;
  return total;
};

purchaseOrderSchema.methods.markOrdered = function() {
  this.status = 'ORDERED';
  this.placedAt = new Date();
  return this.save();
};

purchaseOrderSchema.methods.receiveItem = async function(productId, qtyReceived) {
  const item = (this.items || []).find(i => String(i.product) === String(productId));
  if (!item) throw new Error('Item not found in PO');
  item.receivedQuantity = (item.receivedQuantity || 0) + qtyReceived;

  // Update PO status
  const allReceived = this.items.every(i => (i.receivedQuantity || 0) >= (i.quantity || 0));
  this.status = allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
  this.receivedAt = new Date();

  await this.save();
  return item;
};

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
