const mongoose = require('mongoose');
const { tenantPlugin } = require('./TenantBase');

/**
 * Ledger Schema
 * - Tracks financial records related to a quotation / production order
 */
const paymentRecordSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  method: { type: String, trim: true }, // e.g., BANK_TRANSFER, CASH, CHEQUE, ONLINE
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  referenceType: { type: String },
  status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'], default: 'COMPLETED' },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
}, { _id: true });

const advancePaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  payer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  appliedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  status: { type: String, enum: ['RECEIVED', 'APPLIED', 'REFUNDED'], default: 'RECEIVED' },
  notes: String,
}, { _id: true });

const ledgerSchema = new mongoose.Schema({
  quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  productionOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder' },

  // Monetary summary
  totalAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },

  // Payment history
  payments: [paymentRecordSchema],

  // Advance payments (customer paid before invoice)
  advancePayments: [advancePaymentSchema],

  // AI-driven payment prediction
  aiPaymentPrediction: {
    predictedNextPaymentDate: Date,
    predictedAmount: { type: Number, default: 0 },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    modelVersion: String,
    breakdown: { type: Object, default: {} },
    generatedAt: Date,
  },

  // Cached balance (totalAmount - paid - applied advances)
  balance: { type: Number, default: 0 },

  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
}, { timestamps: true });

// Tenant plugin to add organizationId and audit fields
ledgerSchema.plugin(tenantPlugin);

ledgerSchema.index({ organizationId: 1, quotationId: 1 });
ledgerSchema.index({ organizationId: 1, productionOrderId: 1 });

// Recalculate balance from payments and advances
ledgerSchema.methods.recalculateBalance = function() {
  const totalPaid = (this.payments || []).reduce((sum, p) => {
    if (p && (p.status === 'COMPLETED' || p.status === 'RECEIVED')) return sum + (p.amount || 0);
    return sum;
  }, 0);

  const totalAdvances = (this.advancePayments || []).reduce((sum, a) => {
    if (a && (a.status === 'RECEIVED' || a.status === 'APPLIED')) return sum + (a.amount || 0);
    return sum;
  }, 0);

  const balance = (this.totalAmount || 0) - totalPaid - totalAdvances;
  this.balance = Math.round((balance + Number.EPSILON) * 100) / 100;
  return this.balance;
};

ledgerSchema.methods.addPayment = function(payment) {
  this.payments = this.payments || [];
  this.payments.push(payment);
  this.recalculateBalance();
  return this.save();
};

ledgerSchema.methods.addAdvancePayment = function(advance) {
  this.advancePayments = this.advancePayments || [];
  this.advancePayments.push(advance);
  this.recalculateBalance();
  return this.save();
};

ledgerSchema.methods.applyAdvanceToQuotation = function(advanceId, amountToApply) {
  const adv = (this.advancePayments || []).find(a => String(a._id) === String(advanceId));
  if (!adv) throw new Error('Advance payment not found');
  // Update applied amount (store applied info in notes or status)
  adv.status = 'APPLIED';
  // Optionally track how much applied in breakdown
  adv.appliedAmount = amountToApply;
  this.recalculateBalance();
  return this.save();
};

module.exports = mongoose.model('Ledger', ledgerSchema);
