const Product = require('../models/vlite/Product');
const mongoose = require('mongoose');

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const { search, category, page = 1, limit = 1000 } = req.query;

    const query = { organizationId: new mongoose.Types.ObjectId(organizationId) };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { productCode: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      Product.find(query)
        .select('name productCode category pricing.sellingPrice description specifications')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(query)
    ]);

    // debug log
    console.log(`[DEBUG] Fetched ${products.length} products for org ${organizationId}`);
    if (products.length > 0) {
      console.log('[DEBUG] Categories found:', [...new Set(products.map(p => p.category))]);
      // Count per category
      const counts = products.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1;
        return acc;
      }, {});
      console.log('[DEBUG] Product counts by category:', counts);
    }

    res.status(200).json({
      success: true,
      data: products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-tenant-id'];

    const product = await Product.findOne({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(organizationId)
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
};

// Create new product
exports.createProduct = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const productData = {
      ...req.body,
      organizationId: new mongoose.Types.ObjectId(organizationId)
    };

    // Validate required fields
    if (!productData.name) {
      return res.status(400).json({ message: 'Product name is required' });
    }

    if (!productData.category) {
      return res.status(400).json({ message: 'Product category is required' });
    }

    if (!productData.pricing || typeof productData.pricing.sellingPrice !== 'number') {
      return res.status(400).json({ message: 'Selling price is required' });
    }

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Error creating product:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Product code already exists',
        error: error.message
      });
    }

    res.status(500).json({
      message: 'Error creating product',
      error: error.message
    });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        organizationId: new mongoose.Types.ObjectId(organizationId)
      },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      message: 'Error updating product',
      error: error.message
    });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const product = await Product.findOneAndDelete({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(organizationId)
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      message: 'Error deleting product',
      error: error.message
    });
  }
};

