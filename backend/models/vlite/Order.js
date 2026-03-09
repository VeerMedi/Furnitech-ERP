const mongoose = require('mongoose');
const { tenantPlugin } = require('./TenantBase');

/**
 * Production Order Schema
 * FR-402: Orders management
 * FR-404: Process tracking for production stages
 */
const orderSchema = new mongoose.Schema({
  // Order Details
  orderNumber: {
    type: String,
    trim: true,
  },
  orderDate: {
    type: Date,
    default: Date.now,
  },

  // Customer & Quotation
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
  },
  quotation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quotation',
  },

  // Order Items
  items: [{
    itemNumber: Number,
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    description: String,
    specifications: mongoose.Schema.Types.Mixed,
    quantity: {
      type: Number,
      required: true,
    },
    unitPrice: Number,
    totalPrice: Number,

    // Production Status for this item
    productionStatus: {
      type: String,
      enum: [
        'PENDING',
        'MATERIAL_ALLOCATED',
        'IN_PRODUCTION',
        'PRESSING',
        'CUTTING',
        'EDGEBANDING',
        'CNC',
        'ASSEMBLY',
        'QC',
        'COMPLETED',
        'ON_HOLD'
      ],
      default: 'PENDING',
    },

    // BOM for this item
    bom: [{
      material: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RawMaterial',
      },
      requiredQuantity: Number,
      allocatedQuantity: Number,
      issuedQuantity: Number,
      // Dimensions for material cutting/usage
      length: Number,
      width: Number,
      height: Number,
      // Category selection for filtering
      selectedCategory: String,
    }],

    // Assigned Resources
    assignedMachines: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
    }],
    assignedWorkers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  }],

  // Overall Order Status
  orderStatus: {
    type: String,
    enum: [
      'DRAFT',         // Added for auto-created orders
      'CONFIRMED',
      'IN_PRODUCTION',
      'COMPLETED',
      'DISPATCHED',
      'DELIVERED',
      'INSTALLED',
      'CANCELLED',
      'ON_HOLD'
    ],
    default: 'CONFIRMED',
  },

  // Status History
  statusHistory: [{
    status: String,
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
  }],

  // Delivery Details
  deliveryAddress: {
    street: String,
    area: String,
    city: String,
    state: String,
    zipCode: String,
  },
  expectedDeliveryDate: Date,
  actualDeliveryDate: Date,

  // Installation
  requiresInstallation: {
    type: Boolean,
    default: true,
  },
  installationDate: Date,
  installationStatus: {
    type: String,
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'NOT_REQUIRED'],
    default: 'NOT_STARTED',
  },
  installationTeam: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],

  // Priority
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM',
  },

  // Product Type
  productType: {
    type: String,
    enum: {
      values: ['Wood', 'Steel', 'WOOD', 'STEEL'],
      message: '{VALUE} is not a valid product type'
    },
  },

  // Production Workflow Status (Wood Type - 5 steps)
  woodWorkflowStatus: {
    beamSaw: { type: Boolean, default: false },
    edgeBending: { type: Boolean, default: false },
    profiling: { type: Boolean, default: false },
    grooming: { type: Boolean, default: false },
    boringMachine: { type: Boolean, default: false },
    finish: { type: Boolean, default: false },
    packaging: { type: Boolean, default: false },
    deliveryStatusWorkflow: {
      type: String,
      enum: ['Ready to Delivered', 'Out of Delivery', 'Delivered', ''],
      default: ''
    },
  },

  // Worker Assignments for Wood Workflow
  woodWorkflowAssignments: {
    beamSaw: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    edgeBending: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    profiling: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    grooming: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    boringMachine: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    finish: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    packaging: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },

  // Production Workflow Status (Steel Type - 6 steps)
  steelWorkflowStatus: {
    steelCutting: { type: Boolean, default: false },
    cncCutting: { type: Boolean, default: false },
    bending: { type: Boolean, default: false },
    welding: { type: Boolean, default: false },
    finishing: { type: Boolean, default: false },
    packaging: { type: Boolean, default: false },
    deliveryStatusWorkflow: {
      type: String,
      enum: ['Ready to Delivered', 'Out of Delivery', 'Delivered', ''],
      default: ''
    },
  },

  // Worker Assignments for Steel Workflow
  steelWorkflowAssignments: {
    steelCutting: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cncCutting: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bending: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    welding: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    finishing: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    packaging: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },

  // Production readiness flag (automatically true when order is created)
  productionReady: {
    type: Boolean,
    default: true,  // Changed: Orders are production-ready immediately
  },
  markedProductionReadyAt: Date,
  markedProductionReadyBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Drawing Approval Status - REMOVED (no longer using drawing approval workflow)

  // Post-Production: Packaging & Dispatch
  packagingStatus: {
    type: String,
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
    default: 'NOT_STARTED',
  },
  packagingCompletedDate: Date,
  dispatchDate: Date,
  courierDetails: {
    courierName: String,
    trackingNumber: String,
    contactNumber: String,
  },

  // Post-Production: Invoice & Documentation
  invoice: {
    invoiceNumber: String,
    invoiceDate: Date,
    invoiceUrl: String,
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  invoiceStatus: {
    type: String,
    enum: ['NOT_GENERATED', 'GENERATED', 'SENT_TO_CUSTOMER'],
    default: 'NOT_GENERATED',
  },

  // Post-Production: Delivery Status Tracking
  deliveryStatus: {
    type: String,
    enum: ['READY_FOR_DISPATCH', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_DELIVERY'],
    default: 'READY_FOR_DISPATCH',
  },
  deliveryStatusLogs: [{
    status: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    location: String,
    notes: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  customerSignature: {
    signatureUrl: String,
    signedBy: String,
    signedAt: Date,
  },

  // Transport Integration
  transportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transport',
  },

  // Task Management Integration
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
  }],

  // Financial
  totalAmount: {
    type: Number,
    required: true,
  },
  advanceReceived: {
    type: Number,
    default: 0,
  },
  balanceAmount: Number,
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PARTIAL', 'COMPLETED'],
    default: 'PENDING',
  },

  // Documents
  documents: [{
    name: String,
    url: String,
    type: String,
  }],

  // Notes
  productionNotes: String,
  customerNotes: String,
  internalNotes: String,

}, {
  timestamps: true,
});

// Apply tenant plugin
orderSchema.plugin(tenantPlugin);

// Indexes
orderSchema.index({ organizationId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ organizationId: 1, customer: 1 });
orderSchema.index({ organizationId: 1, orderStatus: 1 });
orderSchema.index({ organizationId: 1, expectedDeliveryDate: 1 });
orderSchema.index({ organizationId: 1, paymentStatus: 1 });
orderSchema.index({ organizationId: 1, orderDate: -1 });
orderSchema.index({ organizationId: 1, 'items.product': 1 });

// Auto-generate order number
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const year = new Date().getFullYear().toString().substr(-2);
    let orderNumber;
    let count = await this.constructor.countDocuments({ organizationId: this.organizationId });

    // Keep incrementing until we find a unique orderNumber
    let attempts = 0;
    while (attempts < 100) {
      orderNumber = `ORD${year}${String(count + 1).padStart(6, '0')}`;
      const existing = await this.constructor.findOne({
        organizationId: this.organizationId,
        orderNumber
      });

      if (!existing) {
        this.orderNumber = orderNumber;
        break;
      }
      count++;
      attempts++;
    }

    if (!this.orderNumber) {
      throw new Error('Failed to generate unique order number after 100 attempts');
    }
  }

  // Calculate balance
  if (this.totalAmount) {
    this.balanceAmount = this.totalAmount - (this.advanceReceived || 0);
  }

  // Update status history
  if (this.isModified('orderStatus') && !this.isNew) {
    this.statusHistory.push({
      status: this.orderStatus,
      changedAt: new Date(),
      changedBy: this.lastModifiedBy,
    });
  }

  next();
});

module.exports = mongoose.model('Order', orderSchema);
