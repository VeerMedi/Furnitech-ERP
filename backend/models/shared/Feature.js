const mongoose = require('mongoose');

/**
 * Feature Schema - Defines all available system features/modules
 * This is used by super admin to enable/disable features per organization
 */
const featureSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    // e.g., 'MDM', 'CRM', 'INVENTORY', 'PRODUCTION', 'FINANCE', 'AI_ANALYTICS'
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['CORE', 'ADVANCED', 'AI', 'INTEGRATION', 'CUSTOM'],
    default: 'CORE',
  },
  subFeatures: [{
    code: {
      type: String,
      required: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    permissions: [{
      action: {
        type: String,
        enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT'],
      },
      description: String,
    }],
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  icon: String,
  displayOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index for faster queries
featureSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('Feature', featureSchema);
