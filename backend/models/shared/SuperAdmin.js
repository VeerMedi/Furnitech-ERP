const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Super Admin Schema - System administrators who manage all organizations
 * These users have full control over the multi-tenant system
 */
const superAdminSchema = new mongoose.Schema({
  // Basic Information
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
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
  },
  
  // Authentication
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false, // Don't return password by default
  },
  
  // Contact
  phone: {
    type: String,
    trim: true,
  },
  
  // Role & Permissions
  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'SUPPORT_ADMIN'],
    default: 'SUPER_ADMIN',
  },
  
  // Permissions for granular control
  permissions: {
    canCreateOrganization: {
      type: Boolean,
      default: true,
    },
    canDeleteOrganization: {
      type: Boolean,
      default: true,
    },
    canManageFeatures: {
      type: Boolean,
      default: true,
    },
    canViewAllOrganizations: {
      type: Boolean,
      default: true,
    },
    canManageAdmins: {
      type: Boolean,
      default: true,
    },
    canAccessSystemSettings: {
      type: Boolean,
      default: true,
    },
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  
  // Session Management
  lastLogin: {
    type: Date,
  },
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
  },
  
  // Password Reset
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  // Two-Factor Authentication (Optional)
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: String,
  
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin',
  },
  
}, {
  timestamps: true,
});

// Indexes
superAdminSchema.index({ isActive: 1 });

// Virtual for full name
superAdminSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password
superAdminSchema.pre('save', async function(next) {
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
superAdminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
superAdminSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Increment login attempts
superAdminSchema.methods.incLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  // Otherwise we're incrementing
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock the account after 5 failed attempts for 2 hours
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
superAdminSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
