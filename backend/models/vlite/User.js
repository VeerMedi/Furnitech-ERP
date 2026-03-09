const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { tenantPlugin } = require('./TenantBase');

/**
 * User Schema - Organization-specific users with role-based access
 * FR-106: User accounts with security permissions
 * NFR-101: Role-Based Access Control (RBAC)
 */
const userSchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },

  // Authentication
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false,
  },

  // Plain password for admin viewing (stored alongside encrypted password)
  plainPassword: {
    type: String,
    select: false, // Not selected by default for security
  },

  // Employee Information
  employeeId: {
    type: String,
    trim: true,
    sparse: true,
  },
  designation: {
    type: String,
    trim: true,
    // Based on workflow: POC, Sales and Marketing, Design Department, Marketing Director, Accounts
  },
  department: {
    type: String,
    enum: [
      'SALES_MARKETING',      // Step 1, 2, 4: POC, Sales & Marketing
      'DESIGN',               // Step 3, 5: Design Department (Quotation & AutoCAD)
      'MANAGEMENT',           // Project Management, Marketing Director
      'ACCOUNTS',             // Accounts handling, Office accounts
      'PRODUCTION',           // Production team
      'INVENTORY',            // Inventory management
      'QUALITY',              // QC team
      'LOGISTICS',            // Dispatch team
      'HR',                   // HR department
      'IT'                    // IT support
    ],
  },

  // Workflow-specific role
  workflowRole: {
    type: String,
    enum: [
      'POC',                  // First Point of Contact - receives enquiry
      'SALES_EXECUTIVE',      // Customer interaction, follow-ups
      'DESIGN_LEAD',          // Team lead for quotation preparation
      'DESIGNER',             // Design team member
      'MARKETING_DIRECTOR',   // Project management, reviews workflow
      'ACCOUNTS_MANAGER',     // Handles payments and office accounts
      'PRODUCTION_MANAGER',   // Production coordination
      'QC_INSPECTOR',         // Quality control
      'LOGISTICS_HEAD',       // Dispatch and installation
      'ADMIN'                 // Organization admin
    ],
  },

  // Role & Permissions (RBAC)
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
  },

  // Multiple roles support
  roles: [{
    type: String,
    enum: [
      'INQUIRY',
      'SALES_HEAD',
      'QUOTATION_MANAGER',
      'DESIGNER',
      'CNC_OPERATOR',
      'BEAMSAW_KDI',
      'INVENTORY_MANAGER',
      'STOCK_INWARD',
      'PRODUCTION_MANAGER',
      'DISPATCH_INSTALLATION',
      'TEAM_LEAD',
      'ACCOUNTS'
    ]
  }],

  // Additional permissions beyond role
  customPermissions: [{
    module: String,
    subModule: String,
    actions: [String],
  }],

  // Special permissions
  isSystemAdmin: {
    type: Boolean,
    default: false,
  },
  quotationHead: {
    type: Boolean,
    default: false,
  },

  // CRM Stages
  crmStages: {
    type: String,
    trim: true,
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'],
    default: 'ACTIVE',
  },

  // Dashboard Configuration (NFR-104)
  dashboardConfig: {
    widgets: [{
      widgetId: String,
      position: Number,
      size: String,
      settings: mongoose.Schema.Types.Mixed,
    }],
    defaultView: String,
    theme: {
      type: String,
      default: 'light',
    },
  },

  // Email Notification Preferences (FR-550)
  notificationPreferences: {
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    quotationApproval: {
      type: Boolean,
      default: true,
    },
    lowStockAlert: {
      type: Boolean,
      default: true,
    },
    dispatchNotification: {
      type: Boolean,
      default: true,
    },
    advancePayment: {
      type: Boolean,
      default: true,
    },
    predictiveMaintenance: {
      type: Boolean,
      default: true,
    },
  },

  // Session Management
  lastLogin: Date,
  lastActivity: Date,
  sessionToken: String,

  // Password Reset
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  // Profile
  avatar: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
  },

  // Date of Joining
  joinedDate: {
    type: Date,
    default: Date.now,
  },

  // Dashboard Permissions - Controls which dashboards user can access and permission level
  dashboardPermissions: [{
    dashboard: {
      type: String,
      required: true,
      // Dashboard identifiers: 'dashboard', 'customers', 'crm', 'products', 'inquiries', 
      // 'quotations', 'orders', 'drawings', 'machines', 'production', 'transport', 
      // 'vendors', 'management', 'users', 'raw-material', 'inventory-management'
    },
    accessLevel: {
      type: String,
      enum: ['edit', 'view'],
      default: 'view',
      // 'edit' = Full access (Add, Edit, Delete)
      // 'view' = Read-only access (View only, no changes)
    }
  }],

  // Data Source User - For users who should see another user's data
  dataSourceUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // User Role - For role-based user management
  userRole: {
    type: String,
    enum: [
      'POC',
      'Salesman',
      'Head of Sales (HOD)',
      'Design',
      'Design Dept Head',
      'Production',
      'Project Manager',
      'Account Handler',
      'Admin',
      'Steel (Steel Cutting)',
      'Steel (CNC Cutting)',
      'Steel (Bending)',
      'Steel (Welding)',
      'Steel (Finishing)',
      'Steel (Packing)',
      // Wood Production Roles
      'Wood (Beam Saw)',
      'Wood (Edge Bending)',
      'Wood (Profiling)',
      'Wood (Grooming)',
      'Wood (Boring Machine)',
      'Wood (Finishing)',
      'Wood (Packaging)',
    ],
    // No default - must be selected explicitly
  },

  // Login/Logout Tracking
  loginHistory: [{
    loginTime: {
      type: Date,
      required: true,
    },
    logoutTime: Date,
    ipAddress: String,
    userAgent: String,
  }],

  // Last Login Time
  lastLogin: Date,

  // Online Status
  isOnline: {
    type: Boolean,
    default: false,
  },

  // Sidebar Menu Order Preference - User's custom sidebar ordering
  sidebarOrder: {
    type: [String], // Array of menu item paths in custom order
    default: [],
  },

}, {
  timestamps: true,
});

// Apply tenant plugin
userSchema.plugin(tenantPlugin);

// Compound indexes
userSchema.index({ organizationId: 1, employeeId: 1 }, { unique: true, sparse: true });
userSchema.index({ organizationId: 1, isActive: 1, status: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user has specific permission
userSchema.methods.hasPermission = function (module, subModule, action) {
  // Check custom permissions first
  const customPerm = this.customPermissions.find(p =>
    p.module === module && p.subModule === subModule
  );

  if (customPerm && customPerm.actions.includes(action)) {
    return true;
  }

  // Check role permissions (to be populated)
  if (this.role && this.role.permissions) {
    const rolePerm = this.role.permissions.find(p =>
      p.module === module && p.subModule === subModule
    );
    return rolePerm && rolePerm.actions.includes(action);
  }

  return false;
};

module.exports = mongoose.model('User', userSchema);
