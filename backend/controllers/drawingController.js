const mongoose = require('mongoose');
const Drawing = require('../models/vlite/Drawing');
const Order = require('../models/vlite/Order');
const path = require('path');
const fs = require('fs').promises;
const EmailService = require('../utils/emailService');
const Customer = require('../models/vlite/Customer');
const googleDriveService = require('../services/googleDriveService');

// Get all drawings
exports.getAllDrawings = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const drawings = await Drawing.find({
      organization: organizationId
    })
      .populate('customer', 'firstName lastName phone email')
      .populate('assignedTo', 'name email designation')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: drawings,
      count: drawings.length
    });
  } catch (error) {
    console.error('Error fetching all drawings:', error);
    res.status(500).json({
      message: 'Failed to fetch drawings',
      error: error.message
    });
  }
};

// Get all drawings for a specific SPOC
exports.getDrawingsForSPOC = async (req, res) => {
  try {
    const { spocId } = req.params;
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const drawings = await Drawing.find({
      organization: organizationId,
      assignedTo: spocId
    })
      .populate('customer', 'firstName lastName phone email')
      .populate('assignedTo', 'name email designation')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: drawings,
      count: drawings.length
    });
  } catch (error) {
    console.error('Error fetching drawings:', error);
    res.status(500).json({
      message: 'Failed to fetch drawings',
      error: error.message
    });
  }
};

// Upload and assign drawings to SPOC
exports.uploadDrawingsToSPOC = async (req, res) => {
  try {
    const { customerId, spocId, title, notes } = req.body;
    const files = req.files;
    const organizationId = req.headers['x-tenant-id'];
    const userId = req.user?.id;

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    if (!customerId) {
      return res.status(400).json({ message: 'Customer ID is required' });
    }

    if (!spocId) {
      return res.status(400).json({ message: 'SPOC ID is required' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'At least one file is required' });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'drawings');
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    // Save each file and create drawing records
    const savedDrawings = [];

    for (const file of files) {
      // Upload to Google Drive
      const drawingUrl = await googleDriveService.uploadFile(file.buffer, file.originalname, file.mimetype);

      // Create drawing record
      const drawing = new Drawing({
        title: title || file.originalname,
        drawingUrl: drawingUrl,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        customer: customerId,
        assignedTo: spocId,
        organization: organizationId,
        uploadedBy: userId,
        notes: notes || '',
        approvalStatus: 'PENDING'
      });

      await drawing.save();
      savedDrawings.push(drawing);
    }

    res.status(201).json({
      success: true,
      message: `${savedDrawings.length} file(s) successfully assigned to SPOC`,
      data: savedDrawings
    });

  } catch (error) {
    console.error('Error uploading drawings:', error);
    res.status(500).json({
      message: 'Failed to upload drawings',
      error: error.message
    });
  }
};

// ============ DRAWING DASHBOARD METHODS ============

// Get unique customers from orders for Drawing Dashboard
exports.getCustomersFromOrders = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    // Find all orders and populate customer data
    const orders = await Order.find({ organizationId: new mongoose.Types.ObjectId(organizationId) })
      .populate({
        path: 'customer',
        select: 'firstName lastName phone email address assignedDesigner',
        populate: {
          path: 'assignedDesigner',
          select: 'firstName lastName email userRole'
        }
      })
      .select('customer')
      .lean();

    // Extract unique customers
    const customerMap = new Map();
    orders.forEach(order => {
      if (order.customer && order.customer._id) {
        const customerId = order.customer._id.toString();
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, order.customer);
        }
      }
    });

    const uniqueCustomers = Array.from(customerMap.values());

    res.status(200).json({
      success: true,
      data: uniqueCustomers,
      count: uniqueCustomers.length
    });
  } catch (error) {
    console.error('Error fetching customers from orders:', error);
    res.status(500).json({
      message: 'Failed to fetch customers',
      error: error.message
    });
  }
};

// Get order details for a specific customer (including all notes)
exports.getOrderDetailsForCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const orders = await Order.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      customer: customerId
    })
      .populate({
        path: 'customer',
        populate: {
          path: 'fromInquiry',
          populate: {
            path: 'assignedTo',
            select: 'firstName lastName email'
          }
        }
      })
      .select('orderNumber productionNotes customerNotes internalNotes customer orderDate totalAmount orderStatus items expectedDeliveryDate')
      .sort({ orderDate: -1 });

    // Attach salesman info to each order for easy access
    const ordersWithSalesman = orders.map(order => {
      const orderObj = order.toObject();
      if (orderObj.customer?.fromInquiry?.assignedTo) {
        const salesman = orderObj.customer.fromInquiry.assignedTo;
        orderObj.salesmanName = `${salesman.firstName} ${salesman.lastName}`.trim();
        orderObj.salesmanEmail = salesman.email;
      }
      return orderObj;
    });

    res.status(200).json({
      success: true,
      data: ordersWithSalesman,
      count: ordersWithSalesman.length
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
      message: 'Failed to fetch order details',
      error: error.message
    });
  }
};

// Upload files to Drawing Dashboard and assign to salesman
exports.uploadFilesToDrawing = async (req, res) => {
  try {
    console.log('📤 UPLOAD REQUEST:', {
      body: req.body,
      files: req.files?.length,
      headers: Object.keys(req.headers)
    });

    const { customerId, orderId, salesmanName, autocadPrepared, autocadNotes } = req.body;
    const files = req.files;
    const organizationId = req.headers['x-tenant-id'];
    const userId = req.user?._id || req.user?.id || null;

    if (!organizationId) {
      console.error('❌ Missing organization ID');
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    if (!customerId) {
      console.error('❌ Missing customer ID');
      return res.status(400).json({ message: 'Customer ID is required' });
    }

    if (!salesmanName) {
      console.error('❌ Missing salesman name');
      return res.status(400).json({ message: 'Salesman selection is required' });
    }

    if (!files || files.length === 0) {
      console.error('❌ No files uploaded');
      return res.status(400).json({ message: 'At least one file is required' });
    }

    console.log('✅ All validations passed. Processing files...');
    console.log('📝 Salesman Name received:', salesmanName);
    console.log('📝 Customer ID:', customerId);
    console.log('📝 Order ID:', orderId || 'N/A');

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'drawings');
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    // Process each file and create separate drawing records
    const savedDrawings = [];

    for (const file of files) {
      // Upload to Google Drive (NEW)
      // We skip local file system entirely
      const drawingUrl = await googleDriveService.uploadFile(file.buffer, file.originalname, file.mimetype);

      // Create a NEW drawing record for EACH file (no more updates)
      const drawing = new Drawing({
        title: `${file.originalname}`,
        drawingUrl: drawingUrl, // Now stores the Google Drive ID or Web Link
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        customer: customerId,
        order: orderId || null,
        organization: organizationId,
        uploadedBy: userId,
        salesmanName: salesmanName,
        autocadPrepared: autocadPrepared === 'true' || autocadPrepared === true,
        autocadPreparationNotes: autocadNotes || '',
        additionalFiles: [{
          fileName: file.originalname,
          fileUrl: drawingUrl,
          fileType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date()
        }],
        approvalStatus: 'PENDING'
      });

      await drawing.save();
      savedDrawings.push(drawing);

      console.log(`✅ Drawing Created:`, {
        id: drawing._id,
        fileName: file.originalname,
        customer: customerId,
        salesman: salesmanName
      });
    }


    console.log('✅ All Drawings Saved:');
    console.log(`   - Total Files: ${savedDrawings.length}`);
    console.log(`   - Salesman: ${salesmanName}`);
    savedDrawings.forEach((d, idx) => {
      console.log(`   - [${idx + 1}] ${d.fileName} (ID: ${d._id})`);
    });

    res.status(201).json({
      success: true,
      message: `${savedDrawings.length} file(s) uploaded and assigned to ${salesmanName}`,
      data: savedDrawings
    });

  } catch (error) {
    console.error('❌ Error uploading files to drawing:', error);
    res.status(500).json({
      message: 'Failed to upload files',
      error: error.message
    });
  }
};

// Get drawings for a specific salesman
exports.getDrawingsForSalesman = async (req, res) => {
  try {
    const { salesmanName } = req.params;
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const drawings = await Drawing.find({
      organization: organizationId,
      salesmanName: salesmanName
    })
      .populate('customer', 'firstName lastName phone email')
      .populate('order', 'orderNumber orderDate totalAmount')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: drawings,
      count: drawings.length
    });
  } catch (error) {
    console.error('Error fetching drawings for salesman:', error);
    res.status(500).json({
      message: 'Failed to fetch drawings',
      error: error.message
    });
  }
};

// Get design team members for assignment
exports.getDesignTeamMembers = async (req, res) => {
  try {
    const User = require('../models/vlite/User');
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    // Fetch users with Design role (NOT Design Dept Head - they are managers, not assignees)
    // Note: UI shows "Design Department" but database stores "Design"
    const designTeam = await User.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      userRole: 'Design', // Only team members, not department heads
      isActive: true
    })
      .select('firstName lastName email userRole')
      .sort({ firstName: 1 });

    res.status(200).json({
      success: true,
      data: designTeam,
      count: designTeam.length
    });
  } catch (error) {
    console.error('Error fetching design team members:', error);
    res.status(500).json({
      message: 'Failed to fetch design team members',
      error: error.message
    });
  }
};

// Assign designer to a customer
exports.assignDesigner = async (req, res) => {
  try {
    const { customerId, designerId } = req.body;
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    if (!customerId || !designerId) {
      return res.status(400).json({ message: 'Customer ID and Designer ID are required' });
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: customerId, organizationId: new mongoose.Types.ObjectId(organizationId) },
      { assignedDesigner: designerId },
      { new: true }
    ).populate('assignedDesigner', 'firstName lastName email');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Designer assigned successfully',
      data: customer
    });

    // Send Email Notification to Designer
    try {
      const designer = customer.assignedDesigner;
      const assignerName = req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Design Head';

      if (designer && designer.email) {
        EmailService.sendDesignAssignmentEmail(customer, designer, assignerName)
          .then(res => {
            if (res.success) console.log(`✉️ Design assignment email sent to ${designer.email}`);
            else console.warn(`⚠️ Failed to send design assignment email: ${res.error}`);
          })
          .catch(err => console.error('⚠️ Design assignment email error:', err.message));
      }
    } catch (emailErr) {
      console.error('⚠️ Failed to send design assignment notification:', emailErr.message);
    }
  } catch (error) {
    console.error('Error assigning designer:', error);
    res.status(500).json({
      message: 'Failed to assign designer',
      error: error.message
    });
  }
};

// Get Salesman Drawing Dashboard - files for assigned customers
exports.getSalesmanDrawingDashboard = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];
    const userId = req.user?._id || req.user?.id;
    const User = require('../models/vlite/User');
    const Inquiry = require('../models/vlite/Inquiry');
    const Customer = require('../models/vlite/Customer');

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    // Disable caching to prevent 304 Not Modified and ensure fresh data
    res.setHeader('Cache-Control', 'no-store');

    // Get current user details
    const currentUser = await User.findById(userId).select('firstName lastName userRole email');

    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('🎯 SALESMAN DRAWING DASHBOARD:');
    console.log('   User ID:', userId);
    console.log('   User:', currentUser.firstName, currentUser.lastName);
    console.log('   Email:', currentUser.email);
    console.log('   Role:', currentUser.userRole);

    let drawings = [];

    // Main Account (POC/Admin/Design Dept Head) - Show ALL drawings
    if (currentUser.userRole === 'POC' || currentUser.userRole === 'Admin' || currentUser.userRole === 'Design Dept Head') {
      console.log('   📊 Main Account - Fetching ALL drawings');

      drawings = await Drawing.find({ organization: organizationId })
        .populate('customer', 'firstName lastName phone email fromInquiry')
        .populate('order', 'orderNumber orderDate')
        .populate('uploadedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .lean();

    } else {
      // Salesman - Show only assigned customers' drawings
      console.log('   👤 Salesman - Fetching assigned customers only');

      // METHOD 1: Find inquiries assigned to this salesman
      const assignedInquiries = await Inquiry.find({
        organization: organizationId,
        assignedTo: userId
      }).select('_id').lean();

      const inquiryIds = assignedInquiries.map(inq => inq._id);
      console.log('   ✓ Assigned Inquiries:', inquiryIds.length);
      if (inquiryIds.length > 0) {
        console.log('   Inquiry IDs:', inquiryIds.map(id => id.toString()).join(', '));
      }

      // METHOD 2: Find customers from these inquiries
      const assignedCustomers = await Customer.find({
        organizationId: new mongoose.Types.ObjectId(organizationId),
        fromInquiry: { $in: inquiryIds }
      }).select('_id firstName lastName fromInquiry').lean();

      const customerIds = assignedCustomers.map(c => c._id);
      console.log('   ✓ Assigned Customers (via Inquiry):', customerIds.length);
      if (customerIds.length > 0) {
        console.log('   Customer IDs:', customerIds.map(id => id.toString()).join(', '));
        assignedCustomers.forEach(c => {
          console.log(`      - ${c.firstName} ${c.lastName} (ID: ${c._id}, Inquiry: ${c.fromInquiry})`);
        });
      }

      // METHOD 3: Also find orders where this salesman is the creator/assignee
      const ordersWithSalesman = await Order.find({
        organizationId: new mongoose.Types.ObjectId(organizationId)
      })
        .populate({
          path: 'customer',
          populate: {
            path: 'fromInquiry',
            match: { assignedTo: userId }
          }
        })
        .select('customer')
        .lean();

      // Extract additional customer IDs from orders
      const orderCustomerIds = ordersWithSalesman
        .filter(order => order.customer?.fromInquiry)
        .map(order => order.customer._id);

      // Merge customer IDs (remove duplicates)
      const allCustomerIds = [...new Set([...customerIds, ...orderCustomerIds])];

      console.log('   ✓ Additional Customers (via Orders):', orderCustomerIds.length);
      console.log('   ✓ Total Unique Customers:', allCustomerIds.length);

      // METHOD 4: Build user fullname for salesmanName matching
      const userFullName = `${currentUser.firstName} ${currentUser.lastName}`.trim();
      const userFirstName = currentUser.firstName?.trim() || '';
      const userLastName = currentUser.lastName?.trim() || '';

      console.log('   Salesman Name Variations:');
      console.log(`      - Full: "${userFullName}"`);
      console.log(`      - First: "${userFirstName}"`);
      console.log(`      - Last: "${userLastName}"`);

      // Build query with multiple conditions
      const query = {
        organization: organizationId,
        $or: [
          // Match by customer ID
          { customer: { $in: allCustomerIds } },
          // Match by exact salesmanName (case-insensitive)
          { salesmanName: { $regex: new RegExp(`^${userFullName}$`, 'i') } },
          // Match by salesmanName containing first and last name
          { salesmanName: { $regex: new RegExp(`${userFirstName}.*${userLastName}`, 'i') } },
          // Match by salesmanName containing last and first name (reversed)
          { salesmanName: { $regex: new RegExp(`${userLastName}.*${userFirstName}`, 'i') } }
        ]
      };

      console.log('   📋 Query Conditions:');
      console.log('      - Customer IDs:', allCustomerIds.length);
      console.log('      - SalesmanName patterns: 4 variations');
      console.log('   🔍 Searching for drawings...');

      drawings = await Drawing.find(query)
        .populate('customer', 'firstName lastName phone email fromInquiry')
        .populate('order', 'orderNumber orderDate')
        .populate('uploadedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .lean();

      console.log('   📦 Drawings Found:', drawings.length);
      if (drawings.length > 0) {
        console.log('   📝 Drawing Details:');
        drawings.forEach((d, idx) => {
          console.log(`      [${idx + 1}] ID: ${d._id}`);
          console.log(`          Salesman: "${d.salesmanName}"`);
          console.log(`          Customer: ${d.customer?.firstName} ${d.customer?.lastName} (ID: ${d.customer?._id})`);
          console.log(`          Order: ${d.order?.orderNumber || 'N/A'}`);
          console.log(`          Files: ${d.additionalFiles?.length || 0}`);
        });
      } else {
        console.log('   ⚠️  No drawings found!');
        console.log('   🔍 Debug Info:');

        // Debug: Check all drawings for this org
        const allOrgDrawings = await Drawing.find({ organization: organizationId })
          .select('_id customer salesmanName')
          .populate('customer', 'firstName lastName')
          .lean();

        console.log(`   Total drawings in org: ${allOrgDrawings.length}`);
        if (allOrgDrawings.length > 0) {
          console.log('   All Drawing Salesman Names:');
          allOrgDrawings.forEach((d, idx) => {
            console.log(`      [${idx + 1}] "${d.salesmanName}" (Customer: ${d.customer?.firstName} ${d.customer?.lastName})`);
          });
        }
      }
    }

    console.log('   ✅ Total Drawings:', drawings.length);

    // Group drawings by customer for better organization
    const groupedByCustomer = {};
    drawings.forEach(drawing => {
      const customerId = drawing.customer?._id?.toString();
      if (!customerId) {
        console.log('   ⚠️  Skipping drawing without customer:', drawing._id);
        return;
      }

      if (!groupedByCustomer[customerId]) {
        groupedByCustomer[customerId] = {
          customerId: customerId, // Explicitly send customerId
          customerName: `${drawing.customer.firstName} ${drawing.customer.lastName}`,
          customer: drawing.customer,
          drawings: [],
          isComplete: false // Default
        };
      }
      groupedByCustomer[customerId].drawings.push(drawing);
    });

    console.log('   ✅ Grouped by Customers:', Object.keys(groupedByCustomer).length);

    // FETCH ORDER STATUS FOR EACH CUSTOMER
    // This determines if the group should be shown in "Done" or "Pending"
    const customerGroups = Object.values(groupedByCustomer);

    for (const group of customerGroups) {
      if (!group.customerId) continue;

      console.log(`   🔍 Checking Order for Customer: ${group.customerName} (ID: ${group.customerId})`);
      console.log(`      Org ID used: ${organizationId}`);

      // Try Strict Query first
      let latestOrder = await Order.findOne({
        organizationId: new mongoose.Types.ObjectId(organizationId),
        customer: group.customerId
      })
        .select('drawingApprovalStatus productionReady orderNumber')
        .sort({ createdAt: -1 });

      // Fallback: Try finding by Customer ID only (to detect Org ID mismatch)
      if (!latestOrder) {
        console.log('      ⚠️ Strict search failed. Trying loose search (Customer Only)...');
        const looseOrder = await Order.findOne({
          customer: group.customerId
        }).sort({ createdAt: -1 });

        if (looseOrder) {
          console.log(`      🎯 FOUND via Loose Search! Order Org ID: ${looseOrder.organizationId}`);
          // Use this order, assuming customer implies org context effectively for this debug
          latestOrder = looseOrder;
        } else {
          console.log('      ❌ Order NOT found even with loose search.');
        }
      }

      if (latestOrder) {
        group.isComplete = latestOrder.drawingApprovalStatus === 'APPROVED';
        group.orderStatus = latestOrder.drawingApprovalStatus; // Useful for debugging
        console.log(`   📝 Status: ${latestOrder.drawingApprovalStatus} (isComplete: ${group.isComplete}) - Order: ${latestOrder.orderNumber}`);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        drawings,
        groupedDrawings: groupedByCustomer, // Sending map as requested by frontend logic
        groupedByCustomer: customerGroups, // Sending array version too
        totalDrawings: drawings.length,
        totalCustomers: Object.keys(groupedByCustomer).length
      }
    });
  } catch (error) {
    console.error('❌ Error fetching salesman drawing dashboard:', error);
    res.status(500).json({
      message: 'Failed to fetch drawing dashboard',
      error: error.message
    });
  }
};

// Approve a drawing
exports.approveDrawing = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const drawing = await Drawing.findById(id);

    if (!drawing) {
      return res.status(404).json({ message: 'Drawing not found' });
    }

    await drawing.markApproved(userId);

    // Check if all drawings for this customer are now approved
    if (drawing.customer) {
      const allDrawings = await Drawing.find({
        customer: drawing.customer,
        organizationId: req.organization._id
      });

      const allApproved = allDrawings.every(d => d.approvalStatus === 'APPROVED');

      // If all drawings approved, mark the order as production-ready
      if (allApproved && allDrawings.length > 0) {
        const order = await Order.findOne({
          customer: drawing.customer,
          organizationId: req.organization._id
        }).sort({ createdAt: -1 }); // Get the latest order

        if (order && !order.productionReady) {
          order.productionReady = true;
          order.markedProductionReadyAt = new Date();
          order.markedProductionReadyBy = userId;
          await order.save();

          console.log(`✅ Order ${order.orderNumber} marked as production-ready - all drawings approved!`);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Drawing approved successfully',
      data: drawing
    });
  } catch (error) {
    console.error('Error approving drawing:', error);
    res.status(500).json({
      message: 'Failed to approve drawing',
      error: error.message
    });
  }
};

// Reject a drawing (Permanently DELETE from database and filesystem)
exports.rejectDrawing = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

    console.log('🗑️  REJECT/DELETE Request:', {
      drawingId: id,
      reason: reason || 'No reason provided',
      userId
    });

    const drawing = await Drawing.findById(id);

    if (!drawing) {
      console.error('❌ Drawing not found:', id);
      return res.status(404).json({ message: 'Drawing not found' });
    }

    console.log('📄 Drawing to delete:', {
      fileName: drawing.fileName,
      customer: drawing.customer,
      salesman: drawing.salesmanName,
      fileUrl: drawing.drawingUrl
    });

    // Delete physical files from disk
    const filesToDelete = [];

    // Main drawing file
    if (drawing.drawingUrl) {
      filesToDelete.push(drawing.drawingUrl);
    }

    // Additional files
    if (drawing.additionalFiles && drawing.additionalFiles.length > 0) {
      drawing.additionalFiles.forEach(file => {
        if (file.fileUrl) {
          filesToDelete.push(file.fileUrl);
        }
      });
    }

    // Delete files from disk
    for (const fileUrl of filesToDelete) {
      try {
        const filePath = path.join(__dirname, '..', fileUrl);
        await fs.unlink(filePath);
        console.log('✅ Deleted file:', filePath);
      } catch (fileErr) {
        console.warn('⚠️  Could not delete file:', fileUrl, fileErr.message);
        // Continue even if file deletion fails (file might not exist)
      }
    }

    // Delete from database
    await Drawing.findByIdAndDelete(id);

    console.log('✅ Drawing permanently deleted from database:', id);

    res.status(200).json({
      success: true,
      message: 'Drawing permanently deleted',
      deletedId: id
    });
  } catch (error) {
    console.error('❌ Error deleting drawing:', error);
    res.status(500).json({
      message: 'Failed to delete drawing',
      error: error.message
    });
  }
};

// Mark customer drawings as complete (for Pre-Production workflow)
exports.markCustomerDrawingsComplete = async (req, res) => {
  console.log('🔥 ENTERING markCustomerDrawingsComplete');
  try {
    const { customerId } = req.params;
    const userId = req.user?._id || req.user?.id;

    console.log('📍 Params:', { customerId, userId });

    // Get organization ID
    let organizationId = req.user?.organizationId
      || req.organization?._id
      || req.headers['x-tenant-id'];

    if (organizationId && typeof organizationId === 'object' && organizationId.toString) {
      organizationId = organizationId.toString();
    }

    console.log('📍 Org ID identified:', organizationId);

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    if (!customerId) {
      return res.status(400).json({ message: 'Customer ID is required' });
    }

    // Convert Org ID
    console.log('📍 Converting Org ID...');
    let orgObjectId;
    try {
      if (mongoose.Types.ObjectId.isValid(organizationId)) {
        orgObjectId = new mongoose.Types.ObjectId(organizationId);
      } else {
        return res.status(400).json({ message: 'Invalid Organization ID format' });
      }
    } catch (e) {
      return res.status(400).json({ message: 'Invalid Organization ID' });
    }

    // Query Order
    console.log('📍 Querying Order...');
    const order = await Order.findOne({
      organizationId: orgObjectId,
      customer: customerId
    }).sort({ createdAt: -1 });

    console.log('📍 Query Result:', order ? 'Found' : 'Not Found');

    if (!order) {
      return res.status(404).json({ message: 'Order not found for this customer' });
    }

    // Update Order
    console.log('📍 Updating Order...');
    order.drawingApprovalStatus = 'APPROVED';
    order.drawingApprovedAt = new Date();
    order.drawingApprovedBy = userId;
    order.productionReady = true;
    order.markedProductionReadyAt = new Date();
    order.markedProductionReadyBy = userId;

    await order.save();
    console.log('✅ Order saved successfully');

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('💥 CRITICAL ERROR:', error);
    console.error('💥 Stack:', error.stack);
    res.status(500).json({
      message: 'Failed',
      error: error.message,
      stack: error.stack
    });
  }
};


// Undo drawing completion (revert to pending)
exports.undoCustomerDrawingsComplete = async (req, res) => {
  try {
    const { customerId } = req.params;

    // Get organization ID from multiple sources (most reliable first)
    let organizationId = req.user?.organizationId
      || req.organization?._id
      || req.headers['x-tenant-id'];

    // Ensure organizationId is a string
    if (organizationId && typeof organizationId === 'object' && organizationId.toString) {
      organizationId = organizationId.toString();
    }

    console.log('↩️  UNDO CUSTOMER DRAWINGS COMPLETE:', {
      customerId,
      organizationId
    });

    if (!organizationId) {
      console.error('❌ No organization ID found in request');
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    if (!customerId) {
      return res.status(400).json({ message: 'Customer ID is required' });
    }

    // Safely convert to ObjectId to PREVENT 500 CRASH
    let orgObjectId;
    try {
      if (mongoose.Types.ObjectId.isValid(organizationId)) {
        orgObjectId = new mongoose.Types.ObjectId(organizationId);
      } else {
        console.error('❌ Invalid Organization ID format (not an ObjectId):', organizationId);
        return res.status(400).json({ message: 'Invalid Organization ID format' });
      }
    } catch (e) {
      console.error('❌ Error converting Organization ID:', e);
      return res.status(400).json({ message: 'Invalid Organization ID' });
    }

    // Find the customer's order
    const order = await Order.findOne({
      organizationId: orgObjectId,
      customer: customerId
    }).sort({ createdAt: -1 });

    if (!order) {
      return res.status(404).json({ message: 'Order not found for this customer' });
    }

    // Revert order status
    order.drawingApprovalStatus = 'PENDING';
    order.drawingApprovedAt = null;
    order.drawingApprovedBy = null;
    order.productionReady = false;
    order.markedProductionReadyAt = null;
    order.markedProductionReadyBy = null;

    await order.save();

    console.log(`↩️  Order ${order.orderNumber} reverted to pending!`);

    res.status(200).json({
      success: true,
      message: 'Drawing completion undone',
      data: order
    });
  } catch (error) {
    console.error('❌ Error undoing drawing completion:', error);
    res.status(500).json({
      message: 'Failed to undo drawing completion',
      error: error.message
    });
  }
};

// ============ CLIENT APPROVAL WORKFLOW ============

/**
 * Send drawing approval email to client
 */
exports.sendDrawingApprovalEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-tenant-id'];
    const userId = req.user?._id || req.user?.id;

    console.log('📧 SEND DRAWING APPROVAL EMAIL:', { drawingId: id, organizationId, userId });

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    // Find the drawing with populated customer and salesman info
    const drawing = await Drawing.findOne({
      _id: id,
      organization: organizationId
    })
      .populate('customer', 'firstName lastName email phone')
      .lean();

    if (!drawing) {
      return res.status(404).json({ message: 'Drawing not found' });
    }

    // Validate customer email
    if (!drawing.customer || !drawing.customer.email) {
      return res.status(400).json({ message: 'Customer email not found' });
    }

    // Check if already approved
    if (drawing.clientApprovalStatus === 'APPROVED') {
      return res.status(400).json({ message: 'Drawing already approved by client' });
    }

    // Generate approval token (using crypto for security)
    const crypto = require('crypto');
    const approvalToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 7); // Valid for 7 days

    // Update drawing with token
    await Drawing.findByIdAndUpdate(id, {
      clientApprovalToken: approvalToken,
      clientApprovalTokenExpiry: tokenExpiry,
      clientApprovalEmailSentAt: new Date(),
      clientApprovalStatus: 'PENDING'
    });

    // Get salesman info
    const User = require('../models/vlite/User');
    let salesman = null;

    // Try to find salesman by userId first
    if (userId) {
      salesman = await User.findById(userId).select('firstName lastName email').lean();
    }

    // Fallback: create salesman object from salesmanName
    if (!salesman && drawing.salesmanName) {
      const nameParts = drawing.salesmanName.split(' ');
      salesman = {
        firstName: nameParts[0] || 'Sales',
        lastName: nameParts.slice(1).join(' ') || 'Team',
        email: process.env.SMTP_FROM || 'sales@vlitefurnitech.com'
      };
    }

    // Send email to client
    const emailResult = await EmailService.sendDrawingApprovalToClient(
      drawing,
      drawing.customer,
      salesman,
      approvalToken
    );

    if (!emailResult.success) {
      console.error('❌ Failed to send approval email:', emailResult.error);
      return res.status(500).json({
        message: 'Failed to send approval email',
        error: emailResult.error
      });
    }

    console.log('✅ Approval email sent successfully to:', drawing.customer.email);

    res.status(200).json({
      success: true,
      message: `Approval email sent to ${drawing.customer.email}`,
      data: {
        emailSent: true,
        customerEmail: drawing.customer.email,
        tokenExpiry: tokenExpiry
      }
    });

  } catch (error) {
    console.error('❌ Error sending approval email:', error);
    res.status(500).json({
      message: 'Failed to send approval email',
      error: error.message
    });
  }
};

/**
 * Handle client approval via email link (public route)
 */
exports.handleClientApproval = async (req, res) => {
  try {
    const { token } = req.params;

    console.log('✅ CLIENT APPROVAL REQUEST:', { token: token.substring(0, 10) + '...' });

    if (!token) {
      return res.status(400).json({ message: 'Approval token is required' });
    }

    // Find drawing by token
    const drawing = await Drawing.findOne({
      clientApprovalToken: token
    })
      .populate('customer', 'firstName lastName email phone')
      .lean();

    if (!drawing) {
      return res.status(404).json({
        message: 'Invalid approval link',
        error: 'INVALID_TOKEN'
      });
    }

    // Check if token expired
    if (new Date() > new Date(drawing.clientApprovalTokenExpiry)) {
      await Drawing.findByIdAndUpdate(drawing._id, {
        clientApprovalStatus: 'EXPIRED'
      });

      return res.status(400).json({
        message: 'Approval link has expired',
        error: 'TOKEN_EXPIRED'
      });
    }

    // Check if already approved
    if (drawing.clientApprovalStatus === 'APPROVED') {
      return res.status(400).json({
        message: 'Drawing already approved',
        error: 'ALREADY_APPROVED'
      });
    }

    // Update drawing status
    await Drawing.findByIdAndUpdate(drawing._id, {
      clientApprovalStatus: 'APPROVED',
      clientApprovedAt: new Date(),
      clientApprovalToken: null, // Clear token after use
      clientApprovalTokenExpiry: null
    });

    console.log('✅ Drawing approved by client:', drawing._id);

    // Get salesman info to send notification
    const User = require('../models/vlite/User');
    let salesman = null;

    // Try to find salesman from drawing's uploadedBy or organization users
    if (drawing.uploadedBy) {
      salesman = await User.findById(drawing.uploadedBy).select('firstName lastName email').lean();
    }

    // Fallback: find by salesmanName
    if (!salesman && drawing.salesmanName) {
      const nameParts = drawing.salesmanName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      salesman = await User.findOne({
        organization: drawing.organization,
        firstName: { $regex: new RegExp(firstName, 'i') },
        lastName: { $regex: new RegExp(lastName, 'i') }
      }).select('firstName lastName email').lean();
    }

    // Send notification to salesman
    if (salesman && salesman.email) {
      const updatedDrawing = await Drawing.findById(drawing._id).lean();

      EmailService.sendDrawingClientApprovalNotificationToSalesman(
        updatedDrawing,
        drawing.customer,
        salesman
      )
        .then(result => {
          if (result.success) {
            console.log('✅ Notification email sent to salesman:', salesman.email);
          } else {
            console.warn('⚠️ Failed to send notification to salesman:', result.error);
          }
        })
        .catch(err => console.error('⚠️ Notification email error:', err.message));
    } else {
      console.warn('⚠️ Could not find salesman to notify');
    }

    // Return success response (can be used to show a success page)
    res.status(200).json({
      success: true,
      message: 'Drawing approved successfully! Your sales representative has been notified.',
      data: {
        drawingFileName: drawing.fileName,
        customerName: `${drawing.customer.firstName} ${drawing.customer.lastName}`,
        approvedAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error handling client approval:', error);
    res.status(500).json({
      message: 'Failed to process approval',
      error: error.message
    });
  }
};

/**
 * Verify approval token (helper method)
 */
exports.verifyApprovalToken = async (token) => {
  try {
    const drawing = await Drawing.findOne({
      clientApprovalToken: token
    }).lean();

    if (!drawing) {
      return { valid: false, error: 'INVALID_TOKEN' };
    }

    if (new Date() > new Date(drawing.clientApprovalTokenExpiry)) {
      return { valid: false, error: 'TOKEN_EXPIRED' };
    }

    if (drawing.clientApprovalStatus === 'APPROVED') {
      return { valid: false, error: 'ALREADY_APPROVED' };
    }

    return { valid: true, drawing };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};
