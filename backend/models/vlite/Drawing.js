const mongoose = require('mongoose');



const drawingSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  drawingUrl: {
    type: String,
    required: [true, 'Drawing file URL is required'],
    trim: true,
  },
  fileName: { type: String, trim: true },
  fileType: { type: String, trim: true },
  fileSize: { type: Number }, // bytes

  // Customer and SPOC assignment
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }, // SPOC

  // Link to quotation or order
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },

  // Drawing Dashboard Fields
  salesmanName: { type: String, trim: true },
  autocadPrepared: { type: Boolean, default: false },
  autocadPreparationNotes: String,
  additionalFiles: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    uploadedAt: { type: Date, default: Date.now }
  }],

  // Designer information (user who uploaded or designed)
  designer: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },

  // Organization/tenant reference
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },

  // AI validation report
  ai: {
    validated: { type: Boolean, default: false },
    passed: { type: Boolean, default: false },
    issues: [{ type: String }],
    score: { type: Number, min: 0, max: 1 },
    reportUrl: { type: String },
    details: { type: Object, default: {} },
    evaluatedAt: Date,
  },

  // Approval workflow
  approvalStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES'],
    default: 'PENDING',
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectionReason: String,

  // Production readiness (set when salesman approves all)
  productionReady: {
    type: Boolean,
    default: false,
  },
  markedProductionReadyAt: Date,
  markedProductionReadyBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Client approval workflow (email-based approval)
  clientApprovalStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'EXPIRED'],
    default: 'PENDING',
  },
  clientApprovedAt: Date,
  clientApprovalToken: String,
  clientApprovalTokenExpiry: Date,
  clientApprovalEmailSentAt: Date,

  // Versioning / revisions
  revision: { type: Number, default: 1 },
  previousVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'Drawing' },

  notes: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Indexes
drawingSchema.index({ organization: 1, quotation: 1 });

// Helper methods
drawingSchema.methods.markApproved = function (userId) {
  this.approvalStatus = 'APPROVED';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return this.save();
};

drawingSchema.methods.markRejected = function (userId, reason) {
  this.approvalStatus = 'REJECTED';
  this.approvedBy = userId;
  this.rejectionReason = reason;
  this.approvedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Drawing', drawingSchema);
