const mongoose = require('mongoose');
const { tenantPlugin } = require('./TenantBase');

const purchaseIndentSchema = new mongoose.Schema({
  indentNo: { type: String, required: true, unique: true },
  customer: { type: String, required: true },
  orderName: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  indentDate: { type: Date },
  requirementDate: { type: Date },
  poDate: { type: Date },
  expectedDeliveryDate: { type: Date },
  poStatus: { 
    type: String, 
    enum: ['Draft', 'Pending', 'Approved', 'Rejected', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  items: [{
    itemName: String,
    category: String,
    quantity: Number,
    unit: String,
    rate: Number,
    remarks: String
  }],
  totalAmount: { type: Number, default: 0 },
  remarks: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

purchaseIndentSchema.plugin(tenantPlugin);

module.exports = mongoose.model('PurchaseIndent', purchaseIndentSchema);
