const mongoose = require('mongoose');
const { tenantPlugin } = require('./TenantBase');

const inventoryStockSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  category: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  totalStock: { type: Number, default: 0 },
  blockedStock: { type: Number, default: 0 },
  availableStock: { type: Number, default: 0 },
  upcomingStock: { type: Number, default: 0 },
  issued: { type: Number, default: 0 },
  returned: { type: Number, default: 0 },
  unit: { type: String, default: 'PCS' },
  reorderLevel: { type: Number, default: 10 },
  location: { type: String },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

inventoryStockSchema.plugin(tenantPlugin);

module.exports = mongoose.model('InventoryStock', inventoryStockSchema);
