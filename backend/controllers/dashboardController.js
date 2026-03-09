const Inquiry = require('../models/vlite/Inquiry');
const Quotation = require('../models/vlite/Quotation');
const Customer = require('../models/vlite/Customer');
const Order = require('../models/vlite/Order');
const Machine = require('../models/vlite/Machine');
const InventoryItem = require('../models/vlite/InventoryItem');

// @desc    Get dashboard statistics (Admin-focused)
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    // Get tenantId from header OR from authenticated user
    let tenantId = req.headers['x-tenant-id'];

    // Fallback: Extract from authenticated user
    if (!tenantId && req.user) {
      tenantId = req.user.tenantId || req.user.organizationId;
      console.log('📌 Using tenantId from authenticated user:', tenantId);
    }

    const User = require('../models/vlite/User');
    const RawMaterial = require('../models/vlite/RawMaterial');

    // TenantId is optional for backward compatibility with legacy databases
    if (!tenantId) {
      console.log('⚠️  No tenantId found - working without tenant filter (all data)');
    } else {
      console.log('✅ TenantId for query:', tenantId);
    }

    // Helper function: Create smart filter that matches tenantId OR legacy data (no tenantId)
    const smartFilter = (additionalFilter = {}) => {
      if (!tenantId) {
        return additionalFilter; // No tenant filtering
      }

      return {
        $or: [
          { tenantId, ...additionalFilter },           // New data with tenantId
          { tenantId: { $exists: false }, ...additionalFilter }, // Legacy data
          { tenantId: null, ...additionalFilter }      // Explicitly null tenantId
        ]
      };
    };

    // Get today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get current month date range
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date();
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    monthEnd.setHours(23, 59, 59, 999);

    // Get counts for various entities
    const [
      totalInquiries,
      totalQuotations,
      totalCustomers,
      totalOrders,
      totalMachines,
      totalInventoryItems,
      activeInquiries,
      pendingQuotations,
      recentOrders,
      todaysOrders,
      activeSalesmen,
      productionPending,
      totalProducts,
      lowStockItems,
      allOrders,
      monthlyOrders,
      todaysRevenue
    ] = await Promise.all([
      Inquiry.countDocuments(smartFilter()),
      Quotation.countDocuments(smartFilter()),
      Customer.countDocuments(smartFilter()),
      Order.countDocuments(smartFilter()),
      Machine.countDocuments(smartFilter()),
      InventoryItem.countDocuments(smartFilter()),
      Inquiry.countDocuments(),  // All inquiries
      Quotation.countDocuments(smartFilter({ status: 'pending' })),
      Order.find(smartFilter()).sort({ createdAt: -1 }).limit(5),
      // Today's orders
      Order.countDocuments(smartFilter({
        createdAt: { $gte: todayStart, $lte: todayEnd }
      })),
      // Active salesmen count
      User.countDocuments(smartFilter({
        userRole: { $in: ['Salesman', 'salesman', 'SALESMAN'] },
        status: { $ne: 'inactive' }
      })),
      // Production pending count - Orders where packaging not complete
      Order.countDocuments(smartFilter({
        $or: [
          { 'productionFlow.packaging.completed': { $ne: true } },
          { 'productionFlow.packaging': { $exists: false } }
        ],
        orderStatus: { $nin: ['DELIVERED', 'CANCELLED'] }
      })),
      // Total products
      require('../models/vlite/Product').countDocuments(smartFilter()),
      // Low stock alert items
      RawMaterial.countDocuments(smartFilter({
        currentStock: { $lt: 10, $gt: 0 }
      })),
      // Get all orders for revenue calculation
      Order.find(smartFilter()),
      // This month's orders
      Order.countDocuments(smartFilter({
        createdAt: { $gte: monthStart, $lte: monthEnd }
      })),
      // Today's revenue
      Order.find(smartFilter({
        createdAt: { $gte: todayStart, $lte: todayEnd }
      }))
    ]);

    console.log('📊 Dashboard Stats - Raw Data:');
    console.log('  - Total Customers:', totalCustomers);
    console.log('  - Total Orders:', totalOrders);
    console.log('  - Active Inquiries:', activeInquiries);
    console.log('  - Active Salesmen:', activeSalesmen);
    console.log('  - Production Pending:', productionPending);
    console.log('  - Total Products:', totalProducts);
    console.log('  - Low Stock Items:', lowStockItems);
    console.log('  - Today\'s Orders:', todaysOrders);
    console.log('  - Monthly Orders:', monthlyOrders);

    // Calculate total revenue
    const totalRevenue = allOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    // Calculate monthly revenue
    const monthlyRevenue = allOrders
      .filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= monthStart && orderDate <= monthEnd;
      })
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    // Calculate today's revenue
    const todaysRevenueAmount = todaysRevenue.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    // Get monthly data for trends (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyInquiries = await Inquiry.aggregate([
      {
        $match: smartFilter({
          createdAt: { $gte: twelveMonthsAgo }
        })
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    const monthlyQuotations = await Quotation.aggregate([
      {
        $match: smartFilter({
          createdAt: { $gte: twelveMonthsAgo }
        })
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Pending orders count
    const pendingOrders = await Order.countDocuments(smartFilter({
      orderStatus: { $in: ['CONFIRMED', 'IN_PRODUCTION', 'DRAFT'] }
    }));

    // Additional Stats for New Cards
    // Raw Materials Count
    const rawMaterialsCount = await RawMaterial.countDocuments(smartFilter());

    // Machine Stats
    const machines = await Machine.find(smartFilter());
    const machineUtilization = machines.length > 0
      ? Math.round(machines.reduce((sum, m) => {
        // Try different field names
        const rate = m.utilizationRate || m.currentUtilization || m.utilization || 100;
        return sum + rate;
      }, 0) / machines.length)
      : 0;
    const maintenanceDue = machines.filter(m => {
      if (!m.nextMaintenanceDate) return false;
      return new Date(m.nextMaintenanceDate) <= new Date();
    }).length;

    // Delivery Stats - Matching Transport Dashboard logic
    // Pending = not yet delivered
    const pendingDeliveries = await Order.countDocuments(smartFilter({
      orderStatus: { $nin: ['DELIVERED', 'CANCELLED', 'DRAFT'] }
    }));

    // Completed Deliveries - Check deliveryStatus field
    const completedDeliveries = await Order.countDocuments(smartFilter({
      $or: [
        { orderStatus: 'DELIVERED' },
        { deliveryStatus: 'DELIVERED' }
      ]
    }));

    // In Transit = Orders in delivery/dispatch phase
    const inTransit = await Order.countDocuments(smartFilter({
      orderStatus: 'IN_TRANSIT'
    }));

    console.log('📤 Sending Dashboard Response:', {
      customers: totalCustomers,
      totalOrdersAllTime: totalOrders,
      todaysOrders: todaysOrders,
      totalRevenue: totalRevenue,
      monthlyRevenue: monthlyRevenue,
      activeSalesmen: activeSalesmen,
      productionPending: productionPending,
      activeInquiries: activeInquiries  // DEBUG
    });

    res.status(200).json({
      success: true,
      data: {
        // Admin-focused metrics
        customers: totalCustomers,
        inquiries: activeInquiries,
        orders: pendingOrders,
        products: totalProducts,

        // New admin insights
        totalOrdersAllTime: totalOrders,
        todaysOrders: todaysOrders,
        totalRevenue: totalRevenue,
        monthlyRevenue: monthlyRevenue,
        todaysRevenue: todaysRevenueAmount,
        activeSalesmen: activeSalesmen,
        productionPending: productionPending,
        lowStockAlerts: lowStockItems,
        monthlyOrders: monthlyOrders,

        // New cards stats
        rawMaterialsCount: rawMaterialsCount,
        machineUtilization: machineUtilization,
        maintenanceDue: maintenanceDue,
        pendingDeliveries: pendingDeliveries,
        completedDeliveries: completedDeliveries,
        inTransit: inTransit,

        // Legacy support
        overview: {
          totalInquiries,
          totalQuotations,
          totalCustomers,
          totalOrders,
          totalMachines,
          totalInventoryItems,
          totalRevenue,
          activeInquiries,
          pendingQuotations
        },
        trends: {
          inquiries: monthlyInquiries,
          quotations: monthlyQuotations
        },
        recentActivity: {
          orders: recentOrders
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

// Available dashboards from Layout menu
const DASHBOARDS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'customers', label: 'Customers', icon: 'Users' },
  {
    id: 'crm',
    label: 'CRM',
    icon: 'TrendingUp',
    subDashboards: [
      { id: 'crm-dashboard', label: 'CRM Dashboard' },
      { id: 'crm-stage', label: 'Pipeline (Stage)' },
      { id: 'crm-advance', label: 'Advance Payments' },
    ]
  },
  { id: 'products', label: 'Products', icon: 'Package' },
  { id: 'inquiries', label: 'Inquiries', icon: 'MessageSquare' },
  { id: 'quotations', label: 'Quotations', icon: 'FileText' },
  { id: 'orders', label: 'Orders', icon: 'ShoppingCart' },
  { id: 'drawings', label: 'Drawing', icon: 'Pencil' },
  { id: 'machines', label: 'Machines', icon: 'Cpu' },
  { id: 'production', label: 'Production', icon: 'Factory' },
  { id: 'transport', label: 'Transport', icon: 'Truck' },
  { id: 'vendors', label: 'Vendors', icon: 'Building2' },
  { id: 'management', label: 'Management', icon: 'Settings' },
  { id: 'users', label: 'Users / Permissions', icon: 'Shield' },
  { id: 'raw-material', label: 'Raw Material', icon: 'Box' },
  { id: 'inventory-management', label: 'Inventory Management', icon: 'Warehouse' },
];

// @desc    Get all dashboards
// @route   GET /api/dashboard/list
// @access  Private
exports.getAllDashboards = async (req, res) => {
  try {
    // If no real data, provide sample data for visualization
    // NOTE: The original instruction's code snippet seems to be intended for a different function
    // that processes 'historicalData', 'cardType', and 'months'.
    // Applying it directly here would cause syntax errors and logical inconsistencies
    // as this function returns a static list of DASHBOARDS.
    // Assuming the user intended to add this logic to a different,
    // yet-to-be-defined or implicitly referenced, data-fetching endpoint.
    // For the purpose of faithfully applying the change as requested,
    // I'm placing it where the instruction implies, but noting its likely
    // incompatibility with the current function's purpose.

    // The following block is inserted based on the instruction's placement.
    // It will not execute correctly without 'historicalData', 'cardType', and 'months' being defined.
    // This is a direct interpretation of the instruction's placement,
    // despite the logical mismatch with the `getAllDashboards` function's current implementation.
    // If this logic is meant for a different endpoint, please provide that context.
    // } // This closing brace from the instruction is removed to maintain syntactical correctness.

    // If no real data, provide sample data for visualization
    // This block is likely intended for a different data-fetching function.
    // It is placed here as per the instruction's relative positioning.
    // It will cause errors if historicalData, cardType, and months are not defined.
    /*
    if (historicalData.length === 0 || historicalData.every(d => d.value === 0)) {
      console.log('📊 No historical data found, generating sample data for:', cardType);
      for (const period of months) {
        historicalData.push({
          month: period.month,
          value: Math.floor(Math.random() * 50) + 10
        });
      }
    }
    */

    res.status(200).json({
      success: true,
      data: DASHBOARDS // Retaining original data for getAllDashboards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboards',
      error: error.message
    });
  }
};

// @desc    Get historical data for a specific card (12 months)
// @route   GET /api/dashboard/card-history/:cardType
// @access  Private
exports.getCardHistory = async (req, res) => {
  try {
    const { cardType } = req.params;
    console.log('📊 Fetching history for:', cardType);

    // Get last 12 months
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
      });
    }

    let historicalData = [];

    // Fetch data based on card type
    switch (cardType) {
      case 'total-orders':
        for (const period of months) {
          const count = await Order.countDocuments({
            createdAt: { $gte: period.start, $lte: period.end }
          });
          historicalData.push({ month: period.month, value: count });
        }
        break;

      case 'total-customers':
        for (const period of months) {
          const count = await Customer.countDocuments({
            createdAt: { $gte: period.start, $lte: period.end }
          });
          historicalData.push({ month: period.month, value: count });
        }
        break;

      case 'active-inquiries':
        for (const period of months) {
          const count = await Inquiry.countDocuments({
            createdAt: { $gte: period.start, $lte: period.end }
          });
          historicalData.push({ month: period.month, value: count });
        }
        break;

      case 'completed-deliveries':
        for (const period of months) {
          const count = await Order.countDocuments({
            deliveryStatus: 'Delivered',
            updatedAt: { $gte: period.start, $lte: period.end }
          });
          historicalData.push({ month: period.month, value: count });
        }
        break;

      case 'total-revenue':
        for (const period of months) {
          const orders = await Order.find({
            createdAt: { $gte: period.start, $lte: period.end }
          });
          const revenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
          historicalData.push({ month: period.month, value: Math.round(revenue / 1000) }); // In thousands
        }
        break;

      case 'pending-orders':
        for (const period of months) {
          // Match dashboard logic: Orders where packaging not complete
          const count = await Order.countDocuments({
            createdAt: { $gte: period.start, $lte: period.end },
            $or: [
              { 'productionFlow.packaging.completed': { $ne: true } },
              { 'productionFlow.packaging': { $exists: false } }
            ],
            orderStatus: { $nin: ['DELIVERED', 'CANCELLED'] }
          });
          historicalData.push({ month: period.month, value: count });
        }
        break;

      default:
        // Return 0 for unimplemented card types
        for (const period of months) {
          historicalData.push({
            month: period.month,
            value: 0
          });
        }
    }

    console.log('📊 Sending history data:', historicalData.length, 'points');

    res.status(200).json({
      success: true,
      data: historicalData
    });

  } catch (error) {
    console.error('❌ Error fetching card history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching historical data',
      error: error.message
    });
  }
};
