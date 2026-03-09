const mongoose = require('mongoose');

/**
 * Base Schema for all tenant-specific models
 * All Vlite models will extend this to ensure tenant isolation
 */
const tenantBaseSchema = {
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
};

/**
 * Plugin to automatically add tenant context to queries
 */
const tenantPlugin = function(schema) {
  // Add tenant base fields
  schema.add(tenantBaseSchema);
  
  // Add pre-save hook to ensure organizationId is set
  schema.pre('save', function(next) {
    if (!this.organizationId && this.constructor.currentOrganizationId) {
      this.organizationId = this.constructor.currentOrganizationId;
    }
    next();
  });
  
  // Add indexes for common queries
  schema.index({ organizationId: 1, isDeleted: 1 });
  schema.index({ organizationId: 1, createdAt: -1 });
};

module.exports = { tenantBaseSchema, tenantPlugin };
