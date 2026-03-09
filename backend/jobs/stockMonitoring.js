/**
 * Stock Monitoring Background Job
 * Runs periodically to check stock levels and generate suggestions
 */

const cron = require('node-cron');
const inventoryMonitoringService = require('../services/inventoryMonitoringService');

class StockMonitoringJob {
  constructor() {
    this.job = null;
    this.isRunning = false;
  }

  /**
   * Start the background job
   * Runs every 30 minutes during business hours (9 AM - 6 PM)
   */
  start() {
    // Schedule: Every 30 minutes between 9 AM and 6 PM, Monday to Saturday
    // Cron pattern: "*/30 9-18 * * 1-6"
    this.job = cron.schedule('*/30 9-18 * * 1-6', async () => {
      if (this.isRunning) {
        console.log('[Stock Monitor Job] Previous job still running, skipping this run');
        return;
      }

      this.isRunning = true;
      console.log('[Stock Monitor Job] Starting scheduled stock monitoring...');

      try {
        const result = await inventoryMonitoringService.checkAllOrganizations();

        if (result.success) {
          console.log(`[Stock Monitor Job] Completed successfully:
            - Created: ${result.suggestionsCreated} new suggestions
            - Expired: ${result.suggestionsExpired} old suggestions`);
        } else {
          console.error('[Stock Monitor Job] Failed:', result.error);
        }
      } catch (error) {
        console.error('[Stock Monitor Job] Unexpected error:', error);
      } finally {
        this.isRunning = false;
      }
    }, {
      timezone: "Asia/Kolkata" // Adjust timezone as needed
    });

    console.log('[Stock Monitor Job] Background job started successfully');
    console.log('[Stock Monitor Job] Schedule: Every 30 minutes, 9 AM - 6 PM, Monday-Saturday');
  }

  /**
   * Stop the background job
   */
  stop() {
    if (this.job) {
      this.job.stop();
      console.log('[Stock Monitor Job] Background job stopped');
    }
  }

  /**
   * Run job manually (for testing)
   */
  async runNow() {
    console.log('[Stock Monitor Job] Running manual check...');

    try {
      const result = await inventoryMonitoringService.checkAllOrganizations();
      return result;
    } catch (error) {
      console.error('[Stock Monitor Job] Manual run error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new StockMonitoringJob();
