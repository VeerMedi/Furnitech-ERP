const mongoose = require('mongoose');
const { tenantPlugin } = require('./TenantBase');

/**
 * Raw Material Schema
 * FR-101: Raw material tracking (Panel, Laminate, Edgeband, Hardware, Glass, Fabric, Aluminium, etc.)
 */
const rawMaterialSchema = new mongoose.Schema({
  // Basic Information
  materialCode: {
    type: String,
    required: false,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Material name is required'],
    trim: true,
  },

  // Material Type
  category: {
    type: String,
    required: true,
    uppercase: true, // Auto-convert to uppercase for consistency
    trim: true,
    index: true, // Index for faster category queries
  },

  // Specifications
  specifications: {
    thickness: String,
    width: String,
    length: String,
    height: String,  // Height/Depth dimension (e.g., 750mm, 900mm, 1050mm)
    color: String,
    finish: String,
    brand: String,
    grade: String,
    customSpecs: mongoose.Schema.Types.Mixed,
  },

  // Unit of Measurement
  uom: {
    type: String,
    required: true,
    uppercase: true, // Auto-convert to uppercase
    trim: true,
    default: 'PCS',
  },

  // Pricing
  costPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  sellingPrice: {
    type: Number,
    min: 0,
  },
  currency: {
    type: String,
    default: 'INR',
  },

  // Stock Information
  currentStock: {
    type: Number,
    default: 0,
  },
  minStockLevel: {
    type: Number,
    default: 0,
  },
  maxStockLevel: {
    type: Number,
    default: 0,
  },
  reorderPoint: {
    type: Number,
    default: 0,
  },

  // Storage Location
  warehouseLocation: {
    warehouse: String,
    rack: String,
    bin: String,
  },

  // Vendor Information
  primaryVendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
  },
  alternateVendors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
  }],

  // Price History for Price Book
  priceHistory: [{
    date: {
      type: Date,
      default: Date.now,
    },
    price: {
      type: Number,
      required: true,
    },
    vendor: {
      type: String,
      required: true,
    },
    vendorContact: String,
    quantity: Number,
    notes: String,
  }],

  // Lead Time
  leadTimeDays: {
    type: Number,
    default: 0,
  },

  // Quality Parameters
  qualityStandard: String,
  certifications: [String],

  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'DISCONTINUED', 'OUT_OF_STOCK'],
    default: 'ACTIVE',
  },

  // Image & Documents
  images: [String],
  documents: [{
    name: String,
    url: String,
    type: String,
  }],

  // Notes
  description: String,
  notes: String,
  tags: [String],

  // Import Tracking (for "Undo Last Import" feature)
  importBatchId: {
    type: String,
    index: true, // Index for fast queries
  },
  importedAt: {
    type: Date,
  },

}, {
  timestamps: true,
});

// Apply tenant plugin
rawMaterialSchema.plugin(tenantPlugin);

// Indexes
rawMaterialSchema.index({ organizationId: 1, materialCode: 1 }, { unique: true });
rawMaterialSchema.index({ organizationId: 1, category: 1, status: 1 });
rawMaterialSchema.index({ organizationId: 1, currentStock: 1 });

// Auto-generate material code
rawMaterialSchema.pre('save', async function (next) {
  if (!this.materialCode) {
    const count = await this.constructor.countDocuments({ organizationId: this.organizationId });
    this.materialCode = `RM${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Method to check if stock is low
rawMaterialSchema.methods.isLowStock = function () {
  return this.currentStock <= this.reorderPoint || this.currentStock <= this.minStockLevel;
};

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);
