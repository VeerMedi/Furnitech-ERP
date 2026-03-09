const mongoose = require('mongoose');
const { tenantPlugin } = require('./TenantBase');

/**
 * Role Schema - Defines roles and their permissions for RBAC
 * FR-106: Security - Permission definitions
 * NFR-101: Role-Based Access Control
 */
const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    trim: true,
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  
  // Permissions mapped to features and actions
  permissions: [{
    module: {
      type: String,
      required: true,
      // e.g., 'MDM', 'CRM', 'INVENTORY', 'PRODUCTION', 'FINANCE'
    },
    subModule: {
      type: String,
      // e.g., 'RAW_MATERIAL', 'CUSTOMER', 'INQUIRY', 'QUOTATION', etc.
    },
    actions: [{
      type: String,
      enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT', 'PRINT'],
    }],
    fieldLevelAccess: [{
      fieldName: String,
      canView: Boolean,
      canEdit: Boolean,
    }],
  }],
  
  // Dashboard access (NFR-104)
  dashboardAccess: {
    defaultDashboard: String,
    allowedWidgets: [String],
  },
  
  // Hierarchy
  level: {
    type: Number,
    default: 0, // Higher number = more authority
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  isSystemRole: {
    type: Boolean,
    default: false, // System roles cannot be deleted
  },
  
}, {
  timestamps: true,
});

// Apply tenant plugin
roleSchema.plugin(tenantPlugin);

// Compound index for unique role code per organization
roleSchema.index({ organizationId: 1, code: 1 }, { unique: true });
roleSchema.index({ organizationId: 1, isActive: 1 });

// Method to check if role has specific permission
roleSchema.methods.hasPermission = function(module, subModule, action) {
  const permission = this.permissions.find(p => 
    p.module === module && (!subModule || p.subModule === subModule)
  );
  
  return permission && permission.actions.includes(action);
};

module.exports = mongoose.model('Role', roleSchema);
