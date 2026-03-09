const Vendor = require('../models/vlite/Vendor');
const RawMaterial = require('../models/vlite/RawMaterial');
const logger = require('../utils/logger');

/**
 * Helper function to sync vendor purchase with Price Book
 * Maps vendor material purchase to RawMaterial (Price Book)
 * If same vendor + same material exists, add to price history
 * Otherwise create new entry
 */
const syncToPriceBook = async (organizationId, vendorName, vendorContact, purchase) => {
  try {
    // Map material name to category
    const categoryMap = {
      'panel': 'PANEL',
      'laminate': 'LAMINATE',
      'edgeband': 'EDGEBAND',
      'hardware': 'HARDWARE',
      'glass': 'GLASS',
      'fabric': 'FABRIC',
      'aluminium': 'ALUMINIUM',
      'aluminum': 'ALUMINIUM',
      'processed panel': 'PROCESSED_PANEL',
      'handles': 'HANDLES',
      'hinges': 'HINGES',
      'slides': 'SLIDES',
      'adhesive': 'ADHESIVE',
      'finishing': 'FINISHING',
      'packaging': 'PACKAGING'
    };

    // Determine category from materialName or itemName
    const searchTerm = (purchase.materialName || purchase.itemName || '').toLowerCase();
    let category = 'OTHER';

    for (const [key, value] of Object.entries(categoryMap)) {
      if (searchTerm.includes(key)) {
        category = value;
        break;
      }
    }

    // Check if material from SAME VENDOR already exists
    // Match by: organizationId, name, category, brand, vendor name
    const materialQuery = {
      organizationId,
      name: purchase.itemName,
      category,
      'priceHistory.vendor': vendorName // Check if this vendor already has entry
    };

    if (purchase.brand) {
      materialQuery['specifications.brand'] = purchase.brand;
    }

    let material = await RawMaterial.findOne(materialQuery);

    if (material) {
      // Same vendor + same material found
      // Add new purchase to price history
      material.priceHistory.push({
        date: purchase.purchaseDate || new Date(),
        price: purchase.unitPrice,
        vendor: vendorName,
        vendorContact: vendorContact || '',
        quantity: purchase.quantity,
        notes: `Auto-synced from vendor purchase history`
      });

      // Update cost price to latest
      material.costPrice = purchase.unitPrice;

      // Update specifications if provided
      if (purchase.finish) material.specifications.finish = purchase.finish;
      if (purchase.thickness) material.specifications.thickness = purchase.thickness;
      if (purchase.length) material.specifications.length = purchase.length;
      if (purchase.width) material.specifications.width = purchase.width;
      if (purchase.brand) material.specifications.brand = purchase.brand;

      await material.save();
      logger.info(`Updated existing material in Price Book: ${material.name} - Added purchase history`);
    } else {
      // Different vendor OR new material
      // Create new Price Book entry
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 1000);
      const materialCode = `${category.substring(0, 3)}-${timestamp}-${randomSuffix}`;

      const newMaterial = new RawMaterial({
        organizationId,
        name: purchase.itemName,
        category,
        materialCode,
        specifications: {
          brand: purchase.brand || '',
          finish: purchase.finish || '',
          thickness: purchase.thickness || '',
          length: purchase.length || '',
          width: purchase.width || ''
        },
        uom: 'PCS', // Default
        costPrice: purchase.unitPrice,
        currency: 'INR',
        currentStock: 0,
        priceHistory: [{
          date: purchase.purchaseDate || new Date(),
          price: purchase.unitPrice,
          vendor: vendorName,
          vendorContact: vendorContact || '',
          quantity: purchase.quantity,
          notes: `Auto-synced from vendor purchase history`
        }],
        status: 'ACTIVE'
      });

      await newMaterial.save();
      logger.info(`Created new material entry in Price Book: ${newMaterial.name} (${materialCode})`);
    }

    return { success: true };
  } catch (error) {
    logger.error('Error syncing to Price Book:', error);
    return { success: false, error: error.message };
  }
};

exports.getAllVendors = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    console.log('🔍 [getAllVendors] Received organizationId:', organizationId, typeof organizationId);

    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // Convert to ObjectId if needed - Mongoose handles this automatically
    // but we'll be explicit for debugging
    const mongoose = require('mongoose');
    let orgIdQuery = organizationId;

    // Try to convert to ObjectId if it's a valid ObjectId string
    if (mongoose.Types.ObjectId.isValid(organizationId)) {
      orgIdQuery = new mongoose.Types.ObjectId(organizationId);
      console.log('🔍 [getAllVendors] Converted to ObjectId:', orgIdQuery);
    }

    console.log('🔍 [getAllVendors] Querying with ObjectId:', orgIdQuery);

    const vendors = await Vendor.find({
      organizationId: orgIdQuery,
      isDeleted: { $ne: true }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log('📦 [getAllVendors] Found vendors:', vendors.length);

    const total = await Vendor.countDocuments({
      organizationId: orgIdQuery,
      isDeleted: { $ne: true }
    });

    console.log('📊 [getAllVendors] Total count:', total);

    res.status(200).json({
      success: true,
      data: vendors,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching vendors:', error);
    res.status(500).json({ success: false, message: 'Error fetching vendors', error: error.message });
  }
};

exports.getVendorById = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const vendor = await Vendor.findOne({ _id: req.params.id, organizationId });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    logger.error('Error fetching vendor:', error);
    res.status(500).json({ success: false, message: 'Error fetching vendor', error: error.message });
  }
};

exports.createVendor = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    logger.info('Creating vendor with data:', JSON.stringify(req.body, null, 2));

    const vendorData = { ...req.body, organizationId };
    const vendor = new Vendor(vendorData);

    logger.info('Saving vendor to database...');
    await vendor.save();
    logger.info('Vendor saved successfully:', vendor._id);

    // Sync purchase history to Price Book if exists
    if (vendor.purchaseHistory && vendor.purchaseHistory.length > 0) {
      logger.info(`Syncing ${vendor.purchaseHistory.length} purchase entries to Price Book`);
      for (const purchase of vendor.purchaseHistory) {
        await syncToPriceBook(organizationId, vendor.vendorName, vendor.contactNumber, purchase);
      }
      logger.info(`Synced ${vendor.purchaseHistory.length} purchase entries to Price Book`);
    }

    res.status(201).json({ success: true, data: vendor, message: 'Vendor created successfully and synced to Price Book' });
  } catch (error) {
    logger.error('Error creating vendor:', error);
    logger.error('Error stack:', error.stack);
    logger.error('Error message:', error.message);
    if (error.errors) {
      logger.error('Validation errors:', JSON.stringify(error.errors, null, 2));
    }

    // Check for duplicate vendor ID error
    if (error.code === 11000 && error.message.includes('vendorId')) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID already exists. Please use a different Vendor ID.',
        error: 'Duplicate vendor ID'
      });
    }

    res.status(500).json({ success: false, message: 'Error creating vendor', error: error.message });
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const vendor = await Vendor.findOne({ _id: req.params.id, organizationId });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        vendor[key] = req.body[key];
      }
    });

    vendor.updatedAt = Date.now();
    await vendor.save();

    res.status(200).json({ success: true, data: vendor, message: 'Vendor updated successfully' });
  } catch (error) {
    logger.error('Error updating vendor:', error);
    res.status(500).json({ success: false, message: 'Error updating vendor', error: error.message });
  }
};

exports.deleteVendor = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const vendor = await Vendor.findOneAndDelete({ _id: req.params.id, organizationId });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    res.status(200).json({ success: true, message: 'Vendor deleted successfully' });
  } catch (error) {
    logger.error('Error deleting vendor:', error);
    res.status(500).json({ success: false, message: 'Error deleting vendor', error: error.message });
  }
};

exports.addPurchaseRecord = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const vendor = await Vendor.findOne({ _id: req.params.id, organizationId });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const purchase = req.body;

    // Ensure numeric fields are properly parsed
    const totalAmount = parseFloat(purchase.totalAmount) || 0;
    const amountPaid = parseFloat(purchase.amountPaid) || 0;
    const balance = parseFloat(purchase.balance) || 0;
    const quantity = parseFloat(purchase.quantity) || 0;
    const unitPrice = parseFloat(purchase.unitPrice) || 0;

    // Create purchase entry with parsed values
    const purchaseEntry = {
      ...purchase,
      totalAmount,
      amountPaid,
      balance,
      quantity,
      unitPrice
    };

    vendor.purchaseHistory.push(purchaseEntry);

    // Update vendor totals with safe numeric operations
    vendor.totalAmount = (vendor.totalAmount || 0) + totalAmount;
    vendor.paidAmount = (vendor.paidAmount || 0) + amountPaid;
    vendor.balance = vendor.totalAmount - vendor.paidAmount;

    if (vendor.balance === 0) {
      vendor.paymentStatus = 'Done';
    } else if (vendor.paidAmount > 0 && vendor.balance > 0) {
      vendor.paymentStatus = 'Half';
    } else {
      vendor.paymentStatus = 'Pending';
    }

    vendor.updatedAt = Date.now();
    await vendor.save();

    // Sync to Price Book
    await syncToPriceBook(organizationId, vendor.vendorName, vendor.contactNumber, purchaseEntry);

    res.status(200).json({ success: true, data: vendor, message: 'Purchase record added and synced to Price Book' });
  } catch (error) {
    logger.error('Error adding purchase record:', error);
    res.status(500).json({ success: false, message: 'Error adding purchase record', error: error.message });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const { paymentAmount } = req.body;
    const vendor = await Vendor.findOne({ _id: req.params.id, tenantId });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    vendor.paidAmount += paymentAmount;
    vendor.balance = vendor.totalAmount - vendor.paidAmount;

    if (vendor.balance === 0) {
      vendor.paymentStatus = 'Done';
    } else if (vendor.paidAmount > 0 && vendor.balance > 0) {
      vendor.paymentStatus = 'Half';
    }

    vendor.updatedAt = Date.now();
    await vendor.save();

    res.status(200).json({ success: true, data: vendor, message: 'Payment updated successfully' });
  } catch (error) {
    logger.error('Error updating payment:', error);
    res.status(500).json({ success: false, message: 'Error updating payment' });
  }
};

exports.updatePurchaseHistory = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    if (!organizationId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const { vendorId, purchaseId } = req.params;
    const updatedData = req.body;

    const vendor = await Vendor.findOne({ _id: vendorId, organizationId });
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const purchaseIndex = vendor.purchaseHistory.findIndex(
      p => p._id.toString() === purchaseId
    );

    if (purchaseIndex === -1) {
      return res.status(404).json({ success: false, message: 'Purchase history entry not found' });
    }

    const oldPurchase = vendor.purchaseHistory[purchaseIndex];

    // Update the purchase history entry
    Object.keys(updatedData).forEach(key => {
      if (updatedData[key] !== undefined) {
        vendor.purchaseHistory[purchaseIndex][key] = updatedData[key];
      }
    });

    // Recalculate vendor totals
    const totalDiff = (updatedData.totalAmount || oldPurchase.totalAmount) - oldPurchase.totalAmount;
    const paidDiff = (updatedData.amountPaid || oldPurchase.amountPaid) - oldPurchase.amountPaid;

    vendor.totalAmount += totalDiff;
    vendor.paidAmount += paidDiff;
    vendor.balance = vendor.totalAmount - vendor.paidAmount;

    // Update payment status
    if (vendor.balance === 0) {
      vendor.paymentStatus = 'Done';
    } else if (vendor.paidAmount > 0 && vendor.balance > 0) {
      vendor.paymentStatus = 'Half';
    } else {
      vendor.paymentStatus = 'Pending';
    }

    vendor.updatedAt = Date.now();
    await vendor.save();

    // Sync updated purchase to Price Book
    const updatedPurchase = vendor.purchaseHistory[purchaseIndex];
    await syncToPriceBook(organizationId, vendor.vendorName, vendor.contactNumber, updatedPurchase);

    res.status(200).json({
      success: true,
      data: vendor,
      message: 'Purchase history updated and synced to Price Book'
    });
  } catch (error) {
    logger.error('Error updating purchase history:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating purchase history',
      error: error.message
    });
  }
};
