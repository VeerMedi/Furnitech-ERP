const Transport = require('../models/vlite/Transport');
const logger = require('../utils/logger');

exports.getAllTransports = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user?._id;
    const userRole = req.user?.userRole;
    const userEmail = req.user?.email;

    console.log('🚚 [getAllTransports] User details:', {
      userId: userId?.toString(),
      userRole,
      userEmail,
    });

    let filter = { tenantId };

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.deliveryDate = {};
      if (startDate) {
        filter.deliveryDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.deliveryDate.$lte = new Date(endDate);
      }
    }

    // Fetch all transports first
    let transports = await Transport.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    let total = transports.length;

    console.log(`📦 [getAllTransports] Found ${total} total transports before filtering`);

    // Check if user is POC/Admin (main account) - they see everything
    const isPOC = userEmail && (
      userEmail.toLowerCase().includes('@vlite.com') ||
      userEmail.toLowerCase().includes('@vlitefurninture.com')
    );

    console.log(`🔍 [getAllTransports] Is POC/Admin: ${isPOC}`);

    // Role-based filtering for Salesman (non-POC users)
    if (!isPOC && userId) {
      const Customer = require('../models/vlite/Customer');
      const Inquiry = require('../models/vlite/Inquiry');
      const mongoose = require('mongoose');

      console.log('🔍 [getAllTransports] User is Salesman - filtering by customer assignment');

      // Find all customers onboarded from inquiries assigned to this user
      const assignedCustomers = await Customer.find({
        organizationId: new mongoose.Types.ObjectId(tenantId),
        fromInquiry: { $exists: true, $ne: null }
      }).populate('fromInquiry').lean();

      console.log(`📋 [getAllTransports] Found ${assignedCustomers.length} customers with inquiry references`);

      // Filter customers where inquiry was assigned to this salesman
      const myCustomerNames = assignedCustomers
        .filter(customer => {
          if (!customer.fromInquiry) return false;
          const assignedToId = customer.fromInquiry.assignedTo?.toString();
          const userIdStr = userId?.toString();
          return assignedToId === userIdStr;
        })
        .map(customer => {
          // Get customer name - try different fields
          return customer.companyName ||
            customer.tradeName ||
            `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
        })
        .filter(name => name && name.length > 0);

      console.log(`✅ [getAllTransports] Found ${myCustomerNames.length} customers assigned to this salesman:`, myCustomerNames);

      if (myCustomerNames.length === 0) {
        console.log('⚠️ [getAllTransports] No customers assigned to this salesman - returning empty list');
        transports = [];
        total = 0;
      } else {
        // Filter transports by clientName matching assigned customers
        transports = transports.filter(transport => {
          const clientName = transport.clientName || '';
          const isMatched = myCustomerNames.some(customerName =>
            clientName.toLowerCase().includes(customerName.toLowerCase()) ||
            customerName.toLowerCase().includes(clientName.toLowerCase())
          );

          if (isMatched) {
            console.log(`  ✅ Transport ${transport.orderNumber}: Matched customer "${clientName}"`);
          }

          return isMatched;
        });

        total = transports.length;
        console.log(`🎯 [getAllTransports] After filtering: ${total} transports for this salesman`);
      }
    } else {
      console.log('✅ [getAllTransports] POC/Admin user - showing all transports');
    }

    // Apply pagination after filtering
    const paginatedTransports = transports.slice(skip, skip + parseInt(limit));

    res.status(200).json({
      success: true,
      data: paginatedTransports,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching transports:', error);
    console.error('❌ [getAllTransports] Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ success: false, message: 'Error fetching transports' });
  }
};

exports.getTransportById = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const transport = await Transport.findOne({
      _id: req.params.id,
      tenantId,
    });

    if (!transport) {
      return res.status(404).json({ success: false, message: 'Transport not found' });
    }

    res.status(200).json({ success: true, data: transport });
  } catch (error) {
    logger.error('Error fetching transport:', error);
    res.status(500).json({ success: false, message: 'Error fetching transport' });
  }
};

exports.createTransport = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const {
      productId,
      productName,
      clientName,
      clientAddress,
      clientContact,
      vehicleType,
      vehicleNumber,
      driverId,
      driverName,
      driverContact,
      deliveryDate,
      distance,
      estimatedTime,
      notes,
    } = req.body;

    const orderNumber = `ORD-${Date.now()}`;

    const transport = new Transport({
      tenantId,
      orderNumber,
      productId,
      productName,
      clientName,
      clientAddress,
      clientContact,
      vehicleType,
      vehicleNumber,
      driverId,
      driverName,
      driverContact,
      status: 'Scheduled',
      deliveryDate,
      distance,
      estimatedTime,
      notes,
      statusLogs: [
        {
          status: 'Scheduled',
          timestamp: new Date(),
          notes: 'Order created and scheduled',
        },
      ],
    });

    await transport.save();

    res.status(201).json({
      success: true,
      message: 'Transport created successfully',
      data: transport,
    });
  } catch (error) {
    logger.error('Error creating transport:', error);
    res.status(500).json({ success: false, message: 'Error creating transport' });
  }
};

exports.updateTransportStatus = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const { status, notes } = req.body;

    const transport = await Transport.findOne({
      _id: req.params.id,
      tenantId,
    });

    if (!transport) {
      return res.status(404).json({ success: false, message: 'Transport not found' });
    }

    transport.status = status;

    if (status === 'Delivered') {
      transport.actualDeliveryTime = new Date();
    }

    transport.statusLogs.push({
      status,
      timestamp: new Date(),
      notes: notes || `Status updated to ${status}`,
    });

    await transport.save();

    res.status(200).json({
      success: true,
      message: 'Transport status updated successfully',
      data: transport,
    });
  } catch (error) {
    logger.error('Error updating transport status:', error);
    res.status(500).json({ success: false, message: 'Error updating transport status' });
  }
};

exports.updateVehicleLocation = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const { latitude, longitude } = req.body;

    const transport = await Transport.findOne({
      _id: req.params.id,
      tenantId,
    });

    if (!transport) {
      return res.status(404).json({ success: false, message: 'Transport not found' });
    }

    transport.location = {
      latitude,
      longitude,
      lastUpdated: new Date(),
    };

    await transport.save();

    res.status(200).json({
      success: true,
      message: 'Vehicle location updated',
      data: transport,
    });
  } catch (error) {
    logger.error('Error updating vehicle location:', error);
    res.status(500).json({ success: false, message: 'Error updating vehicle location' });
  }
};

// Update product, client, vehicle and driver details only
exports.updateTransport = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const allowed = [
      'productId', 'productName',
      'clientName', 'clientAddress', 'clientContact',
      'vehicleType', 'vehicleNumber',
      'driverId', 'driverName', 'driverContact'
    ];

    const incoming = Object.keys(req.body || {});
    const invalid = incoming.filter(k => !allowed.includes(k));
    if (invalid.length > 0) {
      return res.status(400).json({ success: false, message: `Only product, client, vehicle and driver fields can be updated. Invalid fields: ${invalid.join(', ')}` });
    }

    const transport = await Transport.findOne({ _id: req.params.id, tenantId });
    if (!transport) {
      return res.status(404).json({ success: false, message: 'Transport not found' });
    }

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) transport[field] = req.body[field];
    });

    await transport.save();

    res.status(200).json({ success: true, message: 'Transport updated', data: transport });
  } catch (error) {
    logger.error('Error updating transport:', error);
    console.error('Full error details:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating transport',
      error: error.toString()
    });
  }
};

exports.getDeliveryOrders = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let filter = { tenantId };

    if (status) {
      filter.status = status;
    }

    const orders = await Transport.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transport.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching delivery orders:', error);
    res.status(500).json({ success: false, message: 'Error fetching delivery orders' });
  }
};

exports.getDriverInfo = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const driverId = req.params.driverId;

    const transports = await Transport.find({
      tenantId,
      driverId,
    });

    const stats = {
      totalDeliveries: transports.length,
      completedDeliveries: transports.filter(t => t.status === 'Delivered').length,
      pendingDeliveries: transports.filter(t => t.status !== 'Delivered' && t.status !== 'Cancelled').length,
      averageDistance: transports.length > 0
        ? (transports.reduce((sum, t) => sum + (t.distance || 0), 0) / transports.length).toFixed(2)
        : 0,
    };

    res.status(200).json({
      success: true,
      data: {
        driverId,
        stats,
        recentDeliveries: transports.slice(0, 5),
      },
    });
  } catch (error) {
    logger.error('Error fetching driver info:', error);
    res.status(500).json({ success: false, message: 'Error fetching driver info' });
  }
};

exports.getVehicleInfo = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const vehicleNumber = req.params.vehicleNumber;

    const transports = await Transport.find({
      tenantId,
      vehicleNumber,
    });

    const stats = {
      totalDeliveries: transports.length,
      completedDeliveries: transports.filter(t => t.status === 'Delivered').length,
      currentStatus: transports.length > 0 ? transports[0].status : 'Idle',
      totalDistance: transports.reduce((sum, t) => sum + (t.distance || 0), 0).toFixed(2),
    };

    res.status(200).json({
      success: true,
      data: {
        vehicleNumber,
        stats,
        recentDeliveries: transports.slice(0, 5),
      },
    });
  } catch (error) {
    logger.error('Error fetching vehicle info:', error);
    res.status(500).json({ success: false, message: 'Error fetching vehicle info' });
  }
};

exports.getTransportStatistics = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const transports = await Transport.find({ tenantId });

    const stats = {
      totalDeliveries: transports.length,
      completedDeliveries: transports.filter(t => t.status === 'Delivered').length,
      pendingDeliveries: transports.filter(t => t.status === 'Scheduled').length,
      enRouteDeliveries: transports.filter(t => t.status === 'En Route').length,
      delayedDeliveries: transports.filter(t => t.status === 'Delayed').length,
      cancelledDeliveries: transports.filter(t => t.status === 'Cancelled').length,
      totalDistance: transports.reduce((sum, t) => sum + (t.distance || 0), 0).toFixed(2),
      averageDeliveryTime: transports.length > 0
        ? (transports.reduce((sum, t) => sum + (t.estimatedTime || 0), 0) / transports.length).toFixed(2)
        : 0,
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error fetching transport statistics:', error);
    res.status(500).json({ success: false, message: 'Error fetching transport statistics' });
  }
};

exports.deleteTransport = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const transport = await Transport.findOneAndDelete({
      _id: req.params.id,
      tenantId,
    });

    if (!transport) {
      return res.status(404).json({ success: false, message: 'Transport not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Transport deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting transport:', error);
    res.status(500).json({ success: false, message: 'Error deleting transport' });
  }
};
