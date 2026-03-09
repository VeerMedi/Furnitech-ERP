const mongoose = require('mongoose');

/**
 * ProductionOrder Schema
 * - Connects to Quotation and Drawing
 * - workflowType: steel|wood
 */
const productionOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, trim: true },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
  drawing: { type: mongoose.Schema.Types.ObjectId, ref: 'Drawing' },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Items to be produced (can mirror quotation items or be more detailed)
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1 },
    meta: { type: Object, default: {} },
  }],

  // Workflow type: steel or wood (affects available steps/machines)
  workflowType: {
    type: String,
    enum: ['STEEL', 'WOOD'],
    required: true,
  },

  // Reference to workflow steps (ordered)
  workflowSteps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WorkflowStep' }],

  status: {
    type: String,
    enum: ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PAUSED'],
    default: 'PENDING',
  },

  scheduledStart: Date,
  scheduledEnd: Date,
  actualStart: Date,
  actualEnd: Date,

  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },

  // Production estimates and costs
  estimatedHours: { type: Number, default: 0 },
  actualHours: { type: Number, default: 0 },
  estimatedCost: { type: Number, default: 0 },
  actualCost: { type: Number, default: 0 },

  machines: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Machine' }],
  notes: String,
}, { timestamps: true });

productionOrderSchema.index({ orderNumber: 1 });
productionOrderSchema.index({ organization: 1, status: 1 });

productionOrderSchema.methods.start = function() {
  this.status = 'IN_PROGRESS';
  this.actualStart = new Date();
  return this.save();
};

productionOrderSchema.methods.complete = function() {
  this.status = 'COMPLETED';
  this.actualEnd = new Date();
  if (this.actualStart) {
    const durMs = this.actualEnd - this.actualStart;
    this.actualHours = Math.round((durMs / (1000 * 60 * 60)) * 100) / 100; // two decimals
  }
  return this.save();
};

module.exports = mongoose.model('ProductionOrder', productionOrderSchema);
