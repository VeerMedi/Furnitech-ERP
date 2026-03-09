const mongoose = require('mongoose');
const { tenantPlugin } = require('./TenantBase');

/**
 * Quotation Schema
 * FR-204: Quotation generation with price book
 * FR-205: Quotation approval workflow
 * FR-551: Email notification on approval
 */
const quotationSchema = new mongoose.Schema({
  // Quotation Details
  quotationNumber: {
    type: String,
    trim: true,
  },
  revisionNumber: {
    type: Number,
    default: 0,
  },

  // Linked Inquiry
  inquiry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inquiry',
  },

  // Customer
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
  },

  // Customer Name (for manual entry)
  customerName: {
    type: String,
  },

  // Customer Email
  customerEmail: {
    type: String,
  },

  // Company Name (for manual entry)
  companyName: {
    type: String,
  },

  // Customer ID / Code (populated during onboarding)
  customerId: {
    type: String,
  },

  // Original Inquiry Product Details (for reference)
  inquiryProductDetails: {
    type: String,
  },

  // Valid Period
  validFrom: {
    type: Date,
    default: Date.now,
  },
  validUntil: {
    type: Date,
    required: true,
  },

  // Line Items
  items: [{
    itemNumber: Number,
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    description: {
      type: String,
      required: true,
    },

    layoutDescription: {
      type: String,
      default: '',
    },
    specifications: mongoose.Schema.Types.Mixed,
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      default: 'Nos',
    },
    unitPrice: {
      type: Number,
      required: true,
    },
    discount: {
      type: {
        type: String,
        enum: ['PERCENTAGE', 'FIXED'],
      },
      value: Number,
    },
    taxPerUnit: {
      type: Number,
      default: 18, // GST
    },
    amount: Number,
    details: String, // Product details from inquiry
    notes: String,

    // NEW: Structured Products/Materials Arrays
    selectedProducts: [{
      _id: mongoose.Schema.Types.ObjectId,
      name: String,
      price: Number,
      category: String
    }],
    selectedMaterials: [{
      _id: mongoose.Schema.Types.ObjectId,
      name: String,
      price: Number,
      category: String,
      unit: String
    }]
  }],

  // Pricing Summary
  taxableAmount: {
    type: Number,
    default: 0,
  },
  cgst: {
    type: Number,
    default: 0,
  },
  sgst: {
    type: Number,
    default: 0,
  },
  igst: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'INR',
  },

  // Bank Details
  bankDetails: {
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    branch: String,
  },

  // Notes and Terms
  notes: String,
  emailMessage: String,
  termsAndConditions: [String],

  // Signature
  signatureUrl: String,
  signedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  signedDate: Date,

  // Payment Terms
  paymentTerms: {
    advancePercentage: {
      type: Number,
      default: 30,
    },
    advanceAmount: Number,
    balanceAmount: Number,
    paymentMilestones: [{
      stage: String,
      percentage: Number,
      amount: Number,
    }],
  },

  // Delivery Terms
  deliveryTerms: {
    estimatedDeliveryDays: Number,
    deliveryDate: Date,
    deliveryAddress: String,
    shippingCharges: Number,
    installationCharges: Number,
  },

  // Terms & Conditions
  termsAndConditions: [String],

  // Approval Workflow (FR-205)
  approvalStatus: {
    type: String,
    enum: ['DRAFT', 'SENT', 'APPROVED', 'REJECTED'],
    default: 'DRAFT',
  },
  approvalWorkflow: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    level: Number,
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    comments: String,
    actionDate: Date,
  }],

  // Customer Response
  customerStatus: {
    type: String,
    enum: ['SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'NEGOTIATING'],
    default: 'SENT',
  },
  customerResponseDate: Date,
  customerComments: String,

  // Conversion
  convertedToOrder: {
    type: Boolean,
    default: false,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },

  // Advance Payment (FR-206)
  advancePaymentReceived: {
    type: Boolean,
    default: false,
  },
  advancePaymentDetails: {
    amount: Number,
    receivedDate: Date,
    paymentMode: String,
    transactionReference: String,
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },

  // Documents
  attachments: [{
    name: String,
    url: String,
    type: String,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],

  // File Description
  fileDescription: {
    type: String,
    default: ''
  },

  // AI Scanned Layout Data
  scannedLayout: {
    filename: String,
    resultFile: String,
    scanDate: Date,
    itemsFound: Number,
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'PENDING'
    }
  },

  // Prepared By
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Notes
  internalNotes: String,
  customerNotes: String,

}, {
  timestamps: true,
});

// Apply tenant plugin
quotationSchema.plugin(tenantPlugin);

// Indexes
quotationSchema.index({ organizationId: 1, quotationNumber: 1, revisionNumber: 1 }, { unique: true });
quotationSchema.index({ organizationId: 1, customer: 1 });
quotationSchema.index({ organizationId: 1, approvalStatus: 1 });
quotationSchema.index({ organizationId: 1, customerStatus: 1 });
quotationSchema.index({ organizationId: 1, validUntil: 1 });
quotationSchema.index({ organizationId: 1, createdAt: -1 });

// Auto-generate quotation number
quotationSchema.pre('save', async function (next) {
  if (!this.quotationNumber) {
    // Get the current year
    const year = new Date().getFullYear();

    // Find the last quotation number for this organization and year
    const lastQuotation = await this.constructor
      .findOne({
        organizationId: this.organizationId,
        quotationNumber: new RegExp(`^QUO-${year}-`)
      })
      .sort({ quotationNumber: -1 })
      .select('quotationNumber')
      .lean();

    let nextNumber = 1;

    if (lastQuotation && lastQuotation.quotationNumber) {
      // Extract the number from the last quotation number (e.g., "QUO-2025-008" -> 8)
      const match = lastQuotation.quotationNumber.match(/QUO-\d{4}-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    this.quotationNumber = `QUO-${year}-${String(nextNumber).padStart(3, '0')}`;
  }

  // Calculate totals
  if (this.items && this.items.length > 0) {
    this.taxableAmount = 0;
    this.cgst = 0;
    this.sgst = 0;
    this.igst = 0;

    this.items.forEach((item, index) => {
      item.itemNumber = index + 1;

      // Calculate line total
      let lineSubtotal = item.quantity * item.unitPrice;
      let lineDiscount = 0;

      if (item.discount) {
        if (item.discount.type === 'PERCENTAGE') {
          lineDiscount = (lineSubtotal * item.discount.value) / 100;
        } else {
          lineDiscount = item.discount.value;
        }
      }

      const lineAfterDiscount = lineSubtotal - lineDiscount;
      const lineTax = (lineAfterDiscount * (item.taxPerUnit || 18)) / 100;

      // For intra-state, split between CGST and SGST
      const lineCgst = lineTax / 2;
      const lineSgst = lineTax / 2;

      item.amount = lineAfterDiscount + lineTax;

      this.taxableAmount += lineAfterDiscount;
      this.cgst += lineCgst;
      this.sgst += lineSgst;
    });

    this.totalAmount = this.taxableAmount + this.cgst + this.sgst - (this.discount || 0);

    // Calculate payment terms
    if (this.paymentTerms.advancePercentage) {
      this.paymentTerms.advanceAmount = (this.totalAmount * this.paymentTerms.advancePercentage) / 100;
      this.paymentTerms.balanceAmount = this.totalAmount - this.paymentTerms.advanceAmount;
    }
  }

  next();
});

module.exports = mongoose.model('Quotation', quotationSchema);
