const mongoose = require('mongoose');
const { tenantPlugin } = require('./TenantBase');

/**
 * Customer Schema
 * Complete customer management with addresses, contacts, and category-specific data
 */

// Address Sub-Schema
const addressSchema = new mongoose.Schema({
  address: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  pincode: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    trim: true,
    default: 'India',
  },
}, { _id: true });

// Contact Person Sub-Schema
const contactPersonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  designation: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
  },
  mobile: {
    type: String,
    trim: true,
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

// Email Sub-Schema
const emailSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['Primary', 'Accounts', 'Purchase', 'Sales', 'Other'],
    default: 'Other',
  },
}, { _id: true });

// Phone Number Sub-Schema
const phoneSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['Office', 'Mobile', 'Alternate', 'Fax', 'Other'],
    default: 'Other',
  },
}, { _id: true });

// Category Details Sub-Schema (for Panel, Laminate, Edgeband, Hardware, Glass, Fabric, Aluminium)
const categoryDetailsSchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    default: false,
  },
  discount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  creditLimit: {
    type: Number,
    min: 0,
    default: 0,
  },
  paymentTerms: {
    type: String,
    trim: true,
  },
  preferredBrands: [{
    type: String,
    trim: true,
  }],
  notes: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Service Category Sub-Schema
const serviceCategorySchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    default: false,
  },
  discount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  creditLimit: {
    type: Number,
    min: 0,
    default: 0,
  },
  paymentTerms: {
    type: String,
    trim: true,
  },
  serviceTypes: [{
    type: String,
    trim: true,
  }],
  notes: {
    type: String,
    trim: true,
  },
}, { _id: false });

// Main Customer Schema
const customerSchema = new mongoose.Schema({
  // Basic Information
  customerCode: {
    type: String,
    required: [true, 'Customer code is required'],
    unique: true,
    trim: true,
    uppercase: true,
  },
  firstName: {
    type: String,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  alternatePhone: {
    type: String,
    trim: true,
  },
  companyName: {
    type: String,
    required: false,
    trim: true,
  },
  companyType: {
    type: String,
    enum: [
      'FURNITURE_MANUFACTURING',
      'INTERIOR_DESIGN',
      'DESIGN',
      'ARCHITECTURE',
      'CONSTRUCTION',
      'REAL_ESTATE',
      'HOSPITALITY',
      'RETAIL',
      'OFFICE_FURNITURE',
      'HOME_DECOR',
      'WHOLESALE',
      'INDIVIDUAL',
      'OTHER'
    ],
    trim: true,
  },
  address: {
    street: String,
    area: String,
    city: String,
    state: String,
    zipCode: String
  },
  source: {
    type: String,
    trim: true,
  },

  // Legacy/Full Structure Fields (kept for compatibility)
  tradeName: {
    type: String,
    trim: true,
  },
  customerType: {
    type: String,
    enum: ['Dealer', 'Distributor', 'Retailer', 'End Customer', 'Contractor', 'INDIVIDUAL', 'BUSINESS', 'DEALER', 'BUILDER', 'ARCHITECT'],
    required: false,
    default: 'Dealer',
  },
  productType: {
    type: String,
    enum: ['STEEL', 'WOOD', null],
    default: null,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended', 'ACTIVE', 'INACTIVE'],
    default: 'Active',
  },
  registrationDate: {
    type: Date,
    default: Date.now,
  },
  creditLimit: {
    type: Number,
    min: 0,
    default: 0,
  },
  creditDays: {
    type: Number,
    min: 0,
    default: 30,
  },
  website: {
    type: String,
    trim: true,
  },

  // GST & PAN Information
  gstNumber: {
    type: String,
    trim: true,
    uppercase: true,
    validate: {
      validator: function (v) {
        // Allow null, undefined, empty string
        if (!v) return true;
        if (typeof v === 'string' && v.length === 0) return true;
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
      },
      message: 'Please enter a valid GST number'
    },
  },
  panNumber: {
    type: String,
    trim: true,
    uppercase: true,
    validate: {
      validator: function (v) {
        // Allow null, undefined, empty string
        if (!v) return true;
        if (typeof v === 'string' && v.length === 0) return true;
        return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
      },
      message: 'Please enter a valid PAN number'
    },
  },
  gstType: {
    type: String,
    enum: ['Regular', 'Composition', 'Unregistered'],
    default: 'Regular',
  },
  registeredState: {
    type: String,
    trim: true,
  },

  // Customer source
  source: {
    type: String,
    trim: true,
  },

  // Addresses
  billingAddress: addressSchema,
  officeAddress: addressSchema,
  workAddress: addressSchema,

  // Contact Information
  emails: [emailSchema],
  phoneNumbers: [phoneSchema],

  // Contact Persons
  contactPersons: [contactPersonSchema],

  // Product Categories with specific details
  categories: {
    panel: categoryDetailsSchema,
    laminate: categoryDetailsSchema,
    edgeband: categoryDetailsSchema,
    hardware: categoryDetailsSchema,
    glass: categoryDetailsSchema,
    fabric: categoryDetailsSchema,
    aluminium: categoryDetailsSchema,
    service: serviceCategorySchema,
  },

  // Metadata
  totalOrders: {
    type: Number,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
  lastOrderDate: {
    type: Date,
  },
  outstandingAmount: {
    type: Number,
    default: 0,
  },

  // Additional Notes
  remarks: {
    type: String,
    trim: true,
  },

  // Advance Payment Status
  advancePaymentStatus: {
    type: String,
    enum: ['Not Paid', 'Partial', 'Paid', 'N/A'],
    default: 'N/A',
    trim: true,
  },

  // Advance Payment Amount
  advancePaymentAmount: {
    type: Number,
    min: 0,
    default: 0,
  },

  // Inquiry Reference (for customers onboarded from inquiries)
  fromInquiry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inquiry',
    required: false,
  },

  // Designated Designer (for Drawing Dashboard assignment)
  assignedDesigner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Apply tenant plugin
tenantPlugin(customerSchema);

// Indexes
customerSchema.index({ organizationId: 1, customerCode: 1 }, { unique: true });
customerSchema.index({ organizationId: 1, companyName: 1 });
customerSchema.index({ organizationId: 1, status: 1 });
customerSchema.index({ organizationId: 1, customerType: 1 });
customerSchema.index({ 'emails.email': 1 });
customerSchema.index({ gstNumber: 1 });
customerSchema.index({ panNumber: 1 });

// Virtual for full company display name
customerSchema.virtual('displayName').get(function () {
  return this.tradeName || this.companyName;
});

// Virtual for primary contact person
customerSchema.virtual('primaryContact').get(function () {
  if (!this.contactPersons || this.contactPersons.length === 0) return null;
  return this.contactPersons.find(contact => contact.isPrimary) || this.contactPersons[0];
});

// Virtual for primary email
customerSchema.virtual('primaryEmail').get(function () {
  if (!this.emails || this.emails.length === 0) return null;
  const primaryEmail = this.emails.find(email => email.type === 'Primary');
  return primaryEmail ? primaryEmail.email : (this.emails[0] ? this.emails[0].email : null);
});

// Pre-save middleware to ensure only one primary contact
customerSchema.pre('save', function (next) {
  if (this.contactPersons && this.contactPersons.length > 0) {
    const primaryContacts = this.contactPersons.filter(contact => contact.isPrimary);
    if (primaryContacts.length > 1) {
      // Keep only the first primary contact
      let foundPrimary = false;
      this.contactPersons.forEach(contact => {
        if (contact.isPrimary) {
          if (foundPrimary) {
            contact.isPrimary = false;
          } else {
            foundPrimary = true;
          }
        }
      });
    } else if (primaryContacts.length === 0 && this.contactPersons.length > 0) {
      // Set first contact as primary if none is set
      this.contactPersons[0].isPrimary = true;
    }
  }
  next();
});

// Static method to generate customer code
customerSchema.statics.generateCustomerCode = async function (organizationId) {
  const year = new Date().getFullYear();
  const prefix = `CUST-${year}-`;

  // Find the last customer code for this year and organization
  const lastCustomer = await this.findOne({
    organizationId,
    customerCode: new RegExp(`^${prefix}`)
  }).sort({ customerCode: -1 });

  let sequence = 1;
  if (lastCustomer) {
    const lastSequence = parseInt(lastCustomer.customerCode.split('-').pop());
    sequence = lastSequence + 1;
  }

  return `${prefix}${String(sequence).padStart(3, '0')}`;
};

// Instance method to check credit availability
customerSchema.methods.hasCreditAvailable = function (amount) {
  const availableCredit = this.creditLimit - this.outstandingAmount;
  return availableCredit >= amount;
};

// Instance method to get enabled categories
customerSchema.methods.getEnabledCategories = function () {
  const enabled = [];
  Object.keys(this.categories).forEach(key => {
    if (this.categories[key] && this.categories[key].enabled) {
      enabled.push(key);
    }
  });
  return enabled;
};

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
