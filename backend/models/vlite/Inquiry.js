const mongoose = require('mongoose');

/**
 * Inquiry Schema
 * - Represents a structured request from a Lead or Customer for pricing/specs
 * - One Lead can create one or more Inquiries
 */
const inquiryItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  description: String,
  quantity: { type: Number, default: 1 },
  unit: String,
  requiredBy: Date,
  meta: { type: Object, default: {} },
}, { _id: false });

const inquirySchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  companyName: { type: String, trim: true },
  customerId: { type: String, trim: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referenceId: { type: String, index: true },
  status: {
    type: String,
    enum: ['OPEN', 'REQUESTED', 'RESPONDED', 'CLOSED', 'CANCELLED'],
    default: 'OPEN',
  },
  items: [inquiryItemSchema],
  notes: String,
  attachments: [String],
  // Aggregated estimate (optional) - used until a quotation is created
  estimatedTotal: { type: Number, default: 0 },

  // Lead Platform - source of inquiry
  leadPlatform: {
    type: String,
    enum: ['Website', 'Instagram', 'Facebook', 'WhatsApp', 'Google Ads', 'Meta Ads', 'SEO', 'Referral', 'Walk-in', 'Phone Call', 'Email', 'Google Sheets', 'Other'],
    default: 'Website'
  },

  // Lead Status - tracking lead lifecycle
  leadStatus: {
    type: String,
    enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED', 'LOST'],
    default: 'NEW'
  },

  // Probability - deal closing probability (0-100)
  probability: {
    type: Number,
    min: 0,
    max: 100,
    default: 20
  },

  // Priority - inquiry priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },

  // Additional metadata for form fields
  meta: { type: Object, default: {} },

  // AI-assisted fields
  ai: {
    // Validation result (e.g., drawing/spec checks)
    validation: {
      passed: { type: Boolean, default: true },
      issues: [{ type: String }],
    },
    // Suggested prices per item (productId -> suggested unit price)
    suggestedPrices: { type: Object, default: {} },
    // Confidence of AI suggestions
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    lastEvaluatedAt: Date,
  },

  // Link to generated quotation (if any)
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },

  // POC Assignment - track which salesman is assigned
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: Date,
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Assignment Status - track if currently assigned or unassigned
  assignmentStatus: {
    type: String,
    enum: ['assigned', 'unassigned'],
    default: null
  },
  unassignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  unassignedAt: Date,

  // Onboarding tracking
  isOnboarded: { type: Boolean, default: false },
  onboardedAt: Date,
  onboardedCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  onboardedCustomerCode: String,
}, { timestamps: true });

inquirySchema.index({ organization: 1, status: 1 });

module.exports = mongoose.model('Inquiry', inquirySchema);
