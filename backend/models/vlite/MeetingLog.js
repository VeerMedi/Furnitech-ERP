const mongoose = require('mongoose');

const meetingLogSchema = new mongoose.Schema({
  inquiryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inquiry',
    required: true,
    index: true
  },
  salesmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  salesmanName: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  meetingLocation: {
    type: String,
    required: true,
    trim: true
  },
  discussionDetails: {
    type: String,
    required: true,
    trim: true
  },
  nextMeetingDate: {
    type: Date,
    required: true
  },
  nextMeetingNotes: {
    type: String,
    trim: true,
    default: ''
  },
  meetingDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Completed', 'Cancelled'],
    default: 'Completed'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'meetinglogs'
});

// Indexes for better query performance
meetingLogSchema.index({ inquiryId: 1, salesmanId: 1 });
meetingLogSchema.index({ nextMeetingDate: 1 });
meetingLogSchema.index({ createdAt: -1 });

const MeetingLog = mongoose.model('MeetingLog', meetingLogSchema);

module.exports = MeetingLog;
