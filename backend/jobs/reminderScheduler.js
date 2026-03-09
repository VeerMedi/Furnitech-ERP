const cron = require('node-cron');
const ReminderSetting = require('../models/vlite/ReminderSetting');
const Inquiry = require('../models/vlite/Inquiry');
const EmailService = require('../utils/emailService');
const logger = require('../utils/logger');

/**
 * Automatic Reminder Scheduler
 * Runs every minute and checks if reminders should be sent
 */
class ReminderScheduler {
    constructor() {
        this.task = null;
        this.isRunning = false;
    }

    /**
     * Start the cron job
     */
    start() {
        console.log('🔔 Starting Reminder Scheduler...');

        // Run every minute: */1 * * * *
        this.task = cron.schedule('*/1 * * * *', async () => {
            await this.executeReminderCheck();
        });

        console.log('✅ Reminder Scheduler started (runs every 1 minute)');
    }

    /**
     * Stop the cron job
     */
    stop() {
        if (this.task) {
            this.task.stop();
            console.log('🛑 Reminder Scheduler stopped');
        }
    }

    /**
     * Main execution logic
     */
    async executeReminderCheck() {
        // Prevent overlapping executions
        if (this.isRunning) {
            console.log('⏭️  Reminder check already running, skipping...');
            return;
        }

        this.isRunning = true;

        try {
            console.log('\n⏰ [Reminder Scheduler] Checking for reminders to send...');

            // Find all enabled reminder settings
            const settings = await ReminderSetting.find({ enabled: true });

            if (settings.length === 0) {
                console.log('   No active reminder settings found');
                this.isRunning = false;
                return;
            }

            console.log(`   Found ${settings.length} organization(s) with auto-reminders enabled`);

            // Process each organization
            for (const setting of settings) {
                await this.processOrganization(setting);
            }

            console.log('✅ [Reminder Scheduler] Check complete\n');
        } catch (error) {
            console.error('❌ [Reminder Scheduler] Error:', error.message);
            logger.error('Reminder Scheduler error:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Process reminders for a single organization
     */
    async processOrganization(setting) {
        const organizationId = setting.organization;

        console.log(`\n   📊 Organization ${organizationId}:`);
        console.log(`      - Interval: ${setting.threshold} ${setting.timeUnit}`);
        console.log(`      - Last Run: ${setting.lastRun || 'Never'}`);

        // Calculate if it's time to send
        const now = new Date();
        const shouldSend = this.shouldSendReminders(setting, now);

        if (!shouldSend) {
            console.log(`      ⏭️  Not yet time to send (waiting for interval)`);
            return;
        }

        console.log(`      ✅ Time to send reminders!`);

        try {
            // Calculate cutoff date
            const cutoffDate = new Date();
            if (setting.timeUnit === 'minutes') {
                cutoffDate.setMinutes(cutoffDate.getMinutes() - setting.threshold);
            } else {
                cutoffDate.setDate(cutoffDate.getDate() - setting.threshold);
            }

            console.log(`      📅 Cutoff Date: ${cutoffDate.toISOString()}`);

            // Find pending inquiries (same logic as manual send)
            const pendingInquiries = await Inquiry.find({
                organization: organizationId,
                assignedTo: { $exists: true, $ne: null },
                leadStatus: { $in: ['NEW', 'OPEN', 'CONTACTED', 'FOLLOW_UP', 'NEGOTIATION', 'PENDING'] },
                updatedAt: { $lt: cutoffDate }
            }).populate('assignedTo', 'email firstName lastName');

            console.log(`      🔍 Found ${pendingInquiries.length} pending inquiries`);

            if (pendingInquiries.length === 0) {
                // Update lastRun even if no emails sent
                setting.lastRun = now;
                await setting.save();
                console.log(`      ℹ️  No pending inquiries to remind about`);
                return;
            }

            // Group by salesman
            const groupedBySalesman = {};
            pendingInquiries.forEach(inquiry => {
                if (!inquiry.assignedTo) return;

                const salesmanId = inquiry.assignedTo._id.toString();
                if (!groupedBySalesman[salesmanId]) {
                    groupedBySalesman[salesmanId] = {
                        salesman: inquiry.assignedTo,
                        inquiries: []
                    };
                }
                groupedBySalesman[salesmanId].inquiries.push(inquiry);
            });

            // Send emails
            let emailsSent = 0;
            let emailsFailed = 0;

            for (const salesmanId in groupedBySalesman) {
                const { salesman, inquiries } = groupedBySalesman[salesmanId];

                if (salesman && salesman.email) {
                    try {
                        await EmailService.sendFollowUpReminderEmail(salesman, inquiries);
                        console.log(`      ✉️  Email sent to ${salesman.email} (${inquiries.length} inquiries)`);
                        emailsSent++;
                    } catch (emailErr) {
                        emailsFailed++;
                        console.error(`      ❌ Failed to email ${salesman.email}:`, emailErr.message);
                    }
                }
            }

            // Update lastRun timestamp
            setting.lastRun = now;
            await setting.save();

            console.log(`      📊 Results: ${emailsSent} sent, ${emailsFailed} failed`);
            logger.info(`Auto-reminders sent for org ${organizationId}: ${emailsSent} emails`);

        } catch (error) {
            console.error(`      ❌ Error processing org ${organizationId}:`, error.message);
            logger.error(`Auto-reminder error for org ${organizationId}:`, error);
        }
    }

    /**
     * Determine if reminders should be sent based on interval
     */
    shouldSendReminders(setting, now) {
        if (!setting.lastRun) {
            // Never run before, send immediately
            return true;
        }

        const lastRun = new Date(setting.lastRun);
        const timeDiff = now - lastRun;

        if (setting.timeUnit === 'minutes') {
            const minutesPassed = timeDiff / (1000 * 60);
            return minutesPassed >= setting.threshold;
        } else {
            const daysPassed = timeDiff / (1000 * 60 * 60 * 24);
            return daysPassed >= setting.threshold;
        }
    }
}

// Export singleton instance
module.exports = new ReminderScheduler();
