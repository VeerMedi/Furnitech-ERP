const Order = require('../models/vlite/Order');
const Customer = require('../models/vlite/Customer');
const mongoose = require('mongoose');
const { generateInvoicePDF } = require('../utils/invoiceGenerator');
const path = require('path');
const fs = require('fs');
const EmailService = require('../utils/emailService');
const User = require('../models/vlite/User');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({ message: 'Valid Organization ID is required' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    monthAgo.setHours(0, 0, 0, 0);

    const baseQuery = { organizationId: new mongoose.Types.ObjectId(organizationId) };

    // Total orders by period
    const [totalOrdersToday, totalOrdersWeek, totalOrdersMonth] = await Promise.all([
      Order.countDocuments({ ...baseQuery, orderDate: { $gte: today } }),
      Order.countDocuments({ ...baseQuery, orderDate: { $gte: weekAgo } }),
      Order.countDocuments({ ...baseQuery, orderDate: { $gte: monthAgo } })
    ]);

    // Status counts
    const statusCounts = await Order.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
    ]);

    const pendingOrders = statusCounts.find(s => s._id === 'CONFIRMED')?.count || 0;
    const inProductionOrders = statusCounts.find(s => s._id === 'IN_PRODUCTION')?.count || 0;
    const completedOrders = statusCounts.find(s => s._id === 'COMPLETED')?.count || 0;
    const deliveredOrders = statusCounts.find(s => s._id === 'DELIVERED')?.count || 0;
    const cancelledOrders = statusCounts.find(s => s._id === 'CANCELLED')?.count || 0;

    // Payment status counts
    const paymentCounts = await Order.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$paymentStatus', count: { $sum: 1 } } }
    ]);

    // Revenue calculations
    const revenueStats = await Order.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$advanceReceived' },
          totalPending: { $sum: '$balanceAmount' },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    const stats = {
      overview: {
        totalOrdersToday,
        totalOrdersWeek,
        totalOrdersMonth,
        totalOrders: await Order.countDocuments(baseQuery)
      },
      statusBreakdown: {
        pending: pendingOrders,
        inProduction: inProductionOrders,
        completed: completedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders
      },
      paymentBreakdown: {
        paid: paymentCounts.find(p => p._id === 'COMPLETED')?.count || 0,
        partial: paymentCounts.find(p => p._id === 'PARTIAL')?.count || 0,
        pending: paymentCounts.find(p => p._id === 'PENDING')?.count || 0
      },
      revenue: {
        totalRevenue: revenueStats[0]?.totalRevenue || 0,
        totalPaid: revenueStats[0]?.totalPaid || 0,
        totalPending: revenueStats[0]?.totalPending || 0,
        avgOrderValue: revenueStats[0]?.avgOrderValue || 0
      }
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Error fetching dashboard statistics', error: error.message });
  }
};

// Get all orders with filters
exports.getAllOrders = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    console.log('🔍 [getAllOrders] ===== ORDER QUERY DEBUG =====');
    console.log('🔍 [getAllOrders] Received organizationId:', organizationId);
    console.log('🔍 [getAllOrders] Type:', typeof organizationId);

    if (!organizationId || !mongoose.Types.ObjectId.isValid(organizationId)) {
      return res.status(400).json({ message: 'Valid Organization ID is required' });
    }

    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      priority,
      search,
      startDate,
      endDate,
      sortBy = 'orderDate',
      sortOrder = 'desc'
    } = req.query;

    // Get user info for filtering
    const userId = req.user?._id;
    const userRole = req.user?.userRole;
    const userEmail = req.user?.email;

    console.log('👤 [getAllOrders] User:', {
      userId: userId?.toString(),
      userRole,
      userEmail
    });

    const query = { organizationId: new mongoose.Types.ObjectId(organizationId) };
    console.log('🔍 [getAllOrders] Base query:', JSON.stringify(query));

    // Filters
    if (status) {
      query.orderStatus = status;
    }
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
    if (priority) {
      query.priority = priority;
    }
    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) query.orderDate.$lte = new Date(endDate);
    }

    // Search by order number or customer
    if (search) {
      const customers = await Customer.find({
        organizationId: new mongoose.Types.ObjectId(organizationId),
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customer: { $in: customers.map(c => c._id) } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Fetch orders with all necessary populates
    let orders = await Order.find(query)
      .populate({
        path: 'customer',
        select: 'firstName lastName phone email companyName productType createdBy assignedDesigner fromInquiry',
        populate: {
          path: 'fromInquiry',
          select: 'assignedTo createdBy'
        }
      })
      .populate({
        path: 'quotation',
        select: 'quotationNumber createdBy inquiry',
        populate: {
          path: 'inquiry',
          select: 'assignedTo createdBy'
        }
      })
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    let total = await Order.countDocuments(query);

    console.log(`📊 [getAllOrders] Found ${orders.length} orders before filtering`);

    // Filter for salesman - only show orders from assigned inquiries/quotations
    const mainAccountEmails = ['vlite@vlite.in', 'vliteofficial@vlite.in'];
    const isMainAccount = userEmail && mainAccountEmails.includes(userEmail.toLowerCase());

    if (userId && userRole && userEmail && userRole.toLowerCase() === 'salesman' && !isMainAccount) {
      console.log('👤 [getAllOrders] Filtering for salesman');

      orders = orders.filter(order => {
        const userIdStr = userId.toString();

        // Check 1: If order has a customer with fromInquiry
        if (order.customer?.fromInquiry) {
          const inquiryAssignedTo = order.customer.fromInquiry.assignedTo?.toString();
          if (inquiryAssignedTo === userIdStr) {
            console.log(`  ✅ Order ${order.orderNumber}: Matched via customer inquiry`);
            return true;
          }
        }

        // Check 2: If order has a quotation with inquiry
        if (order.quotation?.inquiry) {
          const quotationInquiryAssignedTo = order.quotation.inquiry.assignedTo?.toString();
          if (quotationInquiryAssignedTo === userIdStr) {
            console.log(`  ✅ Order ${order.orderNumber}: Matched via quotation inquiry`);
            return true;
          }
        }

        // Check 3: If quotation was created by this salesman
        if (order.quotation?.createdBy) {
          const quotationCreatedBy = order.quotation.createdBy.toString();
          if (quotationCreatedBy === userIdStr) {
            console.log(`  ✅ Order ${order.orderNumber}: Matched via quotation creator`);
            return true;
          }
        }

        console.log(`  ❌ Order ${order.orderNumber}: Not assigned to this salesman`);
        return false;
      });

      total = orders.length;
      console.log(`✅ [getAllOrders] Filtered to ${total} orders for salesman`);
    } else {
      console.log('👑 [getAllOrders] Admin/POC - showing all orders');
    }

    console.log('✅ [getAllOrders] Returning', orders.length, 'orders out of', total, 'total');
    console.log('🔍 [getAllOrders] ===== END DEBUG =====');

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ [getAllOrders] Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// Get single order by ID
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const order = await Order.findOne({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(organizationId)
    })
      .populate('customer', 'firstName lastName phone email companyName productType address city state pincode createdBy assignedDesigner')
      .populate('items.product', 'name category')
      .populate('items.bom.material', 'name itemName materialCode category unit')
      .populate({
        path: 'quotation',
        select: 'quotationNumber createdBy inquiry',
        populate: {
          path: 'inquiry',
          select: 'assignedTo createdBy'
        }
      })
      .lean();

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
};

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    console.log('📝 [createOrder] Creating new order');
    console.log('📝 [createOrder] organizationId:', organizationId);
    console.log('📝 [createOrder] Request body:', JSON.stringify(req.body, null, 2));

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const orderData = {
      ...req.body,
      organizationId: new mongoose.Types.ObjectId(organizationId)
    };

    // Remove empty orderNumber to trigger auto-generation
    if (!orderData.orderNumber || orderData.orderNumber === '') {
      delete orderData.orderNumber;
    }

    console.log('📝 [createOrder] productType received:', req.body.productType);
    console.log('📝 [createOrder] Order data to create:', JSON.stringify(orderData, null, 2));

    const order = await Order.create(orderData);

    await order.populate('customer', 'firstName lastName phone email');

    console.log('✅ [createOrder] Order created successfully:', order._id);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('❌ [createOrder] Error creating order:', error);
    console.error('❌ [createOrder] Error name:', error.name);
    console.error('❌ [createOrder] Error message:', error.message);
    if (error.errors) {
      console.error('❌ [createOrder] Validation errors:', error.errors);
    }
    res.status(500).json({
      message: 'Error creating order',
      error: error.message,
      details: error.errors || {}
    });
  }
};

// Update order
exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const updateData = { ...req.body };

    // Validate dates
    if (updateData.expectedDeliveryDate) {
      const date = new Date(updateData.expectedDeliveryDate);
      if (isNaN(date.getTime()) || date.getFullYear() > 2100) {
        delete updateData.expectedDeliveryDate;
      }
    }
    if (updateData.orderDate) {
      const date = new Date(updateData.orderDate);
      if (isNaN(date.getTime()) || date.getFullYear() > 2100) {
        delete updateData.orderDate;
      }
    }

    console.log('📝 [updateOrder] productType received:', req.body.productType);
    console.log('📝 [updateOrder] Update data:', JSON.stringify(updateData, null, 2));

    // Handle manual customer input
    if (req.body.customerName && req.body.customerPhone) {
      try {
        console.log('📝 [updateOrder] Processing customer info update...');
        const nameParts = req.body.customerName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || firstName;

        // Try to find existing customer by phone
        let customer = await Customer.findOne({
          organizationId: new mongoose.Types.ObjectId(organizationId),
          phone: req.body.customerPhone
        });

        if (customer) {
          console.log('📝 [updateOrder] Found existing customer, updating name...');
          customer.firstName = firstName;
          customer.lastName = lastName;
          customer.companyName = `${firstName} ${lastName}`;
          await customer.save({ validateBeforeSave: false });
        } else {
          console.log('📝 [updateOrder] Creating new customer...');
          customer = await Customer.create({
            organizationId: new mongoose.Types.ObjectId(organizationId),
            customerCode: `CUST${Date.now().toString().slice(-6)}`,
            type: 'INDIVIDUAL',
            firstName: firstName,
            lastName: lastName,
            companyName: `${firstName} ${lastName}`,
            phone: req.body.customerPhone,
            source: 'WALK_IN',
            status: 'Active'
          });
        }

        updateData.customer = customer._id;
        console.log('📝 [updateOrder] Customer processed successfully:', customer._id);
      } catch (custError) {
        console.error('❌ [updateOrder] Error processing customer:', custError);
        // Continue without failing the request
      }

      delete updateData.customerName;
      delete updateData.customerPhone;
    }

    console.log('📝 [updateOrder] Executing findOneAndUpdate...');

    // 🔍 Capture old state for diffing
    const oldOrder = await Order.findById(id);
    if (!oldOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // INVENTORY DEDUCTION: Process BOM materials based on diff
    // We only process if items are being updated
    if (updateData.items && Array.isArray(updateData.items)) {
      try {
        const RawMaterial = require('../models/vlite/RawMaterial');
        console.log('🔧 [updateOrder] Processing smart inventory deductions...');

        // Create a map of old allocated quantities for easy lookup
        // Map key format: `itemIndex-bomIndex` (assuming consistent array order)
        // OR better: use material ID + item ID if possible. 
        // Since BOM items don't have IDs by default in the schema (unless created), 
        // and we are replacing the whole items array, we need a way to track what changed.

        // BETTER APPROACH: 
        // 1. Iterate through NEW items and BOMs.
        // 2. For each new BOM item, find if it existed in OLD order (by material ID).
        //    Note: This has limitations if same material is used twice in same item, but that's rare/bad practice.
        // 3. Calculate diff = newQty - oldAllocatedQty
        // 4. Update stock.
        // 5. Update allocatedQty to match newQty.
        // 6. Handle REMOVED items (existed in old but not in new).

        // Flat list of all OLD allocations
        // Format: { materialId: "...", allocated: 10, key: "unique_key" }
        const oldAllocations = [];
        if (oldOrder.items) {
          oldOrder.items.forEach((item, itemIdx) => {
            if (item.bom) {
              item.bom.forEach((bom, bomIdx) => {
                if (bom.material) {
                  oldAllocations.push({
                    materialId: bom.material.toString(),
                    allocated: bom.allocatedQuantity || 0,
                    // We use item index + material as a rough key. 
                    // Ideally we should have subdocument IDs, but let's assume strict reconstruction for now.
                    // Or simply: just subtract ALL old allocations and Add ALL new requirements.
                    // This is safer and easier!
                    // Reset approach:
                    // 1. Add back ALL old allocated quantities to stock.
                    // 2. Deduct ALL new required quantities from stock.
                    // 3. Set new allocatedQuantity = requiredQuantity.

                    // Optimization: We can do this in one pass per material if we aggregate first.
                  });
                }
              });
            }
          });
        }

        // Flat list of NEW requirements
        const newRequirements = [];
        if (updateData.items) {
          updateData.items.forEach((item, itemIdx) => {
            if (item.bom) {
              item.bom.forEach((bom, bomIdx) => {
                if (bom.material && bom.requiredQuantity) {
                  newRequirements.push({
                    materialId: bom.material._id || bom.material,
                    required: parseFloat(bom.requiredQuantity) || 0,
                    bomRef: bom // Reference to update allocatedQuantity later
                  });
                }
              });
            }
          });
        }

        // Aggregate changes per material
        const materialChanges = {};

        // Step 1: Revert old allocations (Credit back to stock)
        oldAllocations.forEach(alloc => {
          if (!materialChanges[alloc.materialId]) materialChanges[alloc.materialId] = 0;
          materialChanges[alloc.materialId] += alloc.allocated; // ADD back to stock
        });

        // Step 2: Apply new requirements (Debit from stock)
        newRequirements.forEach(req => {
          if (!materialChanges[req.materialId]) materialChanges[req.materialId] = 0;
          materialChanges[req.materialId] -= req.required; // SUBTRACT from stock

          // Set allocated quantity to match required (since we are effectively "filling" the order)
          req.bomRef.allocatedQuantity = req.required;
        });

        // Step 3: Commit changes to DB
        const materialIds = Object.keys(materialChanges);
        for (const matId of materialIds) {
          const netChange = materialChanges[matId];

          if (netChange !== 0) {
            console.log(`🔧 Material ${matId}: Net Stock Change = ${netChange > 0 ? '+' : ''}${netChange}`);

            // Atomic update
            await RawMaterial.findByIdAndUpdate(
              matId,
              {
                $inc: {
                  currentStock: netChange,
                  quantity: netChange // Keep legacy field in sync if it exists
                }
              }
            );
          }
        }

        console.log('✅ [updateOrder] Smart inventory deduction completed');

      } catch (invError) {
        console.error('❌ [updateOrder] Error during inventory deduction:', invError);
        // Continue but maybe warn
      }
    }



    const order = await Order.findOneAndUpdate(
      {
        _id: id,
        organizationId: new mongoose.Types.ObjectId(organizationId)
      },
      { $set: updateData },
      {
        new: true,
        runValidators: false
      }
    ).populate('customer', 'firstName lastName phone email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('✅ [updateOrder] Order updated, productType:', order.productType);

    // 📧 Send assignments email if woodWorkflowAssignments or steelWorkflowAssignments were updated
    if (updateData.woodWorkflowAssignments || updateData.steelWorkflowAssignments) {
      try {
        const assignmentField = updateData.woodWorkflowAssignments ? 'woodWorkflowAssignments' : 'steelWorkflowAssignments';
        const newAssignments = updateData[assignmentField];

        const oldAssignments = oldOrder ? (oldOrder[assignmentField] || {}) : {};

        for (const processKey of Object.keys(newAssignments)) {
          const newWorkerId = newAssignments[processKey]?.toString();
          const oldWorkerId = oldAssignments[processKey]?.toString();

          // Only send if this specific process was changed or is new
          if (newWorkerId && newWorkerId !== oldWorkerId) {
            const worker = await User.findById(newWorkerId);
            if (worker && worker.email) {
              const mockTask = {
                title: processKey.charAt(0).toUpperCase() + processKey.slice(1).replace(/([A-Z])/g, ' $1'),
                taskNumber: order.orderNumber,
                priority: order.priority || 'MEDIUM',
                order: {
                  orderNumber: order.orderNumber,
                  customer: {
                    fullName: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Customer'
                  }
                }
              };

              // Fire and forget email
              EmailService.sendProductionTaskAssignmentEmail(mockTask, worker)
                .then(res => {
                  if (res.success) console.log(`✉️ Assignment email sent to ${worker.email} for process ${processKey}`);
                })
                .catch(err => console.error('Error sending assignment email:', err));
            }
          }
        }
      } catch (emailErr) {
        console.error('❌ [updateOrder] Failed to send assignment emails:', emailErr);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: order
    });
  } catch (error) {
    console.error('❌ [updateOrder] Error updating order:', error);
    console.error('❌ [updateOrder] Error name:', error.name);
    console.error('❌ [updateOrder] Error message:', error.message);
    if (error.errors) {
      console.error('❌ [updateOrder] Validation errors:', JSON.stringify(error.errors, null, 2));
    }
    res.status(500).json({
      message: 'Error updating order',
      error: error.message,
      validationErrors: error.errors || {}
    });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, updatedBy } = req.body;
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const order = await Order.findOne({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(organizationId)
    }).populate('customer');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Add status to history
    order.statusHistory.push({
      status,
      changedAt: new Date(),
      notes
    });

    order.orderStatus = status;
    order.lastModifiedBy = updatedBy;

    await order.save();

    // Send email notification for DISPATCHED status
    if (status === 'DISPATCHED' && order.customer && order.customer.email) {
      try {
        await EmailService.sendDispatchNotification(order, [order.customer]);
        console.log(`✉️ Dispatch notification sent to ${order.customer.email}`);
      } catch (emailError) {
        console.error('Failed to send dispatch email:', emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
};

// Add payment to order
exports.addPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const order = await Order.findOne({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(organizationId)
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update advance received
    order.advanceReceived = (order.advanceReceived || 0) + parseFloat(amount);
    order.balanceAmount = order.totalAmount - order.advanceReceived;

    // Update payment status
    if (order.balanceAmount <= 0) {
      order.paymentStatus = 'COMPLETED';
    } else if (order.advanceReceived > 0) {
      order.paymentStatus = 'PARTIAL';
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Payment added successfully',
      data: order
    });
  } catch (error) {
    console.error('Error adding payment:', error);
    res.status(500).json({ message: 'Error adding payment', error: error.message });
  }
};

// Delete order
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const order = await Order.findOneAndDelete({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(organizationId)
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Error deleting order', error: error.message });
  }
};

// Generate Invoice
exports.generateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { invoiceData } = req.body;
    const organizationId = req.headers['x-tenant-id'];
    const userId = req.user?.id;

    console.log('=== GENERATE INVOICE DEBUG ===');
    console.log('Invoice Data Received:', JSON.stringify(invoiceData, null, 2));

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    // Fetch order with customer details
    const order = await Order.findOne({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(organizationId)
    }).populate('customer');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('Order Customer Data:', JSON.stringify({
      firstName: order.customer?.firstName,
      lastName: order.customer?.lastName,
      phone: order.customer?.phone,
      email: order.customer?.email,
      deliveryAddress: order.customer?.deliveryAddress
    }, null, 2));

    // Use custom invoice data if provided, otherwise use defaults
    if (!order.invoice || !order.invoice.invoiceNumber) {
      const invoiceNumber = invoiceData?.invoiceNumber || `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`;
      order.invoice = {
        invoiceNumber,
        invoiceDate: invoiceData?.invoiceDate || new Date(),
        generatedBy: userId,
      };
    } else if (invoiceData?.invoiceNumber) {
      // Update existing invoice number if provided
      order.invoice.invoiceNumber = invoiceData.invoiceNumber;
      order.invoice.invoiceDate = invoiceData.invoiceDate || order.invoice.invoiceDate;
    }

    // Company details - use custom data if provided
    const companyDetails = invoiceData ? {
      name: invoiceData.companyName || 'Vlite Furnitures',
      address: invoiceData.companyAddress || 'Manufacturing Unit, Industrial Area, Sector 24',
      phone: invoiceData.companyPhone || '+91 98765 43210',
      email: invoiceData.companyEmail || 'info@vlitefurnitures.com',
      gstNumber: invoiceData.companyGST || '24XXXXX1234X1Z5',
    } : {
      name: 'Vlite Furnitures',
      address: 'Manufacturing Unit, Industrial Area, Sector 24',
      phone: '+91 98765 43210',
      email: 'info@vlitefurnitures.com',
      gstNumber: '24XXXXX1234X1Z5',
    };

    console.log('Company Details:', companyDetails);
    console.log('Custom Invoice Data being passed to PDF generator:', invoiceData);

    // Generate PDF with custom invoice data
    const invoicePath = await generateInvoicePDF(order, companyDetails, invoiceData);

    // Update order with invoice URL (relative path)
    const invoiceFileName = path.basename(invoicePath);
    order.invoice.invoiceUrl = `/invoices/${invoiceFileName}`;
    order.invoiceStatus = 'GENERATED';
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Invoice generated successfully',
      data: {
        invoiceNumber: order.invoice.invoiceNumber,
        invoiceUrl: order.invoice.invoiceUrl,
        invoicePath: invoicePath,
      }
    });
  } catch (error) {
    console.error('❌ Error generating invoice:', error);
    console.error('Error Stack:', error.stack);
    console.error('Error Details:', {
      message: error.message,
      name: error.name,
      code: error.code
    });
    res.status(500).json({
      message: 'Error generating invoice',
      error: error.message,
      details: error.stack
    });
  }
};

// Download Invoice
exports.downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-tenant-id'];

    console.log('Download Invoice Request:', { id, organizationId });

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const order = await Order.findOne({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(organizationId)
    });

    if (!order) {
      console.log('Order not found');
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('Order found:', order.orderNumber);
    console.log('Invoice URL:', order.invoice?.invoiceUrl);

    if (!order.invoice || !order.invoice.invoiceUrl) {
      console.log('Invoice not generated');
      return res.status(404).json({ message: 'Invoice not generated yet' });
    }

    // Extract filename from invoiceUrl
    const invoiceFileName = order.invoice.invoiceUrl.replace('/invoices/', '');
    const invoicePath = path.join(__dirname, '..', 'invoices', invoiceFileName);

    console.log('Looking for invoice at:', invoicePath);
    console.log('File exists:', fs.existsSync(invoicePath));

    // Check if file exists
    if (!fs.existsSync(invoicePath)) {
      console.error('Invoice file not found at:', invoicePath);
      return res.status(404).json({
        message: 'Invoice file not found',
        path: invoicePath,
        fileName: invoiceFileName
      });
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${order.invoice.invoiceNumber}.pdf"`);

    console.log('Streaming invoice file...');

    // Stream the file
    const fileStream = fs.createReadStream(invoicePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading invoice:', error);
    res.status(500).json({
      message: 'Error downloading invoice',
      error: error.message
    });
  }
};
