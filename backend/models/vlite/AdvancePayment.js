const mongoose = require('mongoose');

const advancePaymentSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  paymentMethod: { 
    type: String, 
    enum: ['CASH', 'BANK_TRANSFER', 'CHECK', 'CREDIT_CARD', 'ONLINE'],
    required: true 
  },
  referenceNumber: { type: String }, // Check number, transaction ID
  paymentDate: { type: Date, default: Date.now },
  receiptUrl: { type: String }, // URL to uploaded receipt
  status: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'REJECTED', 'REFUNDED'],
    default: 'PENDING'
  },
  reconciled: { type: Boolean, default: false },
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('AdvancePayment', advancePaymentSchema);
