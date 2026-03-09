/**
 * Vendor Recommendation Service
 * Provides intelligent vendor recommendations for raw materials
 */

const Vendor = require('../models/vlite/Vendor');
const RawMaterial = require('../models/vlite/RawMaterial');

class VendorRecommendationService {
  
  /**
   * Get vendor recommendations for a specific raw material
   */
  async getRecommendations(materialId, organizationId) {
    try {
      // Get the material details
      const material = await RawMaterial.findOne({
        _id: materialId,
        organizationId,
      }).populate('primaryVendor alternateVendors');
      
      if (!material) {
        return [];
      }
      
      // Find vendors that supply this material category
      const vendors = await Vendor.find({
        organizationId,
        status: 'Active',
        suppliedMaterials: material.category,
      });
      
      // Build recommendations with metadata
      const recommendations = [];
      
      for (const vendor of vendors) {
        const vendorData = await this.buildVendorRecommendation(vendor, material);
        if (vendorData) {
          recommendations.push(vendorData);
        }
      }
      
      // Sort recommendations
      const sortedRecommendations = this.sortRecommendations(recommendations);
      
      return sortedRecommendations;
      
    } catch (error) {
      console.error('[Vendor Recommendation] Error getting recommendations:', error);
      return [];
    }
  }
  
  /**
   * Build vendor recommendation data with metadata
   */
  async buildVendorRecommendation(vendor, material) {
    try {
      // Check if this is the primary vendor
      const isPreferred = material.primaryVendor && 
        vendor._id.toString() === material.primaryVendor._id.toString();
      
      // Get last price from material's price history
      const lastPrice = this.getLastPriceFromMaterial(material, vendor.vendorName);
      
      // Get purchase history for this material from vendor
      const purchaseHistory = vendor.purchaseHistory || [];
      const materialPurchases = purchaseHistory.filter(
        p => p.materialName === material.name || p.itemName === material.name
      );
      
      // Calculate average delivery time (estimate based on vendor's lead time)
      const avgDeliveryTime = this.calculateAvgDeliveryTime(vendor, materialPurchases);
      
      // Get total orders count
      const totalOrders = materialPurchases.length || vendor.performance?.totalOrders || 0;
      
      return {
        vendorId: vendor._id,
        vendorName: vendor.vendorName,
        lastPrice: lastPrice || null,
        avgDeliveryTime,
        rating: vendor.rating || vendor.performance?.qualityRating || null,
        isPreferred,
        totalOrders,
      };
      
    } catch (error) {
      console.error('[Vendor Recommendation] Error building vendor data:', error);
      return null;
    }
  }
  
  /**
   * Get last price from material's price history
   */
  getLastPriceFromMaterial(material, vendorName) {
    if (!material.priceHistory || material.priceHistory.length === 0) {
      return material.costPrice;
    }
    
    // Find latest price from this vendor
    const vendorPrices = material.priceHistory
      .filter(p => p.vendor === vendorName)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (vendorPrices.length > 0) {
      return vendorPrices[0].price;
    }
    
    // Fallback to material's cost price
    return material.costPrice;
  }
  
  /**
   * Calculate average delivery time
   */
  calculateAvgDeliveryTime(vendor, materialPurchases) {
    // If we have purchase history, try to calculate from that
    if (materialPurchases.length > 0) {
      // This is a simplified calculation
      // In real scenario, you'd track actual delivery dates
      return vendor.leadTimeDays || 7; // Default 7 days
    }
    
    // Use vendor's lead time or default
    return vendor.leadTimeDays || vendor.paymentTerms?.creditDays || 7;
  }
  
  /**
   * Sort recommendations by priority
   * Priority order: Preferred > Best Price > Best Rating > Most Orders
   */
  sortRecommendations(recommendations) {
    return recommendations.sort((a, b) => {
      // Preferred vendors first
      if (a.isPreferred && !b.isPreferred) return -1;
      if (!a.isPreferred && b.isPreferred) return 1;
      
      // Then by price (lower is better)
      if (a.lastPrice && b.lastPrice) {
        if (a.lastPrice !== b.lastPrice) {
          return a.lastPrice - b.lastPrice;
        }
      }
      
      // Then by rating (higher is better)
      if (a.rating && b.rating) {
        if (a.rating !== b.rating) {
          return b.rating - a.rating;
        }
      }
      
      // Then by total orders (more is better)
      if (a.totalOrders !== b.totalOrders) {
        return b.totalOrders - a.totalOrders;
      }
      
      // Finally by delivery time (faster is better)
      return a.avgDeliveryTime - b.avgDeliveryTime;
    });
  }
  
  /**
   * Get detailed vendor information for PO creation
   */
  async getVendorDetails(vendorId, organizationId) {
    try {
      const vendor = await Vendor.findOne({
        _id: vendorId,
        organizationId,
      });
      
      if (!vendor) {
        throw new Error('Vendor not found');
      }
      
      return {
        id: vendor._id,
        name: vendor.vendorName,
        contactNumber: vendor.contactNumber,
        email: vendor.email,
        address: vendor.address,
        gstNumber: vendor.gstNumber,
        paymentTerms: vendor.paymentTerms,
        rating: vendor.rating,
        performance: vendor.performance,
      };
      
    } catch (error) {
      console.error('[Vendor Recommendation] Error getting vendor details:', error);
      throw error;
    }
  }
}

module.exports = new VendorRecommendationService();
