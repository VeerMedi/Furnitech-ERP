const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Organization Schema - Represents each tenant in the multi-tenant system
 * Each organization is completely isolated with its own data and features
 */
const organizationSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
  },

  // Contact Information
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
  },
  phone: {
    type: String,
    trim: true,
  },

  // Address
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
  },

  // Organization Settings
  settings: {
    timezone: {
      type: String,
      default: 'UTC',
    },
    currency: {
      type: String,
      default: 'USD',
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY',
    },
    fiscalYearStart: {
      type: Number,
      min: 1,
      max: 12,
      default: 4, // April
    },
    language: {
      type: String,
      default: 'en',
    },
  },

  // Subscription & Features
  subscriptionPlan: {
    type: String,
    enum: ['TRIAL', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM'],
    default: 'TRIAL',
  },
  subscriptionStatus: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED'],
    default: 'ACTIVE',
  },
  subscriptionStartDate: {
    type: Date,
    default: Date.now,
  },
  subscriptionEndDate: {
    type: Date,
  },

  // Feature Configuration - Which modules this organization can access
  enabledFeatures: [{
    featureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Feature',
      required: true,
    },
    enabledSubFeatures: [{
      type: String, // Sub-feature codes
    }],
    enabledPermissions: [{
      subFeatureCode: String,
      actions: [String], // e.g., ['CREATE', 'READ', 'UPDATE']
    }],
    enabledAt: {
      type: Date,
      default: Date.now,
    },
  }],

  // Organization Admin (Primary Contact)
  adminUser: {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: String,
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false, // Don't return password by default
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
  },

  // Additional Administrators
  secondaryAdmins: [{
    firstName: String,
    lastName: String,
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: String,
    password: {
      type: String,
      minlength: 8,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
  }],

  // Limits & Quotas
  limits: {
    maxUsers: {
      type: Number,
      default: 10,
    },
    maxStorage: {
      type: Number,
      default: 5368709120, // 5 GB in bytes
    },
    currentStorage: {
      type: Number,
      default: 0,
    },
    maxAPICallsPerDay: {
      type: Number,
      default: 10000,
    },
  },

  // Branding (Optional)
  branding: {
    logo: String,
    primaryColor: String,
    secondaryColor: String,
  },

  // Database Configuration for this tenant
  database: {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    connectionString: String, // If using separate database per tenant
  },

  // Status & Metadata
  isActive: {
    type: Boolean,
    default: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verifiedAt: Date,

  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin',
    required: false, // Optional - may not always have super admin context
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin',
    required: false,
  },
  notes: String,

}, {
  timestamps: true,
});

// Indexes for performance
organizationSchema.index({ subscriptionStatus: 1, isActive: 1 });

// Virtual for full admin name
organizationSchema.virtual('adminUser.fullName').get(function () {
  return `${this.adminUser.firstName} ${this.adminUser.lastName}`;
});

// Pre-save middleware to hash admin passwords
organizationSchema.pre('save', async function (next) {
  // 1. Hash Primary Admin Password
  if (this.isModified('adminUser.password')) {
    try {
      const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
      this.adminUser.password = await bcrypt.hash(this.adminUser.password, salt);
    } catch (error) {
      return next(error);
    }
  }

  // 2. Hash Secondary Admin Passwords
  if (this.secondaryAdmins && this.secondaryAdmins.length > 0) {
    for (let i = 0; i < this.secondaryAdmins.length; i++) {
      if (this.isModified(`secondaryAdmins.${i}.password`)) {
        try {
          const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
          this.secondaryAdmins[i].password = await bcrypt.hash(this.secondaryAdmins[i].password, salt);
        } catch (error) {
          return next(error);
        }
      }
    }
  }

  next();
});

// Method to check if organization has a specific feature enabled
organizationSchema.methods.hasFeature = function (featureCode) {
  return this.enabledFeatures.some(ef =>
    ef.featureId && ef.featureId.code === featureCode
  );
};

// Method to check if organization has a specific permission
organizationSchema.methods.hasPermission = function (featureCode, subFeatureCode, action) {
  const feature = this.enabledFeatures.find(ef =>
    ef.featureId && ef.featureId.code === featureCode
  );

  if (!feature) return false;

  const permission = feature.enabledPermissions.find(p =>
    p.subFeatureCode === subFeatureCode
  );

  return permission && permission.actions.includes(action);
};

// Method to compare password for admin login
organizationSchema.methods.compareAdminPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.adminUser.password);
};

// Pre-save middleware to generate database name
organizationSchema.pre('validate', function (next) {
  // Initialize database object if it doesn't exist
  if (!this.database) {
    this.database = {};
  }

  // Generate database name if not provided
  if (!this.database.name) {
    this.database.name = `vlite_${this.slug}_${Date.now()}`;
  }
  next();
});

module.exports = mongoose.model('Organization', organizationSchema);
