const mongoose = require('mongoose');

/**
 * Reminder Setting Schema
 * Stores configuration for automatic follow-up reminders
 * One setting per organization
 */
const reminderSettingSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        unique: true, // One setting per organization
    },

    // Whether automatic reminders are enabled
    enabled: {
        type: Boolean,
        default: false,
    },

    // Threshold value (e.g., 1, 3, 7)
    threshold: {
        type: Number,
        required: true,
        min: 1,
        default: 3,
    },

    // Time unit for threshold
    timeUnit: {
        type: String,
        enum: ['minutes', 'days'],
        default: 'days',
    },

    // Last time reminders were sent
    lastRun: {
        type: Date,
        default: null,
    },

    // User who created/last updated the settings
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, {
    timestamps: true, // Adds createdAt and updatedAt
});

// Index for efficient cron job queries
reminderSettingSchema.index({ organization: 1, enabled: 1 });

module.exports = mongoose.model('ReminderSetting', reminderSettingSchema);
