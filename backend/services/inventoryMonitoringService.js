/**
 * Inventory Monitoring Service
 * Monitors raw material stock levels and generates AI suggestions
 */

const RawMaterial = require('../models/vlite/RawMaterial');
const InventorySuggestion = require('../models/vlite/InventorySuggestion');
const vendorRecommendationService = require('./vendorRecommendationService');

const Subscription = require('../models/shared/Subscription');
const EmailService = require('../utils/emailService');
const User = require('../models/vlite/User');

class InventoryMonitoringService {

  /**
   * Check all organizations for low stock items
   */
  async checkAllOrganizations() {
    try {
      console.log('[Inventory Monitor] Starting stock monitoring...');

      // Get all unique organization IDs
      const organizations = await RawMaterial.distinct('organizationId');

      let totalSuggestionsCreated = 0;

      for (const orgId of organizations) {
        try {
          // --- SUBSCRIPTION & 6-HOUR TOKEN CHECK ---
          const subscription = await Subscription.findOne({ organizationId: orgId });

          if (!subscription || !subscription.isActive()) {
            console.log(`[Inventory Monitor] Skipping org ${orgId}: No active subscription.`);
            continue;
          }

          // Check when was the last "Automatic Stock Check" payment
          const lastAutoCheck = subscription.tokenUsageHistory
            .filter(u => u.description === 'Automatic Stock Check (6-Hour)')
            .sort((a, b) => b.timestamp - a.timestamp)[0]; // Get latest

          const sixHoursMs = 6 * 60 * 60 * 1000;
          const now = new Date();
          let shouldCharge = true;

          if (lastAutoCheck) {
            const timeDiff = now - new Date(lastAutoCheck.timestamp);
            if (timeDiff < sixHoursMs) {
              shouldCharge = false; // Already paid within last 6 hours
            }
          }

          if (shouldCharge) {
            // Try to deduct token
            try {
              await subscription.consumeTokens(
                'aiDemandForecasting',
                1,
                'system-auto-job',
                'Automatic Stock Check (6-Hour)',
                'Background Inventory Analysis'
              );
              console.log(`[Inventory Monitor] Org ${orgId}: Token deducted for 6-hour cycle.`);
            } catch (tokenErr) {
              if (tokenErr.message === 'Insufficient tokens') {
                console.log(`[Inventory Monitor] Skipping org ${orgId}: Insufficient AI Tokens for 6-hour renewal.`);
                continue; // BLOCK SERVICE if they can't pay the 6-hour rent
              }
              throw tokenErr;
            }
          } else {
            console.log(`[Inventory Monitor] Org ${orgId}: Free check (within 6-hour window).`);
          }
          // -----------------------------------------

          const suggestionsCreated = await this.checkOrganization(orgId);
          totalSuggestionsCreated += suggestionsCreated;

        } catch (err) {
          console.error(`[Inventory Monitor] Error processing org ${orgId}:`, err.message);
          continue;
        }
      }

      console.log(`[Inventory Monitor] Created ${totalSuggestionsCreated} new suggestions`);

      // Also expire old suggestions
      const expiredCount = await InventorySuggestion.expireOldSuggestions();
      console.log(`[Inventory Monitor] Expired ${expiredCount} old suggestions`);

      return {
        success: true,
        suggestionsCreated: totalSuggestionsCreated,
        suggestionsExpired: expiredCount,
      };

    } catch (error) {
      console.error('[Inventory Monitor] Error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check a specific organization for low stock items
   */
  async checkOrganization(organizationId) {
    try {
      // Find all materials below threshold
      const lowStockMaterials = await RawMaterial.find({
        organizationId,
        status: 'ACTIVE',
        $or: [
          { $expr: { $lte: ['$currentStock', '$reorderPoint'] } },
          { $expr: { $lte: ['$currentStock', '$minStockLevel'] } },
        ],
      });

      let suggestionsCreated = 0;

      for (const material of lowStockMaterials) {
        // Check if a pending suggestion already exists for this material
        const existingSuggestion = await InventorySuggestion.findOne({
          organizationId,
          rawMaterial: material._id,
          status: 'pending',
        });

        if (existingSuggestion) {
          // Skip if suggestion already exists
          continue;
        }

        // Create new suggestion
        const suggestion = await this.createSuggestion(material);
        if (suggestion) {
          suggestionsCreated++;
        }
      }

      return suggestionsCreated;

    } catch (error) {
      console.error(`[Inventory Monitor] Error checking organization ${organizationId}:`, error);
      return 0;
    }
  }

  /**
   * Create a suggestion for a low stock material
   */
  async createSuggestion(material) {
    try {
      // Calculate stock percentage
      const threshold = material.reorderPoint || material.minStockLevel;
      const stockPercentage = threshold > 0
        ? (material.currentStock / threshold) * 100
        : 0;

      // Determine priority
      const priority = this.calculatePriority(stockPercentage);

      // Generate AI message
      const message = this.generateMessage(material, stockPercentage, priority);

      // Calculate suggested quantity
      const suggestedQuantity = this.calculateSuggestedQuantity(material);

      // Get vendor recommendations
      const recommendedVendors = await vendorRecommendationService.getRecommendations(
        material._id,
        material.organizationId
      );

      // Create suggestion
      const suggestion = new InventorySuggestion({
        organizationId: material.organizationId,
        rawMaterial: material._id,
        materialName: material.name,
        materialCode: material.materialCode,
        category: material.category,
        currentStock: material.currentStock,
        minThreshold: material.minStockLevel,
        reorderPoint: material.reorderPoint,
        suggestedQuantity,
        unit: material.uom,
        status: 'pending',
        priority,
        message,
        metadata: {
          detectedAt: new Date(),
          reason: stockPercentage < 50 ? 'critically_low' : 'below_threshold',
          stockPercentage: Math.round(stockPercentage),
        },
        recommendedVendors,
      });

      await suggestion.save();
      console.log(`[Inventory Monitor] Created suggestion for ${material.name} (${material.materialCode})`);

      // Send Email Alert
      try {
        const users = await User.find({
          organizationId: material.organizationId,
          role: { $in: ['Admin', 'Inventory Manager'] }
        });

        if (users.length > 0) {
          await EmailService.sendLowStockAlert(material, users);
          console.log(`[Inventory Monitor] Sent low stock alert to ${users.length} users`);
        }
      } catch (emailErr) {
        console.error(`[Inventory Monitor] Failed to send email alert:`, emailErr.message);
      }

      return suggestion;
    } catch (error) {
      console.error(`[Inventory Monitor] Error creating suggestion for ${material.name}:`, error);
      return null;
    }
  }

  /**
   * Calculate priority based on stock percentage
   */
  calculatePriority(stockPercentage) {
    if (stockPercentage < 25) return 'critical';
    if (stockPercentage < 50) return 'high';
    if (stockPercentage < 75) return 'medium';
    return 'low';
  }

  /**
   * Generate AI-friendly message
   */
  generateMessage(material, stockPercentage, priority) {
    const materialName = material.name;
    const currentStock = material.currentStock;
    const unit = material.uom || 'units';

    let emoji = '⚠️';
    let tone = 'is running low';

    if (priority === 'critical') {
      emoji = '🚨';
      tone = 'is critically low';
    } else if (priority === 'high') {
      emoji = '⚠️';
      tone = 'is running very low';
    } else if (priority === 'medium') {
      emoji = '⚡';
      tone = 'is approaching minimum level';
    } else {
      emoji = '💡';
      tone = 'is below reorder point';
    }

    return `${emoji} Stock Alert: ${materialName} ${tone} (${currentStock} ${unit} remaining). Would you like to create a Purchase Order?`;
  }

  /**
   * Calculate suggested order quantity
   */
  calculateSuggestedQuantity(material) {
    // Use reorder quantity if defined
    if (material.reorderQuantity && material.reorderQuantity > 0) {
      return material.reorderQuantity;
    }

    // Otherwise, calculate based on threshold
    const minStock = material.minStockLevel || 0;
    const currentStock = material.currentStock || 0;

    // Suggest enough to reach 2x minimum stock
    const targetStock = minStock * 2;
    const suggestedQty = Math.max(targetStock - currentStock, minStock);

    // Round up to nearest 10 for cleaner numbers
    return Math.ceil(suggestedQty / 10) * 10;
  }

  /**
   * Get low stock items for an organization
   */
  async getLowStockItems(organizationId) {
    try {
      const lowStockMaterials = await RawMaterial.find({
        organizationId,
        status: 'ACTIVE',
        $or: [
          { $expr: { $lte: ['$currentStock', '$reorderPoint'] } },
          { $expr: { $lte: ['$currentStock', '$minStockLevel'] } },
        ],
      }).sort({ currentStock: 1 });

      return lowStockMaterials;

    } catch (error) {
      console.error('[Inventory Monitor] Error getting low stock items:', error);
      throw error;
    }
  }
}

module.exports = new InventoryMonitoringService();
