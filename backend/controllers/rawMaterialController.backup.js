const RawMaterial = require('../models/vlite/RawMaterial');
const logger = require('../utils/logger');
const xlsx = require('xlsx');

/**
 * @desc    Get all raw materials
 * @route   GET /api/rawmaterial
 * @access  Private
 */
exports.getAllRawMaterials = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const materials = await RawMaterial.find({
      organizationId,
      isDeleted: false
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: materials.length,
      data: materials,
    });
  } catch (error) {
    logger.error('Error fetching raw materials:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching raw materials',
      error: error.message,
    });
  }
};

/**
 * @desc    Get raw materials by category
 * @route   GET /api/rawmaterial/category/:category
 * @access  Private
 */
exports.getRawMaterialsByCategory = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { category } = req.params;

    const materials = await RawMaterial.find({
      organizationId,
      category,
      isDeleted: false
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: materials.length,
      data: materials,
    });
  } catch (error) {
    logger.error('Error fetching raw materials by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching raw materials',
      error: error.message,
    });
  }
};

/**
 * @desc    Get single raw material
 * @route   GET /api/rawmaterial/:id
 * @access  Private
 */
exports.getRawMaterial = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const material = await RawMaterial.findOne({
      _id: req.params.id,
      organizationId,
      isDeleted: false,
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Raw material not found',
      });
    }

    res.status(200).json({
      success: true,
      data: material,
    });
  } catch (error) {
    logger.error('Error fetching raw material:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching raw material',
      error: error.message,
    });
  }
};

/**
 * @desc    Create new raw material
 * @route   POST /api/rawmaterial
 * @access  Private
 */
exports.createRawMaterial = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const materialData = {
      ...req.body,
      organizationId,
    };

    const material = await RawMaterial.create(materialData);

    res.status(201).json({
      success: true,
      data: material,
    });
  } catch (error) {
    logger.error('Error creating raw material:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating raw material',
      error: error.message,
    });
  }
};

/**
 * @desc    Update raw material
 * @route   PUT /api/rawmaterial/:id
 * @access  Private
 */
exports.updateRawMaterial = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const material = await RawMaterial.findOneAndUpdate(
      {
        _id: req.params.id,
        organizationId,
        isDeleted: false,
      },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Raw material not found',
      });
    }

    res.status(200).json({
      success: true,
      data: material,
    });
  } catch (error) {
    logger.error('Error updating raw material:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating raw material',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete raw material
 * @route   DELETE /api/rawmaterial/:id
 * @access  Private
 */
exports.deleteRawMaterial = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const material = await RawMaterial.findOneAndUpdate(
      {
        _id: req.params.id,
        organizationId,
        isDeleted: false,
      },
      { isDeleted: true },
      { new: true }
    );

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Raw material not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Raw material deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting raw material:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting raw material',
      error: error.message,
    });
  }
};

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/rawmaterial/stats/dashboard
 * @access  Private
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const { organizationId } = req.user;

    const materials = await RawMaterial.find({
      organizationId,
      isDeleted: false
    });

    const stats = {
      total: materials.length,
      byCategory: {},
      byStatus: {
        'ACTIVE': 0,
        'DISCONTINUED': 0,
        'OUT_OF_STOCK': 0,
      },
      totalValue: 0,
    };

    materials.forEach(material => {
      // Count by category
      if (!stats.byCategory[material.category]) {
        stats.byCategory[material.category] = 0;
      }
      stats.byCategory[material.category]++;

      // Count by status
      if (stats.byStatus[material.status] !== undefined) {
        stats.byStatus[material.status]++;
      }

      // Calculate total value
      stats.totalValue += (material.currentStock || 0) * (material.costPrice || 0);
    });

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message,
    });
  }
};

/**
 * @desc    Get price book data (materials with purchase history)
 * @route   GET /api/rawmaterial/price-book
 * @access  Private
 */
exports.getPriceBook = async (req, res) => {
  try {
    const { organizationId } = req.user;

    const materials = await RawMaterial.find({
      organizationId,
      isDeleted: false
    })
      .select('materialCode name category specifications uom currentPrice costPrice priceHistory updatedAt')
      .sort({ updatedAt: -1 });

    // Transform data to include latest price and vendor info
    const priceBookData = materials.map(material => {
      const latestPurchase = material.priceHistory && material.priceHistory.length > 0
        ? material.priceHistory[material.priceHistory.length - 1]
        : null;

      return {
        _id: material._id,
        materialCode: material.materialCode,
        name: material.name,
        category: material.category,
        specifications: material.specifications,
        uom: material.uom,
        currentPrice: material.costPrice || 0,
        costPrice: material.costPrice || 0, // Add this for frontend compatibility
        sellingPrice: material.sellingPrice || 0, // Add selling price too
        priceHistory: material.priceHistory || [],
        lastUpdated: latestPurchase?.date || material.updatedAt,
        updatedAt: material.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      count: priceBookData.length,
      data: priceBookData,
    });
  } catch (error) {
    logger.error('Error fetching price book:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching price book data',
      error: error.message,
    });
  }
};

/**
 * @desc    Get price book statistics
 * @route   GET /api/rawmaterial/price-book/stats
 * @access  Private
 */
exports.getPriceBookStats = async (req, res) => {
  try {
    const { organizationId } = req.user;

    const materials = await RawMaterial.find({
      organizationId,
      isDeleted: false
    });

    const stats = {
      totalMaterials: materials.length,
      avgPrice: 0,
      recentUpdates: 0,
      byCategory: {},
    };

    let totalPrice = 0;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    materials.forEach(material => {
      // Calculate average price
      if (material.costPrice) {
        totalPrice += material.costPrice;
      }

      // Count recent updates
      if (material.priceHistory && material.priceHistory.length > 0) {
        const latestUpdate = material.priceHistory[material.priceHistory.length - 1];
        if (new Date(latestUpdate.date) >= oneMonthAgo) {
          stats.recentUpdates++;
        }
      }

      // Count by category
      if (!stats.byCategory[material.category]) {
        stats.byCategory[material.category] = {
          count: 0,
          totalPrice: 0,
          avgPrice: 0,
        };
      }
      stats.byCategory[material.category].count++;
      if (material.costPrice) {
        stats.byCategory[material.category].totalPrice += material.costPrice;
      }
    });

    // Calculate averages
    stats.avgPrice = materials.length > 0 ? Math.round(totalPrice / materials.length) : 0;

    Object.keys(stats.byCategory).forEach(category => {
      const cat = stats.byCategory[category];
      cat.avgPrice = cat.count > 0 ? Math.round(cat.totalPrice / cat.count) : 0;
      delete cat.totalPrice; // Remove total price from response
    });

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error fetching price book stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching price book statistics',
      error: error.message,
    });
  }
};

/**
 * @desc    Update material price and add to history
 * @route   POST /api/rawmaterial/price-book/:id/update-price
 * @access  Private
 */
exports.updateMaterialPrice = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const {
      name,
      materialCode,
      category,
      brand,
      finish,
      color,
      thickness,
      length,
      width,
      uom,
      price,
      sellingPrice,
      vendor,
      vendorContact,
      quantity,
      notes,
      date
    } = req.body;

    const material = await RawMaterial.findOne({
      _id: id,
      organizationId,
      isDeleted: false,
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
      });
    }

    // Update basic material fields
    if (name) material.name = name;
    if (materialCode) material.materialCode = materialCode;
    if (category) material.category = category;
    if (uom) material.uom = uom;

    // Update specifications
    if (!material.specifications) {
      material.specifications = {};
    }
    if (brand !== undefined) material.specifications.brand = brand;
    if (finish !== undefined) material.specifications.finish = finish;
    if (color !== undefined) material.specifications.color = color;
    if (thickness !== undefined) material.specifications.thickness = thickness;
    if (length !== undefined) material.specifications.length = length;
    if (width !== undefined) material.specifications.width = width;

    // Update pricing - handle 0 values properly
    if (price !== undefined && price !== null && price !== '') {
      material.costPrice = parseFloat(price);
    }
    // Allow 0 for selling price
    if (sellingPrice !== undefined && sellingPrice !== null) {
      material.sellingPrice = parseFloat(sellingPrice);
    }

    // Only add to price history if vendor details are provided
    // This prevents unnecessary history entries during simple edits
    if (vendor && price) {
      const priceEntry = {
        date: date || new Date(),
        price: parseFloat(price),
        vendor: vendor,
        vendorContact: vendorContact || '',
        quantity: quantity ? parseInt(quantity) : null,
        notes: notes || '',
      };

      if (!material.priceHistory) {
        material.priceHistory = [];
      }

      material.priceHistory.push(priceEntry);
    }

    await material.save();

    res.status(200).json({
      success: true,
      message: 'Material updated successfully',
      data: material,
    });
  } catch (error) {
    logger.error('Error updating material:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating material',
      error: error.message,
    });
  }
};

/**
 * @desc    Import raw materials from Excel file with AI-powered intelligent parsing
 * @route   POST /api/rawmaterial/import
 * @access  Private
 */
exports.importFromExcel = async (req, res) => {
  try {
    const { organizationId } = req.user;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Read the Excel file from buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rawData = xlsx.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: null
    });

    if (!rawData || rawData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty or invalid',
      });
    }

    logger.info(`Processing ${rawData.length} rows from Excel file`);

    // Helper function to normalize column names (case-insensitive matching)
    const normalizeColumnName = (str) => {
      return str?.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    };

    // Helper function to find column value by possible names
    const findColumnValue = (row, possibleNames) => {
      for (const name of possibleNames) {
        const normalized = normalizeColumnName(name);
        for (const key in row) {
          if (normalizeColumnName(key) === normalized) {
            return row[key];
          }
        }
      }
      return null;
    };

    // Helper function to parse category
    const parseCategory = (value) => {
      if (!value) return 'OTHER';
      const val = value.toString().toUpperCase().trim();

      const categoryMap = {
        'PANEL': ['PANEL', 'PANELS', 'BOARD', 'PLYWOOD'],
        'LAMINATE': ['LAMINATE', 'LAMINATES', 'LAMINATION'],
        'EDGEBAND': ['EDGEBAND', 'EDGE BAND', 'EDGEBANDING', 'EDGE'],
        'HARDWARE': ['HARDWARE', 'HARDWARES'],
        'GLASS': ['GLASS', 'GLASSES'],
        'FABRIC': ['FABRIC', 'FABRICS', 'CLOTH'],
        'ALUMINIUM': ['ALUMINIUM', 'ALUMINUM', 'AL'],
        'PROCESSED_PANEL': ['PROCESSED PANEL', 'PROCESSED_PANEL', 'PROCESSED'],
        'HANDLES': ['HANDLE', 'HANDLES'],
        'HINGES': ['HINGE', 'HINGES'],
        'SLIDES': ['SLIDE', 'SLIDES', 'SLIDER'],
        'ADHESIVE': ['ADHESIVE', 'ADHESIVES', 'GLUE'],
        'FINISHING': ['FINISHING', 'FINISH'],
        'PACKAGING': ['PACKAGING', 'PACKING'],
      };

      for (const [category, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(keyword => val.includes(keyword))) {
          return category;
        }
      }

      return 'OTHER';
    };

    // Helper function to parse UOM
    const parseUOM = (value) => {
      if (!value) return 'PCS';
      const val = value.toString().toUpperCase().trim();

      const uomMap = {
        'PCS': ['PCS', 'PIECE', 'PIECES', 'NOS', 'NUMBER'],
        'SHEET': ['SHEET', 'SHEETS'],
        'SQM': ['SQM', 'SQ.M', 'SQ M', 'SQUARE METER', 'M2'],
        'SQF': ['SQF', 'SQFT', 'SQ.FT', 'SQ FT', 'SQUARE FEET', 'FT2'],
        'METER': ['METER', 'METRE', 'M', 'MTR'],
        'FEET': ['FEET', 'FT', 'FOOT'],
        'KG': ['KG', 'KILOGRAM', 'KILO'],
        'LITER': ['LITER', 'LITRE', 'L', 'LTR'],
        'BOX': ['BOX', 'BOXES'],
        'SET': ['SET', 'SETS'],
      };

      for (const [uom, keywords] of Object.entries(uomMap)) {
        if (keywords.some(keyword => val === keyword || val.includes(keyword))) {
          return uom;
        }
      }

      return 'PCS';
    };

    // Helper function to parse status
    const parseStatus = (value) => {
      if (!value) return 'ACTIVE';
      const val = value.toString().toUpperCase().trim();

      if (val.includes('DISCONTINUED') || val.includes('INACTIVE') || val.includes('DISABLE')) {
        return 'DISCONTINUED';
      }
      if (val.includes('OUT OF STOCK') || val.includes('OUT_OF_STOCK') || val.includes('OUTOFSTOCK')) {
        return 'OUT_OF_STOCK';
      }
      return 'ACTIVE';
    };

    // Parse and validate materials
    const materials = [];
    const errors = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];

      try {
        // Extract name (required)
        const name = findColumnValue(row, [
          'name', 'material name', 'materialname', 'item name', 'itemname', 'product name', 'productname'
        ]);

        if (!name || name.toString().trim() === '') {
          errors.push(`Row ${i + 2}: Material name is required`);
          continue;
        }

        // Extract category
        const categoryValue = findColumnValue(row, [
          'category', 'type', 'material type', 'materialtype', 'item type', 'itemtype'
        ]);
        const category = parseCategory(categoryValue);

        // Extract specifications
        const brand = findColumnValue(row, ['brand', 'manufacturer', 'make']);
        const thickness = findColumnValue(row, ['thickness', 'thick']);
        const width = findColumnValue(row, ['width', 'breadth']);
        const length = findColumnValue(row, ['length', 'size']);
        const color = findColumnValue(row, ['color', 'colour', 'shade']);
        const finish = findColumnValue(row, ['finish', 'finishing', 'surface']);
        const grade = findColumnValue(row, ['grade', 'quality']);

        // Extract UOM
        const uomValue = findColumnValue(row, ['uom', 'unit', 'measure', 'measurement']);
        const uom = parseUOM(uomValue);

        // Extract pricing (required)
        const costPriceValue = findColumnValue(row, [
          'cost price', 'costprice', 'cost', 'price', 'rate', 'purchase price', 'purchaseprice'
        ]);
        const costPrice = costPriceValue ? parseFloat(costPriceValue.toString().replace(/[^0-9.]/g, '')) : null;

        if (!costPrice || isNaN(costPrice) || costPrice < 0) {
          errors.push(`Row ${i + 2}: Valid cost price is required`);
          continue;
        }

        const sellingPriceValue = findColumnValue(row, [
          'selling price', 'sellingprice', 'sale price', 'saleprice', 'mrp'
        ]);
        const sellingPrice = sellingPriceValue ? parseFloat(sellingPriceValue.toString().replace(/[^0-9.]/g, '')) : null;

        // Extract stock information
        const currentStockValue = findColumnValue(row, [
          'current stock', 'currentstock', 'stock', 'quantity', 'qty', 'available stock'
        ]);
        const currentStock = currentStockValue ? parseFloat(currentStockValue.toString().replace(/[^0-9.]/g, '')) : 0;

        const minStockValue = findColumnValue(row, [
          'min stock', 'minstock', 'minimum stock', 'minimumstock', 'min'
        ]);
        const minStockLevel = minStockValue ? parseFloat(minStockValue.toString().replace(/[^0-9.]/g, '')) : 0;

        const maxStockValue = findColumnValue(row, [
          'max stock', 'maxstock', 'maximum stock', 'maximumstock', 'max'
        ]);
        const maxStockLevel = maxStockValue ? parseFloat(maxStockValue.toString().replace(/[^0-9.]/g, '')) : 0;

        const reorderValue = findColumnValue(row, [
          'reorder', 'reorder point', 'reorderpoint', 'reorder level', 'reorderlevel'
        ]);
        const reorderPoint = reorderValue ? parseFloat(reorderValue.toString().replace(/[^0-9.]/g, '')) : 0;

        // Extract status
        const statusValue = findColumnValue(row, ['status', 'state', 'active']);
        const status = parseStatus(statusValue);

        // Extract other fields
        const materialCode = findColumnValue(row, ['material code', 'materialcode', 'code', 'item code', 'itemcode']);
        const description = findColumnValue(row, ['description', 'desc', 'details']);
        const notes = findColumnValue(row, ['notes', 'note', 'remarks', 'remark', 'comment']);

        // Build material object
        const material = {
          organizationId,
          name: name.toString().trim(),
          category,
          uom,
          costPrice,
          currentStock,
          minStockLevel,
          maxStockLevel,
          reorderPoint,
          status,
          specifications: {},
        };

        // Add optional fields
        if (materialCode) material.materialCode = materialCode.toString().trim();
        if (sellingPrice && sellingPrice > 0) material.sellingPrice = sellingPrice;
        if (description) material.description = description.toString().trim();
        if (notes) material.notes = notes.toString().trim();

        // Add specifications if they exist
        if (brand) material.specifications.brand = brand.toString().trim();
        if (thickness) material.specifications.thickness = thickness.toString().trim();
        if (width) material.specifications.width = width.toString().trim();
        if (length) material.specifications.length = length.toString().trim();
        if (color) material.specifications.color = color.toString().trim();
        if (finish) material.specifications.finish = finish.toString().trim();
        if (grade) material.specifications.grade = grade.toString().trim();

        materials.push(material);
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
        logger.error(`Error processing row ${i + 2}:`, error);
      }
    }

    if (materials.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid materials found in the Excel file',
        errors,
      });
    }

    // Insert materials into database
    const insertedMaterials = [];
    const insertErrors = [];

    for (let i = 0; i < materials.length; i++) {
      try {
        const material = await RawMaterial.create(materials[i]);
        insertedMaterials.push(material);
      } catch (error) {
        insertErrors.push({
          material: materials[i].name,
          error: error.message,
        });
        logger.error(`Error inserting material ${materials[i].name}:`, error);
      }
    }

    logger.info(`Successfully imported ${insertedMaterials.length} materials out of ${materials.length}`);

    res.status(200).json({
      success: true,
      message: `Successfully imported ${insertedMaterials.length} materials`,
      data: {
        totalRows: rawData.length,
        validRows: materials.length,
        imported: insertedMaterials.length,
        failed: insertErrors.length,
        materials: insertedMaterials,
      },
      errors: [...errors, ...insertErrors.map(e => `${e.material}: ${e.error}`)],
    });
  } catch (error) {
    logger.error('Error importing from Excel:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing materials from Excel file',
      error: error.message,
    });
  }
};
