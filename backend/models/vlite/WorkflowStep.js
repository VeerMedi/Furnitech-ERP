const mongoose = require('mongoose');

/**
 * WorkflowStep Schema
 * - Represents a single step in a production workflow
 * - Supports CNC, BeamSaw, EdgeBanding, Boring, Welding, Finishing, Packaging
 */
const workflowStepSchema = new mongoose.Schema({
  productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder', required: true },
  sequence: { type: Number, required: true },
  stepType: {
    type: String,
    required: true,
    enum: ['CNC', 'BEAM_SAW', 'EDGE_BANDING', 'BORING', 'WELDING', 'FINISHING', 'PACKAGING'],
  },
  name: { type: String, trim: true },
  description: { type: String },

  // Assignment
  assignedMachine: { type: mongoose.Schema.Types.ObjectId, ref: 'Machine' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Status and timings
  status: {
    type: String,
    enum: ['PENDING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'BLOCKED'],
    default: 'PENDING',
  },
  estimatedDurationMinutes: { type: Number, default: 0 },
  actualDurationMinutes: { type: Number, default: 0 },
  startedAt: Date,
  completedAt: Date,

  // Materials and outputs
  materialsUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial' }],
  outputItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

  qualityChecks: [{
    checkBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    passed: Boolean,
    notes: String,
    checkedAt: Date,
  }],

  notes: String,
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
}, { timestamps: true });

workflowStepSchema.index({ productionOrder: 1, sequence: 1 }, { unique: true });

workflowStepSchema.methods.markStarted = function() {
  this.status = 'IN_PROGRESS';
  this.startedAt = new Date();
  return this.save();
};

workflowStepSchema.methods.markCompleted = function() {
  this.status = 'COMPLETED';
  this.completedAt = new Date();
  if (this.startedAt) {
    const dur = Math.round((this.completedAt - this.startedAt) / 60000);
    this.actualDurationMinutes = dur;
  }
  return this.save();
};

module.exports = mongoose.model('WorkflowStep', workflowStepSchema);
