const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticate);

// Dashboard Stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Mock stats for now - you'll implement actual queries later
    const stats = {
      customers: 45,
      products: 120,
      inquiries: 12,
      orders: 8,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Customers
router.get('/customers', async (req, res) => {
  try {
    // Mock data - implement actual database queries later
    const customers = [
      {
        _id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+919876543210',
        company: 'ABC Corp',
        address: '123 Main St, Mumbai',
        createdAt: new Date(),
      },
      {
        _id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+919876543211',
        company: 'XYZ Ltd',
        address: '456 Park Ave, Delhi',
        createdAt: new Date(),
      },
    ];

    res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post('/customers', async (req, res) => {
  try {
    // Mock response - implement actual database insert later
    const customer = {
      _id: Date.now().toString(),
      ...req.body,
      createdAt: new Date(),
    };

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.put('/customers/:id', async (req, res) => {
  try {
    // Mock response - implement actual database update later
    const customer = {
      _id: req.params.id,
      ...req.body,
      updatedAt: new Date(),
    };

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.delete('/customers/:id', async (req, res) => {
  try {
    // Mock response - implement actual database delete later
    res.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Products
router.get('/products', async (req, res) => {
  try {
    const products = [];
    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Inquiries
router.get('/inquiries', async (req, res) => {
  try {
    const inquiries = [];
    res.json({
      success: true,
      data: inquiries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Orders
router.get('/orders', async (req, res) => {
  try {
    const orders = [];
    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
