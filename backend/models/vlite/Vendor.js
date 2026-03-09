const mongoose = require('mongoose');
const { tenantPlugin } = require('./TenantBase');

/**
 * Purchase History Sub-Schema
 */
const purchaseHistorySchema = new mongoose.Schema({
  purchaseDate: {
    type: Date,
    required: true,
  },
  itemName: {
    type: String,
    required: true,
  },
  // Material Specifications
  brand: {
    type: String,
    trim: true,
  },
  finish: {
    type: String,
    trim: true,
  },
  thickness: {
    type: String,
    trim: true,
  },
  materialName: {
    type: String,
    trim: true,
  },
  length: {
    type: String,
    trim: true,
  },
  width: {
    type: String,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  amountPaid: {
    type: Number,
    default: 0,
  },
  balance: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Paid', 'Partial', 'Pending'],
    default: 'Pending',
  },
}, { _id: true });

/**
 * Vendor Schema
 * FR-302: Vendor management for purchases
 */
const vendorSchema = new mongoose.Schema({
  // Frontend Compatible Fields
  vendorId: {
    type: String,
    required: true,
    trim: true,
  },
  vendorName: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true,
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
  },
  altContactNumber: String,
  
  // Address
  address: String,
  city: String,
  state: String,
  pincode: String,
  
  // Business Details
  gstNumber: {
    type: String,
    trim: true,
    uppercase: true,
  },
  
  // Status Fields
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
  paymentStatus: {
    type: String,
    enum: ['Done', 'Half', 'Pending', 'On Hold', 'Overdue'],
    default: 'Pending',
  },
  
  // Financial Fields
  totalAmount: {
    type: Number,
    default: 0,
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  balance: {
    type: Number,
    default: 0,
  },
  
  // Purchase History
  purchaseHistory: [purchaseHistorySchema],
  
  // Legacy Backend Fields (for compatibility)
  vendorCode: String,
  companyName: String,
  
  // Contact Person
  contactPerson: {
    firstName: String,
    lastName: String,
    designation: String,
  },
  
  phone: String,
  alternatePhone: String,
  website: String,
  
  // Address (Legacy)
  addressLegacy: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
  },
  
  panNumber: {
    type: String,
    trim: true,
    uppercase: true,
  },
  
  // Categories
  suppliedMaterials: [{
    type: String,
    enum: [
      'PANEL',
      'LAMINATE',
      'EDGEBAND',
      'HARDWARE',
      'GLASS',
      'FABRIC',
      'ALUMINIUM',
      'PROCESSED_PANEL',
      'HANDLES',
      'HINGES',
      'SLIDES',
      'ADHESIVE',
      'FINISHING',
      'PACKAGING',
      'OTHER'
    ],
  }],
  
  // Payment Terms
  paymentTerms: {
    creditDays: {
      type: Number,
      default: 0,
    },
    paymentMode: String,
  },
  
  // Bank Details
  bankDetails: {
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
  },
  
  // Rating & Performance
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  performance: {
    totalOrders: {
      type: Number,
      default: 0,
    },
    totalPurchaseValue: {
      type: Number,
      default: 0,
    },
    onTimeDeliveryRate: Number,
    qualityRating: Number,
  },
  
  // Notes
  notes: String,
  tags: [String],
  
}, {
  timestamps: true,
});

// Apply tenant plugin
vendorSchema.plugin(tenantPlugin);

// Indexes
vendorSchema.index({ organizationId: 1, vendorId: 1 }, { unique: true });
vendorSchema.index({ organizationId: 1, status: 1 });
vendorSchema.index({ tenantId: 1, vendorId: 1 });

// Auto-generate vendor ID if not provided
vendorSchema.pre('save', async function(next) {
  if (!this.vendorId) {
    const count = await this.constructor.countDocuments({ organizationId: this.organizationId });
    this.vendorId = `VEN-${String(count + 1).padStart(3, '0')}`;
  }
  
  // Sync vendorCode with vendorId for legacy compatibility
  if (!this.vendorCode) {
    this.vendorCode = this.vendorId;
  }
  
  // Sync companyName with vendorName
  if (!this.companyName && this.vendorName) {
    this.companyName = this.vendorName;
  }
  
  // Calculate balance
  this.balance = this.totalAmount - this.paidAmount;
  
  next();
});

module.exports = mongoose.model('Vendor', vendorSchema);
