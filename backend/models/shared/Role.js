const mongoose = require('mongoose');

/**
 * Role Schema (shared)
 * - Defines permissions and role metadata
 */
const permissionSchema = new mongoose.Schema({
  resource: {
    type: String,
    required: true,
    trim: true,
  },
  actions: [{
    type: String,
    trim: true,
  }],
}, { _id: false });

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    trim: true,
    maxlength: 100,
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    unique: true,
  },
  description: {
    type: String,
    trim: true,
  },
  // Permissions are simple resource-action pairs; can be extended as needed
  permissions: [permissionSchema],
  // Scope: whether role is global (across orgs) or tenant-scoped
  scope: {
    type: String,
    enum: ['GLOBAL', 'TENANT'],
    default: 'TENANT',
  },
  // If tenant-scoped, optionally link the organization
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    default: null,
  },
  isSystem: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

roleSchema.index({ code: 1 });
roleSchema.index({ organization: 1 });

// Helper to check permission
roleSchema.methods.can = function (resource, action) {
  const perm = this.permissions.find(p => p.resource === resource);
  if (!perm) return false;
  return perm.actions.includes(action);
};

module.exports = mongoose.model('Role', roleSchema);
