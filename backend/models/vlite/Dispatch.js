const mongoose = require('mongoose');
const { tenantPlugin } = require('./TenantBase');

/**
 * Dispatch Schema
 * - Tracks dispatch of production orders to customer sites
 */
const materialCheckSchema = new mongoose.Schema({
  materialId: { type: mongoose.Schema.Types.ObjectId }, // could reference InventoryItem or RawMaterial
  name: { type: String, trim: true },
  quantityChecked: { type: Number, default: 0 },
  condition: { type: String, enum: ['OK', 'DAMAGED', 'MISSING', 'UNKNOWN'], default: 'OK' },
  notes: String,
}, { _id: false });

const dispatchSchema = new mongoose.Schema({
  productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder', required: true },
  // Materials checked before dispatch
  materialsChecked: [materialCheckSchema],

  // When the dispatch was created/sent
  dispatchDate: { type: Date, default: Date.now },

  // Delivery details
  carrier: String,
  trackingNumber: String,
  vehicleNumber: String,
  estimatedArrival: Date,

  // Installation status at the site
  siteInstallationStatus: {
    type: String,
    enum: ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'INSTALLED', 'FAILED', 'CANCELLED'],
    default: 'PENDING',
  },
  installationNotes: String,
  installedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // AI-driven customer notification status (e.g., sent by AI notification service)
  aiCustomerNotification: {
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'DELIVERED', 'FAILED'],
      default: 'PENDING',
    },
    lastAttemptAt: Date,
    attempts: { type: Number, default: 0 },
    providerResponse: { type: Object, default: {} },
  },

  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
}, { timestamps: true });

// Apply tenant plugin to ensure organizationId and audit fields
dispatchSchema.plugin(tenantPlugin);

dispatchSchema.index({ organizationId: 1, productionOrder: 1 });

// Helper to mark installation status
dispatchSchema.methods.updateInstallationStatus = function(status, opts = {}) {
  this.siteInstallationStatus = status;
  if (opts.notes) this.installationNotes = opts.notes;
  if (opts.installedBy) this.installedBy = opts.installedBy;
  return this.save();
};

// Helper to record a customer notification attempt (AI)
dispatchSchema.methods.recordNotificationAttempt = function(result = {}) {
  this.aiCustomerNotification.attempts = (this.aiCustomerNotification.attempts || 0) + 1;
  this.aiCustomerNotification.lastAttemptAt = new Date();
  if (result.status) this.aiCustomerNotification.status = result.status;
  if (result.response) this.aiCustomerNotification.providerResponse = result.response;
  return this.save();
};

module.exports = mongoose.model('Dispatch', dispatchSchema);
