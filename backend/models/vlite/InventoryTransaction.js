const mongoose = require('mongoose');
const { tenantPlugin } = require('./TenantBase');

const inventoryTransactionSchema = new mongoose.Schema({
  transactionType: {
    type: String,
    enum: ['Purchase', 'Issue', 'Return', 'Adjustment', 'Transfer'],
    required: true
  },
  itemName: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, default: 'PCS' },
  referenceNo: { type: String },
  referenceType: { type: String },
  fromLocation: { type: String },
  toLocation: { type: String },
  remarks: { type: String },
  transactionDate: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

inventoryTransactionSchema.plugin(tenantPlugin);

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
