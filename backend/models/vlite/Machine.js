const mongoose = require('mongoose');
const { tenantPlugin } = require('./TenantBase');

/**
 * Machine Schema
 * FR-104: Machine definitions for production
 * FR-607: Predictive maintenance
 */
const machineSchema = new mongoose.Schema({
  // Basic Information
  machineCode: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Machine name is required'],
    trim: true,
  },
  
  // Machine Type
  type: {
    type: String,
    required: true,
    enum: [
      'PRESSING_MACHINE',
      'PANEL_SAW',
      'CNC_MACHINE',
      'EDGEBANDING_MACHINE',
      'DRILLING_MACHINE',
      'SANDING_MACHINE',
      'SPRAY_BOOTH',
      'ASSEMBLY_TABLE',
      'OTHER'
    ],
  },
  
  // Specifications
  specifications: {
    manufacturer: String,
    model: String,
    serialNumber: String,
    yearOfManufacture: Number,
    capacity: String,
    powerRating: String,
    dimensions: {
      width: Number,
      height: Number,
      depth: Number,
    },
  },
  
  // Location
  location: {
    workshop: String,
    bay: String,
    floor: String,
  },
  
  // Operational Status
  operationalStatus: {
    type: String,
    enum: ['OPERATIONAL', 'UNDER_MAINTENANCE', 'BREAKDOWN', 'IDLE', 'RETIRED'],
    default: 'OPERATIONAL',
  },
  
  // Maintenance
  maintenance: {
    lastMaintenanceDate: Date,
    nextMaintenanceDate: Date,
    maintenanceFrequencyDays: {
      type: Number,
      default: 90,
    },
    totalMaintenanceHours: {
      type: Number,
      default: 0,
    },
    maintenanceHistory: [{
      date: Date,
      type: {
        type: String,
        enum: ['PREVENTIVE', 'CORRECTIVE', 'BREAKDOWN'],
      },
      description: String,
      cost: Number,
      performedBy: String,
      downtime: Number, // in hours
    }],
  },
  
  // Performance Metrics
  performance: {
    totalOperatingHours: {
      type: Number,
      default: 0,
    },
    totalDowntime: {
      type: Number,
      default: 0,
    },
    utilizationRate: Number, // percentage
    efficiency: Number, // percentage
    lastOperatedDate: Date,
  },
  
  // AI Predictive Maintenance (FR-607)
  aiMaintenancePrediction: {
    predictedFailureDate: Date,
    failureRiskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    },
    recommendedActions: [String],
    predictedAt: Date,
  },
  
  // Operators
  qualifiedOperators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  
  // Documents
  documents: [{
    name: String,
    url: String,
    type: String, // Manual, Certificate, etc.
  }],
  
  // Notes
  notes: String,
  
}, {
  timestamps: true,
});

// Apply tenant plugin
machineSchema.plugin(tenantPlugin);

// Indexes
machineSchema.index({ organizationId: 1, machineCode: 1 }, { unique: true });
machineSchema.index({ organizationId: 1, type: 1, operationalStatus: 1 });
machineSchema.index({ organizationId: 1, 'maintenance.nextMaintenanceDate': 1 });

// Auto-generate machine code
machineSchema.pre('save', async function(next) {
  if (!this.machineCode) {
    const count = await this.constructor.countDocuments({ organizationId: this.organizationId });
    this.machineCode = `MCH${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Method to check if maintenance is due
machineSchema.methods.isMaintenanceDue = function() {
  if (!this.maintenance.nextMaintenanceDate) return false;
  return new Date() >= this.maintenance.nextMaintenanceDate;
};

module.exports = mongoose.model('Machine', machineSchema);
