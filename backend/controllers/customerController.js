const Customer = require('../models/vlite/Customer');
const Inquiry = require('../models/vlite/Inquiry');
const User = require('../models/vlite/User');
const EmailService = require('../utils/emailService');
const mongoose = require('mongoose');

// Get all customers
exports.getAllCustomers = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const { search, page = 1, limit = 100 } = req.query;
    const userId = req.user?._id;
    const userRole = req.user?.userRole; // Use userRole string, not role object
    const userEmail = req.user?.email;

    console.log('🔍 [getAllCustomers] User details:', {
      userId: userId?.toString(),
      userRole,
      userEmail,
      hasUser: !!req.user
    });

    const query = { organizationId: new mongoose.Types.ObjectId(organizationId) };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch customers with populated inquiry data
    let customers = await Customer.find(query)
      .populate({
        path: 'fromInquiry',
        populate: {
          path: 'assignedTo',
          select: 'email firstName lastName userRole'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    let total = await Customer.countDocuments(query);

    console.log(`📊 [getAllCustomers] Found ${customers.length} customers before filtering`);

    // Filter for salesman - only show customers from assigned inquiries
    // Only apply filter if we have valid user data
    if (userId && userRole && userEmail) {
      const mainAccountEmails = ['vlite@vlite.in', 'vliteofficial@vlite.in'];
      const isMainAccount = mainAccountEmails.includes(userEmail.toLowerCase());

      if (userRole.toLowerCase() === 'salesman' && !isMainAccount) {
        console.log('👤 [getAllCustomers] Filtering for salesman');

        // Only show customers that came from inquiries assigned to this salesman
        customers = customers.filter(customer => {
          // If customer was created from an inquiry
          if (customer.fromInquiry) {
            const assignedToId = customer.fromInquiry.assignedTo?._id?.toString() || customer.fromInquiry.assignedTo?.toString();
            const isAssigned = assignedToId === userId.toString();

            console.log('  Customer:', customer.customerCode,
              'Inquiry assigned to:', assignedToId,
              'Current user:', userId.toString(),
              'Match:', isAssigned);

            return isAssigned;
          }

          // If customer was NOT created from an inquiry (direct creation)
          // Don't show to salesmen
          console.log('  Customer:', customer.customerCode, 'No linked inquiry - hiding from salesman');
          return false;
        });

        // Update total for salesman
        total = customers.length;

        console.log(`✅ [getAllCustomers] Filtered to ${total} customers for salesman`);
      } else {
        console.log('👑 [getAllCustomers] Admin/POC - showing all customers');
      }
    } else {
      console.log('⚠️ [getAllCustomers] User data incomplete - showing all customers (default to admin behavior)');
      console.log('  userId:', !!userId, 'userRole:', userRole, 'userEmail:', userEmail);
    }

    res.status(200).json({
      success: true,
      data: customers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ [getAllCustomers] Error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      message: 'Error fetching customers',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-tenant-id'];

    const customer = await Customer.findOne({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(organizationId)
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ message: 'Error fetching customer', error: error.message });
  }
};

// Create customer
exports.createCustomer = async (req, res) => {
  try {
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const customerData = {
      ...req.body,
      organizationId: new mongoose.Types.ObjectId(organizationId)
    };

    const customer = new Customer(customerData);
    await customer.save();

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully'
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ message: 'Error creating customer', error: error.message });
  }
};

// Update customer
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    console.log('📝 [updateCustomer] Updating customer:', id);
    console.log('📝 [updateCustomer] Request body:', req.body);

    const customer = await Customer.findOneAndUpdate(
      {
        _id: id,
        organizationId: new mongoose.Types.ObjectId(organizationId)
      },
      { $set: req.body },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    console.log('✅ [updateCustomer] Customer updated');

    // If productType was updated, also update related orders
    if (req.body.productType) {
      const Order = require('../models/vlite/Order');

      console.log(`🔄 [updateCustomer] Updating related orders with productType: ${req.body.productType}`);

      const updateResult = await Order.updateMany(
        {
          customer: id,
          organizationId: new mongoose.Types.ObjectId(organizationId)
        },
        {
          $set: { productType: req.body.productType }
        }
      );

      console.log(`✅ [updateCustomer] Updated ${updateResult.modifiedCount} order(s) with new productType`);
    }

    // Check if we need to handle assignment (sync with Inquiry)
    if (req.body.assignedTo) {
      console.log(`🔄 [updateCustomer] Handling assignment to: ${req.body.assignedTo}`);

      const salesmanId = req.body.assignedTo;

      // If customer is from an inquiry, update the inquiry
      if (customer.fromInquiry) {
        const inquiry = await Inquiry.findById(customer.fromInquiry);
        if (inquiry) {
          inquiry.assignedTo = salesmanId;
          inquiry.assignmentStatus = 'assigned';
          inquiry.assignedAt = new Date();
          inquiry.assignedBy = req.user?._id;
          await inquiry.save();
          console.log(`✅ [updateCustomer] Linked Inquiry ${inquiry._id} updated with new salesman`);

          // Send Email to Salesman
          try {
            const salesman = await User.findById(salesmanId);
            if (salesman && salesman.email) {
              const assignerName = req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Admin';
              await EmailService.sendInquiryAssignmentEmail(inquiry, salesman, assignerName);
              console.log(`✉️ Assignment email sent to ${salesman.email}`);
            }
          } catch (emailErr) {
            console.error('⚠️ Failed to send assignment email:', emailErr.message);
          }
        }
      } else {
        console.log('⚠️ [updateCustomer] Customer has no linked inquiry - cannot assign salesman at backend level (schema restriction)');
        // TODO: Consider adding assignedTo to Customer schema for direct customers
      }
    }

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ message: 'Error updating customer', error: error.message });
  }
};

// Delete customer
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const customer = await Customer.findOneAndDelete({
      _id: id,
      organizationId: new mongoose.Types.ObjectId(organizationId)
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ message: 'Error deleting customer', error: error.message });
  }
};

// Update advance payment for customer
exports.updateAdvancePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { advancePaymentAmount } = req.body;
    const organizationId = req.headers['x-tenant-id'];

    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    if (advancePaymentAmount === undefined || advancePaymentAmount === null) {
      return res.status(400).json({ message: 'Advance payment amount is required' });
    }

    console.log('💰 [updateAdvancePayment] Updating customer:', id);
    console.log('💰 [updateAdvancePayment] New advance amount:', advancePaymentAmount);

    // Update customer advance payment
    const customer = await Customer.findOneAndUpdate(
      {
        _id: id,
        organizationId: new mongoose.Types.ObjectId(organizationId)
      },
      {
        $set: {
          advancePaymentAmount: parseFloat(advancePaymentAmount),
          advancePaymentStatus: parseFloat(advancePaymentAmount) > 0 ? 'Partial' : 'Not Paid'
        }
      },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    console.log('✅ [updateAdvancePayment] Customer advance payment updated');

    // Update related orders - set advance received to the new amount
    const Order = require('../models/vlite/Order');

    console.log('🔄 [updateAdvancePayment] Updating related orders...');

    const orders = await Order.find({
      customer: id,
      organizationId: new mongoose.Types.ObjectId(organizationId)
    });

    console.log(`📦 [updateAdvancePayment] Found ${orders.length} orders for this customer`);

    let updatedOrdersCount = 0;

    for (const order of orders) {
      order.advanceReceived = parseFloat(advancePaymentAmount);
      order.balanceAmount = order.totalAmount - order.advanceReceived;

      // Update payment status
      if (order.balanceAmount <= 0) {
        order.paymentStatus = 'COMPLETED';
      } else if (order.advanceReceived > 0) {
        order.paymentStatus = 'PARTIAL';
      } else {
        order.paymentStatus = 'PENDING';
      }

      await order.save();
      updatedOrdersCount++;
    }

    console.log(`✅ [updateAdvancePayment] Updated ${updatedOrdersCount} order(s) with new advance payment`);

    // Send email to customer confirming payment
    try {
      const primaryEmail = customer.emails?.find(e => e.type === 'Primary')?.email || customer.email;
      if (primaryEmail) {
        // We can notify about the payment application
        // For now, let's keep it simple or use a new EmailService method if needed.
        // Assuming we want to notify them that their payment is reflected.
        console.log(`ℹ️ Advance payment email logic placeholder for ${primaryEmail}`);

        // TODO: Add specific EmailService.sendPaymentReceipt(customer, amount, orders) if required by user later.
        // Currently user asked for "Production" and "Design" assignments specifically.
      }
    } catch (emailErr) {
      console.error('⚠️ Failed to process payment email:', emailErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Advance payment updated successfully. ${updatedOrdersCount} order(s) updated.`,
      data: {
        customer,
        ordersUpdated: updatedOrdersCount
      }
    });
  } catch (error) {
    console.error('Error updating advance payment:', error);
    res.status(500).json({ message: 'Error updating advance payment', error: error.message });
  }
};

