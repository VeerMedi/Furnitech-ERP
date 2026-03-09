const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  staffId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  contact: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  salary: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'On Leave', 'Inactive', 'Suspended'],
    default: 'Active'
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  designation: {
    type: String
  },
  department: {
    type: String
  }
}, {
  timestamps: true
});

staffSchema.index({ tenantId: 1, staffId: 1 });

module.exports = mongoose.model('Staff', staffSchema);
