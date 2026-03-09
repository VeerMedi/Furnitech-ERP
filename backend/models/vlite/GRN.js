const mongoose = require('mongoose');
const { tenantPlugin } = require('./TenantBase');

const grnSchema = new mongoose.Schema({
  grnNo: { type: String, required: true, unique: true },
  purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  poNumber: { type: String, required: true },
  supplier: { type: String, required: true },
  receivedDate: { type: Date, default: Date.now },
  items: [{
    itemName: String,
    orderedQty: Number,
    receivedQty: Number,
    acceptedQty: Number,
    rejectedQty: Number,
    unit: String,
    remarks: String
  }],
  status: {
    type: String,
    enum: ['Pending', 'Partial', 'Completed'],
    default: 'Pending'
  },
  totalAmount: { type: Number, default: 0 },
  remarks: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

grnSchema.plugin(tenantPlugin);

module.exports = mongoose.model('GRN', grnSchema);
