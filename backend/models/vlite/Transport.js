const mongoose = require('mongoose');

const transportSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    productId: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    clientName: {
      type: String,
      required: true,
    },
    clientAddress: {
      type: String,
      required: true,
    },
    clientContact: {
      type: String,
      required: true,
    },
    vehicleType: {
      type: String,
      enum: ['Truck', 'Van', 'Bike', 'Auto'],
      required: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
    },
    driverId: {
      type: String,
      required: true,
    },
    driverName: {
      type: String,
      required: true,
    },
    driverContact: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Scheduled', 'En Route', 'Delivered', 'Delayed', 'Cancelled'],
      default: 'Scheduled',
    },
    deliveryDate: {
      type: Date,
      required: true,
    },
    distance: {
      type: Number,
      default: 0,
    },
    estimatedTime: {
      type: Number,
      default: 0,
    },
    actualDeliveryTime: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
    statusLogs: [
      {
        status: {
          type: String,
          enum: ['Scheduled', 'Confirmed', 'En Route', 'Delivered', 'Delayed', 'Cancelled'],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        notes: String,
      },
    ],
    location: {
      latitude: Number,
      longitude: Number,
      lastUpdated: Date,
    },
  },
  { timestamps: true }
);

transportSchema.index({ tenantId: 1, orderNumber: 1 });
transportSchema.index({ tenantId: 1, status: 1 });
transportSchema.index({ tenantId: 1, deliveryDate: 1 });

module.exports = mongoose.model('Transport', transportSchema);
