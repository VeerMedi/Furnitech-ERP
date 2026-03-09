const mongoose = require('mongoose');

/**
 * Lead Schema
 * - Represents a potential opportunity
 * - Can be converted to an Inquiry (one-to-one conversion)
 */
const leadSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  source: { type: String }, // e.g., WEBSITE, REFERRAL, CAMPAIGN
  contact: {
    name: String,
    email: { type: String, lowercase: true, trim: true },
    phone: String,
  },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED', 'LOST'],
    default: 'NEW',
  },
  estimatedValue: { type: Number, default: 0 },
  probability: { type: Number, min: 0, max: 100 },
  tags: [String],
  notes: String,

  // AI-assisted fields
  ai: {
    // Score between 0 (unlikely) and 1 (very likely)
    score: { type: Number, min: 0, max: 1, default: 0 },
    // Raw features used by the model for debugging/audit
    features: { type: Object, default: {} },
    // When the lead was last scored
    lastScoredAt: Date,
    // Suggested qualification by AI: AUTO_QUALIFIED | AUTO_DISQUALIFIED | NONE
    autoQualification: {
      type: String,
      enum: ['AUTO_QUALIFIED', 'AUTO_DISQUALIFIED', 'NONE'],
      default: 'NONE',
    },
    // If AI suggested an auto-quotation, store reference to a generated quotation draft id
    autoQuotationDraft: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  },

  // Link to converted Inquiry (if converted)
  convertedToInquiry: { type: mongoose.Schema.Types.ObjectId, ref: 'Inquiry' },
}, { timestamps: true });

leadSchema.index({ organization: 1, status: 1 });

module.exports = mongoose.model('Lead', leadSchema);
