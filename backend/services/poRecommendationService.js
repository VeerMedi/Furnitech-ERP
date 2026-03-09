/**
 * Purchase Order Recommendation Service
 * Generates PO recommendations from inventory suggestions
 */

const PurchaseOrder = require('../models/vlite/PurchaseOrder');
const RawMaterial = require('../models/vlite/RawMaterial');
const vendorRecommendationService = require('./vendorRecommendationService');

class PORecommendationService {
  
  /**
   * Calculate suggested order quantity based on material data
   */
  calculateOrderQuantity(material, usageData = null) {
    // Use reorder quantity if defined
    if (material.reorderQuantity && material.reorderQuantity > 0) {
      return material.reorderQuantity;
    }
    
    // If we have usage data, calculate based on consumption rate
    if (usageData && usageData.avgMonthlyUsage > 0) {
      // Order enough for 2 months
      const twoMonthsSupply = usageData.avgMonthlyUsage * 2;
      return Math.ceil(twoMonthsSupply / 10) * 10; // Round to nearest 10
    }
    
    // Otherwise, calculate based on threshold
    const minStock = material.minStockLevel || 0;
    const currentStock = material.currentStock || 0;
    
    // Target: 2x minimum stock
    const targetStock = minStock * 2;
    const suggestedQty = Math.max(targetStock - currentStock, minStock);
    
    // Round up to nearest 10 for cleaner numbers
    return Math.ceil(suggestedQty / 10) * 10;
  }
  
  /**
   * Estimate delivery date based on vendor lead time
   */
  estimateDeliveryDate(vendor, customLeadTimeDays = null) {
    const leadTime = customLeadTimeDays || vendor.avgDeliveryTime || 7;
    
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + leadTime);
    
    return deliveryDate;
  }
  
  /**
   * Generate PO recommendation from suggestion
   */
  async generatePORecommendation(suggestion, vendorId = null) {
    try {
      // Get material details
      const material = await RawMaterial.findById(suggestion.rawMaterial);
      
      if (!material) {
        throw new Error('Material not found');
      }
      
      // Get vendor details
      let vendor;
      if (vendorId) {
        const vendorDetails = await vendorRecommendationService.getVendorDetails(
          vendorId,
          suggestion.organizationId
        );
        vendor = vendorDetails;
      } else {
        // Use first recommended vendor
        if (suggestion.recommendedVendors && suggestion.recommendedVendors.length > 0) {
          const firstVendor = suggestion.recommendedVendors[0];
          const vendorDetails = await vendorRecommendationService.getVendorDetails(
            firstVendor.vendorId,
            suggestion.organizationId
          );
          vendor = vendorDetails;
        } else {
          throw new Error('No vendors available');
        }
      }
      
      // Calculate quantity
      const quantity = suggestion.suggestedQuantity || this.calculateOrderQuantity(material);
      
      // Get recommended vendor data for delivery estimate
      const recommendedVendor = suggestion.recommendedVendors.find(
        v => v.vendorId.toString() === vendor.id.toString()
      );
      
      // Estimate delivery date
      const estimatedDelivery = this.estimateDeliveryDate(recommendedVendor || {});
      
      // Get unit price
      const unitPrice = recommendedVendor?.lastPrice || material.costPrice;
      
      // Calculate total
      const totalValue = quantity * unitPrice;
      
      return {
        material: {
          id: material._id,
          name: material.name,
          code: material.materialCode,
          category: material.category,
          uom: material.uom,
          currentStock: material.currentStock,
          minStock: material.minStockLevel,
        },
        vendor: {
          id: vendor.id,
          name: vendor.name,
          contact: vendor.contactNumber,
          email: vendor.email,
          gstNumber: vendor.gstNumber,
        },
        orderDetails: {
          quantity,
          unitPrice,
          totalValue,
          estimatedDelivery,
          currency: material.currency || 'INR',
        },
        suggestion: {
          id: suggestion._id,
          suggestionId: suggestion.suggestionId,
          priority: suggestion.priority,
          message: suggestion.message,
        },
      };
      
    } catch (error) {
      console.error('[PO Recommendation] Error generating recommendation:', error);
      throw error;
    }
  }
  
  /**
   * Create Purchase Order from suggestion
   */
  async createPOFromSuggestion(suggestionId, poData, userId) {
    try {
      const {
        vendorId,
        quantity,
        unitPrice,
        expectedDeliveryDate,
        notes,
      } = poData;
      
      // Get suggestion
      const InventorySuggestion = require('../models/vlite/InventorySuggestion');
      const suggestion = await InventorySuggestion.findById(suggestionId);
      
      if (!suggestion) {
        throw new Error('Suggestion not found');
      }
      
      if (suggestion.status !== 'pending') {
        throw new Error('Suggestion has already been processed');
      }
      
      // Get material
      const material = await RawMaterial.findById(suggestion.rawMaterial);
      
      if (!material) {
        throw new Error('Material not found');
      }
      
      // Generate PO number
      const poCount = await PurchaseOrder.countDocuments({
        organizationId: suggestion.organizationId,
      });
      const poNumber = `PO-${new Date().getFullYear()}-${String(poCount + 1).padStart(5, '0')}`;
      
      // Create PO
      const purchaseOrder = new PurchaseOrder({
        poNumber,
        vendor: vendorId,
        organizationId: suggestion.organizationId,
        createdBy: userId,
        items: [{
          product: suggestion.rawMaterial,
          description: material.name,
          quantity,
          unitPrice,
          expectedDeliveryDate,
          tax: 0, // Can be calculated based on GST
        }],
        currency: material.currency || 'INR',
        status: 'DRAFT',
        notes: notes || `Created from AI suggestion: ${suggestion.suggestionId}`,
      });
      
      // Calculate total
      purchaseOrder.recalculateTotal();
      
      await purchaseOrder.save();
      
      // Mark suggestion as confirmed
      await suggestion.markConfirmed(userId, purchaseOrder._id, notes);
      
      return purchaseOrder;
      
    } catch (error) {
      console.error('[PO Recommendation] Error creating PO:', error);
      throw error;
    }
  }
}

module.exports = new PORecommendationService();
