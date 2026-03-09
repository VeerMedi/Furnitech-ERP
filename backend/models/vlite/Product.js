const mongoose = require('mongoose');
const { tenantPlugin } = require('./TenantBase');

/**
 * Product Schema - FR-102: Product Masters with BOM
 */
const productSchema = new mongoose.Schema({
  // Basic Information
  productCode: {
    type: String,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },

  // Product Category
  category: {
    type: String,
    required: true,
    enum: [
      // Original categories
      'KITCHEN_CABINET',
      'WARDROBE',
      'TV_UNIT',
      'STUDY_TABLE',
      'BED',
      'DINING_TABLE',
      'SOFA',
      'OFFICE_FURNITURE',
      'MODULAR_KITCHEN',
      'CUSTOM',
      // Furniture dashboard categories
      'NON_SHARING_WORKSTATION',
      'SHARING_WORKSTATION',
      'NON_SHARING_PARTITION',
      'SHARING_PARTITION',
      'FOLDING_TABLE',
      'CAFE_TABLE',
      'CONFERENCE_TABLE',
      'CABIN_TABLE',
      'STORAGE',
      'ACCESSORIES'
    ],
  },
  subCategory: String,

  // Specifications
  specifications: {
    dimensions: {
      width: Number,
      height: Number,
      depth: Number,
      unit: {
        type: String,
        default: 'MM',
      },
    },
    weight: Number,
    color: String,
    finish: String,
    material: String,
    seats: Number, // Number of seats/seating capacity
    type: { type: String }, // Product type/style (e.g., Executive, Manager) - using object notation because 'type' is reserved
    customSpecs: mongoose.Schema.Types.Mixed,
  },

  // Bill of Materials (BOM)
  bom: [{
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterial',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    uom: String,
    wastagePercentage: {
      type: Number,
      default: 5,
    },
    notes: String,
  }],

  // Pricing (FR-501: Price Book)
  pricing: {
    baseCost: Number, // Total material cost from BOM
    laborCost: Number,
    overheadCost: Number,
    totalCost: Number,
    sellingPrice: {
      type: Number,
      required: true,
    },
    marginPercentage: Number,
    currency: {
      type: String,
      default: 'INR',
    },
  },

  // Production Details
  production: {
    estimatedProductionTime: Number, // in hours
    complexity: {
      type: String,
      enum: ['SIMPLE', 'MEDIUM', 'COMPLEX'],
      default: 'MEDIUM',
    },
    requiredMachines: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
    }],
    requiredSkills: [String],
  },

  // Variants
  hasVariants: {
    type: Boolean,
    default: false,
  },
  variants: [{
    variantCode: String,
    name: String,
    specifications: mongoose.Schema.Types.Mixed,
    pricing: {
      sellingPrice: Number,
    },
    sku: String,
  }],

  // Images & Documents
  images: [{
    url: String,
    isPrimary: Boolean,
    caption: String,
  }],
  technicalDrawings: [{
    name: String,
    url: String,
  }],

  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'DISCONTINUED', 'UNDER_DEVELOPMENT'],
    default: 'ACTIVE',
  },

  // Catalog Information
  isCustomizable: {
    type: Boolean,
    default: true,
  },
  minOrderQuantity: {
    type: Number,
    default: 1,
  },

  // SEO & Marketing
  description: String,
  features: [String],
  tags: [String],

  // Statistics
  stats: {
    totalOrders: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
    },
  },

  // Import Tracking (for Excel bulk imports)
  importBatch: {
    batchId: String,
    importedAt: Date,
    importedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },

}, {
  timestamps: true,
});

// Apply tenant plugin
productSchema.plugin(tenantPlugin);

// Indexes
productSchema.index({ organizationId: 1, productCode: 1 }, { unique: true });
productSchema.index({ organizationId: 1, category: 1, status: 1 });
productSchema.index({ organizationId: 1, name: 'text', description: 'text' });
productSchema.index({ organizationId: 1, 'pricing.sellingPrice': 1 });

// Auto-generate product code
productSchema.pre('save', async function (next) {
  if (!this.productCode) {
    // Find the last product code to ensure uniqueness even if products were deleted
    const lastProduct = await this.constructor.findOne(
      { organizationId: this.organizationId },
      { productCode: 1 }
    ).sort({ createdAt: -1, productCode: -1 }); // Sort by creation or code to find latest

    let nextNum = 1;
    if (lastProduct && lastProduct.productCode) {
      const match = lastProduct.productCode.match(/^PRD(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    this.productCode = `PRD${String(nextNum).padStart(6, '0')}`;
  }

  // Calculate total cost from BOM
  if (this.bom && this.bom.length > 0) {
    // This would need to be populated with actual material costs
    // For now, just ensure pricing fields exist
    if (!this.pricing.totalCost) {
      this.pricing.totalCost = (this.pricing.baseCost || 0) +
        (this.pricing.laborCost || 0) +
        (this.pricing.overheadCost || 0);
    }

    if (this.pricing.totalCost && this.pricing.sellingPrice) {
      this.pricing.marginPercentage =
        ((this.pricing.sellingPrice - this.pricing.totalCost) / this.pricing.sellingPrice) * 100;
    }
  }

  next();
});

module.exports = mongoose.model('Product', productSchema);
