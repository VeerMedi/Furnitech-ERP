const Inquiry = require('../models/vlite/Inquiry');
const User = require('../models/vlite/User');
const ReminderSetting = require('../models/vlite/ReminderSetting');
const EmailService = require('../utils/emailService');
const { scoreInquiry: calculateLeadScore, rescoreInquiry: recalculateLeadScore } = require('../../AI/lead tracking/leadScoring');

/**
 * Get all inquiries for the organization
 */
exports.getAllInquiries = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const userId = req.user?.id;
    const userRole = req.user?.userRole;

    console.log('getAllInquiries - Tenant ID:', tenantId);
    console.log('getAllInquiries - User ID:', userId);
    console.log('getAllInquiries - User Role:', userRole);

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    // Check if we want to show history (onboarded inquiries) or active inquiries
    const showHistory = req.query.showHistory === 'true';

    // Build query based on data source user and history filter
    const query = { organization: tenantId };

    // Filter based on history view
    if (showHistory) {
      query.isOnboarded = true; // Show only onboarded inquiries
    } else {
      query.isOnboarded = { $ne: true }; // Show only active inquiries (not onboarded)
    }

    // Check if user is Main Account / Admin (Bypass filters)
    const userEmail = req.user?.email?.toLowerCase() || '';
    // Add known main account keywords here
    const isMainAccount = userEmail.includes('jasleen') ||
      userEmail.includes('admin');

    console.log('👤 User Email:', userEmail);
    console.log('🔑 Is Main Account (Bypass Filter):', isMainAccount);

    // 🔐 SALESMAN FILTER: If user is a Salesman AND NOT Main Account
    // Main account users with 'Salesman' role should still see everything
    if (userRole && userRole === 'Salesman' && userId && !isMainAccount) {
      query.assignedTo = userId;
      query.assignmentStatus = { $ne: 'unassigned' }; // Exclude unassigned inquiries
      console.log('🔒 SALESMAN FILTER APPLIED - Only showing assigned inquiries for user:', userId);
    } else {
      console.log('✅ MAIN ACCOUNT / POC / ADMIN - Showing ALL inquiries for organization');
      console.log('   No user-specific filters applied');
    }

    const inquiries = await Inquiry.find(query)
      .sort({ createdAt: -1 });

    console.log(`Found ${inquiries.length} inquiries for tenant ${tenantId}`);

    // Transform to frontend-compatible format with AI scoring data
    const data = inquiries.map(inquiry => ({
      _id: inquiry._id,
      customerName: inquiry.meta?.customerName || 'Unknown',
      companyName: inquiry.companyName || inquiry.meta?.companyName || '',
      customerId: inquiry.customerId || '',
      contact: inquiry.meta?.contact || '',
      email: inquiry.meta?.email || '',
      address: inquiry.meta?.address || '',
      enquiryDate: inquiry.meta?.enquiryDate || '',
      enquiryTime: inquiry.meta?.enquiryTime || '',
      productName: inquiry.items?.[0]?.description || '',
      status: inquiry.meta?.status || 'new',
      priority: inquiry.priority || inquiry.meta?.aiPriority || inquiry.meta?.priority || 'medium',
      leadPlatform: inquiry.meta?.leadPlatform || inquiry.leadPlatform || 'Website',
      leadStatus: inquiry.leadStatus || inquiry.meta?.leadStatus || 'NEW',
      probability: inquiry.probability || 20,
      message: inquiry.notes || '',
      productDetails: inquiry.items?.[0]?.meta?.details || '',
      items: inquiry.items || [],
      createdAt: inquiry.createdAt,
      // Include full meta object for frontend
      meta: inquiry.meta,
      // AI Scoring data
      aiScore: inquiry.meta?.aiScore,
      aiPriority: inquiry.meta?.aiPriority,
      aiInsights: inquiry.meta?.aiInsights,
      aiConfidence: inquiry.ai?.confidence,
      // Onboarding history data
      isOnboarded: inquiry.isOnboarded,
      onboardedAt: inquiry.onboardedAt,
      onboardedCustomerCode: inquiry.onboardedCustomerCode,
      // Assignment data
      assignedTo: inquiry.assignedTo,
      assignedAt: inquiry.assignedAt,
      assignedBy: inquiry.assignedBy,
      assignmentStatus: inquiry.assignmentStatus || (inquiry.assignedTo ? 'assigned' : null),
      unassignedBy: inquiry.unassignedBy,
      unassignedAt: inquiry.unassignedAt,
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error getting inquiries:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inquiries' });
  }
};

/**
 * Get single inquiry by ID
 */
exports.getInquiryById = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const inquiry = await Inquiry.findOne({ _id: req.params.id, organization: tenantId });

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    res.status(200).json({ success: true, data: inquiry });
  } catch (error) {
    console.error('Error getting inquiry:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inquiry' });
  }
};

/**
 * Create new inquiry
 */
exports.createInquiry = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    console.log('createInquiry - Tenant ID:', tenantId);
    console.log('createInquiry - Body:', req.body);
    console.log('createInquiry - User:', req.user);

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const { customerName, companyName, customerId, contact, email, address, enquiryDate, enquiryTime, productName, status, priority, leadPlatform, leadStatus, probability, message, productDetails } = req.body;

    // Auto-generate customerId if not provided or empty
    const finalCustomerId = (customerId && customerId.trim())
      ? customerId
      : `C-${Math.floor(100000 + Math.random() * 900000)}`;

    const inquiryData = {
      organization: tenantId,
      // Handle hardcoded admin (id is a string, not ObjectId)
      createdBy: req.user?.id === 'hardcoded-admin-system' ? null : req.user?.id,
      companyName: companyName && companyName.trim() ? companyName : '',
      customerId: finalCustomerId,
      status: 'OPEN',
      leadPlatform: leadPlatform && leadPlatform.trim() ? leadPlatform : 'Website',
      leadStatus: leadStatus || 'NEW',
      probability: probability || 20,
      priority: priority || 'medium',
      notes: message,
      items: req.body.items || [{
        description: productName,
        quantity: 1,
        meta: { details: productDetails }
      }],
      meta: {
        customerName,
        contact,
        email,
        address,
        enquiryDate,
        enquiryTime,
        status: status || 'new',
      },
      referenceId: `INQ-${Date.now()}`,
    };

    console.log('Creating inquiry with data:', JSON.stringify(inquiryData, null, 2));

    const inquiry = new Inquiry(inquiryData);

    // AI Lead Scoring - Automatically score the inquiry
    const scoringResult = calculateLeadScore(inquiry);
    console.log('AI Lead Score:', scoringResult.score, 'Priority:', scoringResult.priority);

    // Update inquiry with AI scoring results
    inquiry.probability = scoringResult.probability;
    inquiry.meta.aiScore = scoringResult.score;
    inquiry.meta.aiPriority = scoringResult.priority.toLowerCase();
    inquiry.ai = {
      confidence: scoringResult.confidence,
      lastEvaluatedAt: scoringResult.scoredAt,
      suggestedPrices: {}, // Placeholder for future pricing AI
      validation: { passed: true, issues: [] }
    };

    // Store scoring insights in meta for frontend display
    inquiry.meta.aiInsights = scoringResult.insights;
    inquiry.meta.aiBreakdown = scoringResult.breakdown;

    // Mark nested objects as modified so Mongoose saves them
    inquiry.markModified('meta');
    inquiry.markModified('ai');

    await inquiry.save();
    console.log('Inquiry saved successfully:', inquiry._id, 'with AI score:', scoringResult.score);

    // --- NOTIFICATION LOGIC ---
    try {
      // Find Admin and Manager users for this organization
      const admins = await User.find({
        organizationId: tenantId,
        userRole: 'Admin',
        isActive: true
      }).select('email firstName lastName');

      if (admins.length > 0) {
        // 🔥 Redirect admin alerts to mohitrathormohit33@gmail.com for testing/verification
        const redirectedAdmins = admins.map(a => ({
          ...a.toObject(),
          email: 'mohitrathormohit33@gmail.com'
        }));
        await EmailService.sendNewInquiryNotification(inquiry, redirectedAdmins);
        console.log(`✉️ New Inquiry notification redirected to mohitrathormohit33@gmail.com`);
      }
    } catch (notifyErr) {
      console.error('Failed to send inquiry notification:', notifyErr.message);
    }
    // ---------------------------

    // Return in same format as getAll with AI scoring data
    const data = {
      _id: inquiry._id,
      customerName,
      companyName: companyName || '',
      customerId: finalCustomerId, // Use auto-generated ID
      contact,
      email,
      address,
      enquiryDate,
      enquiryTime,
      productName,
      status: status || 'new',
      priority: inquiry.priority || inquiry.meta.aiPriority || 'medium',
      leadPlatform: leadPlatform || 'Website',
      leadStatus: leadStatus || 'NEW',
      probability: inquiry.probability,
      message,
      productDetails,
      createdAt: inquiry.createdAt,
      // AI Scoring data
      aiScore: inquiry.meta.aiScore,
      aiPriority: inquiry.meta.aiPriority,
      aiInsights: inquiry.meta.aiInsights,
    };

    res.status(201).json({ success: true, data, message: 'Inquiry created successfully' });
  } catch (error) {
    console.error('Error creating inquiry:', error);
    // Log validation errors specifically
    if (error.name === 'ValidationError') {
      console.error('Validation Errors:', error.errors);
    }
    res.status(500).json({ success: false, message: 'Failed to create inquiry', error: error.message });
  }
};

/**
 * Update inquiry
 */
exports.updateInquiry = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const inquiry = await Inquiry.findOne({ _id: req.params.id, organization: tenantId });

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    const { customerName, companyName, customerId, contact, email, address, enquiryDate, enquiryTime, productName, status, priority, leadPlatform, leadStatus, probability, message, productDetails } = req.body;

    // Preserve existing AI fields before updating
    const existingAiFields = {
      aiScore: inquiry.meta?.aiScore,
      aiPriority: inquiry.meta?.aiPriority,
      aiInsights: inquiry.meta?.aiInsights,
      aiBreakdown: inquiry.meta?.aiBreakdown,
    };

    // Update top-level fields
    inquiry.companyName = companyName || '';
    inquiry.customerId = customerId || '';
    inquiry.notes = message;
    inquiry.leadPlatform = leadPlatform || 'Website';
    inquiry.leadStatus = leadStatus || 'NEW';
    inquiry.priority = priority || 'medium';

    if (req.body.items) {
      inquiry.items = req.body.items;
    } else if (productName) {
      // Legacy support if only single product provided
      inquiry.items = [{
        description: productName,
        quantity: 1,
        meta: { details: productDetails }
      }];
    }

    inquiry.meta = {
      customerName,
      contact,
      email,
      address,
      enquiryDate,
      enquiryTime,
      status: status || 'new',
      // Preserve existing AI fields
      ...existingAiFields,
    };

    // Re-score inquiry after updates (data may have changed)
    const scoringResult = recalculateLeadScore(inquiry);
    console.log('AI Re-score:', scoringResult.score, 'Priority:', scoringResult.priority);

    // Update with new AI scoring
    inquiry.probability = probability !== undefined ? probability : scoringResult.probability;
    inquiry.meta.aiScore = scoringResult.score;
    inquiry.meta.aiPriority = scoringResult.priority.toLowerCase();
    inquiry.meta.aiInsights = scoringResult.insights;
    inquiry.meta.aiBreakdown = scoringResult.breakdown;

    // Preserve existing ai fields and only update what's needed
    if (!inquiry.ai) {
      inquiry.ai = {};
    }
    inquiry.ai.confidence = scoringResult.confidence;
    inquiry.ai.lastEvaluatedAt = scoringResult.scoredAt;
    // Ensure validation has proper structure
    if (!inquiry.ai.validation || typeof inquiry.ai.validation !== 'object') {
      inquiry.ai.validation = { passed: true, issues: [] };
    }
    // Preserve suggestedPrices
    if (!inquiry.ai.suggestedPrices) {
      inquiry.ai.suggestedPrices = {};
    }

    // Mark nested objects as modified so Mongoose saves them
    inquiry.markModified('meta');
    inquiry.markModified('ai');

    await inquiry.save();

    // Return in same format as getAll with AI scoring data
    const data = {
      _id: inquiry._id,
      customerName,
      companyName: inquiry.companyName || '',
      customerId: inquiry.customerId || '',
      contact,
      email,
      address,
      enquiryDate,
      enquiryTime,
      productName,
      status: status || 'new',
      priority: inquiry.priority || inquiry.meta.aiPriority || 'medium',
      leadPlatform: leadPlatform || 'Website',
      leadStatus: leadStatus || 'NEW',
      probability: inquiry.probability,
      message,
      productDetails,
      createdAt: inquiry.createdAt,
      // AI Scoring data
      aiScore: inquiry.meta.aiScore,
      aiPriority: inquiry.meta.aiPriority,
      aiInsights: inquiry.meta.aiInsights,
    };

    res.status(200).json({ success: true, data, message: 'Inquiry updated successfully' });
  } catch (error) {
    console.error('Error updating inquiry:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Failed to update inquiry', error: error.message });
  }
};

/**
 * Manual re-score inquiry
 * Useful when you want to recalculate the AI score without updating other fields
 */
exports.rescoreInquiry = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const inquiry = await Inquiry.findOne({ _id: req.params.id, organization: tenantId });

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    // Re-score the inquiry
    const scoringResult = recalculateLeadScore(inquiry);
    console.log('Manual re-score requested:', scoringResult.score, 'Priority:', scoringResult.priority);

    // Ensure meta object exists
    if (!inquiry.meta) {
      inquiry.meta = {};
    }

    // Update AI fields
    inquiry.probability = scoringResult.probability;
    inquiry.meta.aiScore = scoringResult.score;
    inquiry.meta.aiPriority = scoringResult.priority.toLowerCase();
    inquiry.meta.aiInsights = scoringResult.insights;
    inquiry.meta.aiBreakdown = scoringResult.breakdown;

    // Mark meta as modified for Mongoose to save nested changes
    inquiry.markModified('meta');

    if (!inquiry.ai) {
      inquiry.ai = {};
    }
    inquiry.ai.confidence = scoringResult.confidence;
    inquiry.ai.lastEvaluatedAt = scoringResult.scoredAt;
    inquiry.ai.suggestedPrices = inquiry.ai.suggestedPrices || {};
    inquiry.ai.validation = inquiry.ai.validation || { passed: true, issues: [] };

    // Mark ai as modified for Mongoose to save nested changes
    inquiry.markModified('ai');

    await inquiry.save();
    console.log('Inquiry saved successfully after re-scoring. New score:', scoringResult.score);

    res.status(200).json({
      success: true,
      data: {
        score: scoringResult.score,
        priority: scoringResult.priority,
        probability: scoringResult.probability,
        insights: scoringResult.insights,
        breakdown: scoringResult.breakdown,
        confidence: scoringResult.confidence
      },
      message: 'Inquiry re-scored successfully'
    });
  } catch (error) {
    console.error('Error re-scoring inquiry:', error);
    res.status(500).json({ success: false, message: 'Failed to re-score inquiry' });
  }
};

/**
 * Delete inquiry
 */
exports.deleteInquiry = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const inquiry = await Inquiry.findOneAndDelete({ _id: req.params.id, organization: tenantId });

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    res.status(200).json({ success: true, message: 'Inquiry deleted successfully' });
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    res.status(500).json({ success: false, message: 'Failed to delete inquiry' });
  }
};

/**
 * Onboard client - Convert inquiry to customer
 */
exports.onboardClient = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const Customer = require('../models/vlite/Customer');

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    // Get the inquiry
    const inquiry = await Inquiry.findOne({ _id: req.params.id, organization: tenantId });

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    // Extract customer data from inquiry
    // Priority: companyName > meta.customerName > meta.companyName
    let firstName = '';
    let lastName = '';
    let companyName = inquiry.companyName || inquiry.meta?.companyName || '';

    // If customerName exists in meta, use it for firstName/lastName
    const customerName = inquiry.meta?.customerName || '';
    if (customerName.trim()) {
      const nameParts = customerName.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    } else if (companyName.trim()) {
      // If no customerName, use companyName as firstName (for business customers)
      firstName = companyName.trim();
      lastName = '';
    }

    console.log('🔍 ONBOARDING DEBUG:');
    console.log('   Inquiry ID:', inquiry._id);
    console.log('   Customer Name (from meta):', inquiry.meta?.customerName);
    console.log('   Company Name (top-level):', inquiry.companyName);
    console.log('   Company Name (from meta):', inquiry.meta?.companyName);
    console.log('   Final firstName:', firstName);
    console.log('   Final lastName:', lastName);
    console.log('   Final companyName:', companyName);

    // Generate unique customer code
    const customerCode = await Customer.generateCustomerCode(tenantId);

    // Map inquiry data to customer format
    const customerData = {
      organizationId: tenantId,
      customerCode: customerCode,
      firstName: firstName || 'Unknown', // Fallback to avoid empty name
      lastName: lastName,
      companyName: companyName,
      phone: inquiry.meta?.contact || inquiry.meta?.phone || '',
      email: inquiry.meta?.email || '',
      address: {
        street: inquiry.meta?.address || '',
        area: '',
        city: '',
        state: '',
        zipCode: ''
      },
      source: inquiry.leadPlatform || 'Website',
      customerType: 'End Customer',
      status: 'Active',
      registrationDate: new Date(),
      fromInquiry: inquiry._id, // Store inquiry reference
    };

    console.log('📦 Customer Data to Save:');
    console.log('   First Name:', customerData.firstName);
    console.log('   Last Name:', customerData.lastName);
    console.log('   Company Name:', customerData.companyName);
    console.log('   Phone:', customerData.phone);
    console.log('   Email:', customerData.email);

    // Create the customer
    const customer = new Customer(customerData);
    await customer.save();

    // Mark inquiry as onboarded instead of deleting
    inquiry.isOnboarded = true;
    inquiry.onboardedAt = new Date();
    inquiry.onboardedCustomer = customer._id;
    inquiry.onboardedCustomerCode = customer.customerCode;
    inquiry.leadStatus = 'CONVERTED'; // Update lead status to converted
    await inquiry.save();

    res.status(201).json({
      success: true,
      message: 'Client onboarded successfully',
      data: {
        customerId: customer._id,
        customerCode: customer.customerCode
      }
    });
  } catch (error) {
    console.error('Error onboarding client:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Failed to onboard client', error: error.message });
  }
};

/**
 * Un-onboard client - Revert onboarded inquiry back to active inquiry
 */
exports.unOnboardClient = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    // Get the inquiry
    const inquiry = await Inquiry.findOne({ _id: req.params.id, organization: tenantId });

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    // Check if inquiry is actually onboarded
    if (!inquiry.isOnboarded) {
      return res.status(400).json({
        success: false,
        message: 'This inquiry is not onboarded'
      });
    }

    console.log(`🔄 UN-ONBOARDING INQUIRY:`);
    console.log(`   Inquiry ID: ${req.params.id}`);
    console.log(`   Customer: ${inquiry.meta?.customerName}`);
    console.log(`   Onboarded Customer Code: ${inquiry.onboardedCustomerCode}`);

    // Revert inquiry to active state
    inquiry.isOnboarded = false;
    inquiry.onboardedAt = null;
    inquiry.onboardedCustomer = null;
    inquiry.onboardedCustomerCode = null;
    inquiry.leadStatus = 'QUALIFIED'; // Update lead status back to qualified

    await inquiry.save();

    console.log(`✅ UN-ONBOARD SUCCESS - Inquiry reverted to active state`);

    res.status(200).json({
      success: true,
      message: 'Client un-onboarded successfully',
      data: {
        inquiryId: inquiry._id,
        customerName: inquiry.meta?.customerName
      }
    });
  } catch (error) {
    console.error('Error un-onboarding client:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: 'Failed to un-onboard client', error: error.message });
  }
};

/**
 * Assign inquiry to salesman - POC Assignment
 */
exports.assignInquiry = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];

    console.log('assignInquiry called for ID:', req.params.id);
    console.log('assignInquiry body:', req.body);
    console.log('assignInquiry tenant:', tenantId);

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const { assignedTo } = req.body;

    if (!assignedTo) {
      return res.status(400).json({ success: false, message: 'Salesman ID is required' });
    }

    // Get the inquiry
    const inquiry = await Inquiry.findOne({ _id: req.params.id, organization: tenantId });

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    // Check if already assigned
    if (inquiry.assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry is already assigned to a salesman'
      });
    }

    // Check if inquiry is already onboarded
    if (inquiry.isOnboarded) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign onboarded inquiry'
      });
    }

    // Verify salesman exists (optional - add User validation)
    // const User = require('../models/vlite/User');
    const salesman = await User.findOne({ _id: assignedTo, organizationId: tenantId });

    if (!salesman) {
      return res.status(404).json({ success: false, message: 'Salesman not found' });
    }

    // Assign the inquiry
    inquiry.assignedTo = assignedTo;
    inquiry.assignedAt = new Date();
    inquiry.assignedBy = req.user?.id; // POC who assigned
    inquiry.assignmentStatus = 'assigned'; // Mark as assigned
    inquiry.leadStatus = 'CONTACTED'; // Update lead status to contacted

    await inquiry.save();

    // Send email notification to salesman
    try {
      const assignerName = req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : 'Admin';
      await EmailService.sendInquiryAssignmentEmail(inquiry, salesman, assignerName);
      console.log(`✉️ Assignment email sent to ${salesman.email}`);

      // --- NEW HOD NOTIFICATION ---
      // Find all HODs in the organization
      const hodUsers = await User.find({
        organizationId: tenantId,
        userRole: 'Head of Sales (HOD)',
        isActive: true
      });

      if (hodUsers.length > 0) {
        console.log(`🔔 Found ${hodUsers.length} HOD(s) to notify.`);
        for (const hod of hodUsers) {
          try {
            await EmailService.sendInquiryAssignmentNotificationToHOD(inquiry, salesman, assignerName, hod);
            console.log(`✉️ Assignment notification sent to HOD: ${hod.email}`);
          } catch (hodEmailErr) {
            console.error(`Failed to notify HOD ${hod.email}:`, hodEmailErr.message);
          }
        }
      } else {
        console.log('ℹ️ No HOD found to notify.');
      }
      // -----------------------------
    } catch (emailErr) {
      console.error('Failed to send assignment email:', emailErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Inquiry assigned to salesman successfully',
      data: {
        inquiryId: inquiry._id,
        assignedTo: salesman.firstName + ' ' + salesman.lastName,
        assignedAt: inquiry.assignedAt
      }
    });
  } catch (error) {
    console.error('Error assigning inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign inquiry',
      error: error.message
    });
  }
};

/**
 * Get inquiries assigned to current logged-in salesman
 */
exports.getAssignedToMe = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const userId = req.user?.id;
    const userRole = req.user?.userRole;
    const userEmail = req.user?.email;

    console.log('🔍 GET ASSIGNED TO ME - START');
    console.log('   TenantId:', tenantId);
    console.log('   UserId:', userId);
    console.log('   UserRole:', userRole);
    console.log('   UserEmail:', userEmail);
    console.log('   User Object:', JSON.stringify(req.user, null, 2));

    if (!tenantId) {
      console.log('❌ Missing tenant ID');
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    if (!userId) {
      console.log('❌ User not authenticated - no userId');
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Check if user is Admin, HOS, or POC (they see ALL assigned inquiries)
    const isMainAccount = userEmail === 'admin@vlite.com' ||
      userEmail === 'jasleen@vlite.com' ||
      userEmail?.toLowerCase().includes('jasleen');
    const isAdminOrHOSOrPOC = isMainAccount ||
      userRole === 'Admin' ||
      userRole === 'Head of Sales (HOD)' ||
      userRole === 'POC';

    let inquiries;

    if (isAdminOrHOSOrPOC) {
      // Admin/HOS/POC: Show ALL assigned inquiries from all salesmen
      console.log(`👑 ${userRole} viewing ALL assigned inquiries`);
      inquiries = await Inquiry.find({
        organization: tenantId,
        assignedTo: { $exists: true, $ne: null },
        assignmentStatus: { $ne: 'unassigned' }
      })
        .populate('assignedTo', 'firstName lastName email employeeId')
        .populate('assignedBy', 'firstName lastName')
        .sort({ assignedAt: -1 });
    } else {
      // Regular Salesman: Show only their assigned inquiries
      console.log(`👤 Salesman viewing their own assigned inquiries`);
      inquiries = await Inquiry.find({
        organization: tenantId,
        assignedTo: userId,
        assignmentStatus: { $ne: 'unassigned' }
      })
        .populate('assignedBy', 'firstName lastName')
        .sort({ assignedAt: -1 });
    }

    console.log(`🔍 SALESMAN DASHBOARD DEBUG:`);
    console.log(`   TenantId: ${tenantId}`);
    console.log(`   UserId: ${userId}`);
    console.log(`   UserRole: ${userRole}`);
    console.log(`   IsAdminOrHOSOrPOC: ${isAdminOrHOSOrPOC}`);
    console.log(`   Found ${inquiries.length} inquiries`);

    // Transform to frontend-compatible format
    const data = inquiries.map(inquiry => {
      // Combine all item details
      const allItemDetails = inquiry.items?.map(item => item.meta?.details).filter(d => d).join('\n\n') || '';

      return {
        _id: inquiry._id,
        customerName: inquiry.meta?.customerName || 'Unknown',
        companyName: inquiry.companyName || '',
        customerId: inquiry.customerId || '',
        contact: inquiry.meta?.contact || '',
        email: inquiry.meta?.email || '',
        address: inquiry.meta?.address || '',
        enquiryDate: inquiry.meta?.enquiryDate || '',
        enquiryTime: inquiry.meta?.enquiryTime || '',
        productName: inquiry.items?.[0]?.description || 'N/A',
        productDetails: allItemDetails,
        items: inquiry.items || [],
        leadPlatform: inquiry.meta?.leadPlatform || inquiry.leadPlatform || 'Website',
        leadStatus: inquiry.leadStatus || 'CONTACTED',
        probability: inquiry.probability || 20,
        message: inquiry.notes || '',
        assignedAt: inquiry.assignedAt,
        updatedAt: inquiry.updatedAt,
        assignedBy: inquiry.assignedBy,
        // For Admin/HOS/POC view: include salesman details
        assignedToSalesman: inquiry.assignedTo ? {
          id: inquiry.assignedTo._id || inquiry.assignedTo,
          name: inquiry.assignedTo.firstName && inquiry.assignedTo.lastName
            ? `${inquiry.assignedTo.firstName} ${inquiry.assignedTo.lastName}`
            : null,
          email: inquiry.assignedTo.email || null,
          employeeId: inquiry.assignedTo.employeeId || null
        } : null,
        isOnboarded: inquiry.isOnboarded || false,
        onboardedAt: inquiry.onboardedAt,
        onboardedCustomerCode: inquiry.onboardedCustomerCode,
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Error getting assigned inquiries:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch assigned inquiries' });
  }
};

/**
 * Unassign inquiry - Remove salesman assignment
 * Can be called by salesman to remove themselves from assignment
 */
exports.unassignInquiry = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const userId = req.user?.id;

    console.log('unassignInquiry called for ID:', req.params.id);
    console.log('unassignInquiry user:', userId);

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Get the inquiry
    const inquiry = await Inquiry.findOne({ _id: req.params.id, organization: tenantId });

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    // Check if inquiry is assigned
    if (!inquiry.assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry is not assigned to anyone'
      });
    }

    // Check if current user is the assigned salesman
    if (inquiry.assignedTo.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only unassign inquiries assigned to you'
      });
    }

    // Check if inquiry is already onboarded
    if (inquiry.isOnboarded) {
      return res.status(400).json({
        success: false,
        message: 'Cannot unassign onboarded inquiry'
      });
    }

    // Unassign the inquiry but keep history
    console.log(`🔄 UNASSIGNING INQUIRY:`);
    console.log(`   Inquiry ID: ${req.params.id}`);
    console.log(`   Customer: ${inquiry.meta?.customerName}`);
    console.log(`   Previously assigned to: ${inquiry.assignedTo}`);

    inquiry.unassignedBy = userId;
    inquiry.unassignedAt = new Date();
    inquiry.assignmentStatus = 'unassigned'; // 'assigned' or 'unassigned'
    // Keep assignedTo, assignedAt, assignedBy for history tracking

    await inquiry.save();

    // Verify data was saved by re-fetching from DB
    const verifyInquiry = await Inquiry.findById(inquiry._id);

    console.log(`✅ UNASSIGN SUCCESS:`);
    console.log(`   assignmentStatus: ${inquiry.assignmentStatus}`);
    console.log(`   unassignedBy: ${inquiry.unassignedBy}`);
    console.log(`   unassignedAt: ${inquiry.unassignedAt}`);
    console.log(`   DB VERIFICATION - assignmentStatus in DB: ${verifyInquiry.assignmentStatus}`);

    console.log(`✅ Inquiry ${inquiry._id} marked as unassigned by salesman ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Inquiry unassigned successfully',
      data: {
        inquiryId: inquiry._id,
        customerName: inquiry.meta?.customerName
      }
    });
  } catch (error) {
    console.error('Error unassigning inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unassign inquiry',
      error: error.message
    });
  }
};

/**
 * Retrieve inquiry - move unassigned inquiry back to unassigned pool
 * (POC can use this to make removed inquiries available for reassignment)
 */
exports.retrieveInquiry = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const userId = req.user?.id;

    console.log('retrieveInquiry called for ID:', req.params.id);
    console.log('retrieveInquiry user (POC):', userId);

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Get the inquiry
    const inquiry = await Inquiry.findOne({ _id: req.params.id, organization: tenantId });

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    // Check if inquiry is actually unassigned
    if (inquiry.assignmentStatus !== 'unassigned') {
      return res.status(400).json({
        success: false,
        message: 'Can only retrieve unassigned inquiries'
      });
    }

    console.log(`🔄 RETRIEVING INQUIRY:`);
    console.log(`   Inquiry ID: ${req.params.id}`);
    console.log(`   Customer: ${inquiry.meta?.customerName}`);
    console.log(`   Was assigned to: ${inquiry.assignedTo}`);

    // Clear all assignment tracking to make it fresh
    inquiry.assignedTo = null;
    inquiry.assignedAt = null;
    inquiry.assignedBy = null;
    inquiry.assignmentStatus = null;
    inquiry.unassignedBy = null;
    inquiry.unassignedAt = null;

    await inquiry.save();

    console.log(`✅ RETRIEVE SUCCESS - Inquiry moved back to unassigned pool`);

    res.status(200).json({
      success: true,
      message: 'Inquiry retrieved successfully',
      data: {
        inquiryId: inquiry._id,
        customerName: inquiry.meta?.customerName
      }
    });
  } catch (error) {
    console.error('Error retrieving inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve inquiry',
      error: error.message
    });
  }
};

/**
 * Send bulk follow-up reminders to salesmen for pending inquiries
 * HOS/Admin only
 */
exports.sendFollowUpReminders = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const { daysThreshold = 3, timeUnit = 'days' } = req.body; // Default 3 days

    console.log(`🔔 Sending follow-up reminders. Payload:`, req.body);
    console.log(`🔔 Threshold: ${daysThreshold} ${timeUnit}`);

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    if (timeUnit === 'minutes') {
      cutoffDate.setMinutes(cutoffDate.getMinutes() - daysThreshold);
    } else {
      cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
    }

    console.log(`📅 Cutoff Date: ${cutoffDate.toISOString()}`);

    // Find pending inquiries
    // Criteria:
    // 1. Assigned to a salesman
    // 2. Status is OPEN, CONTACTED, or FOLLOW_UP (Not converted/closed)
    // 3. Not updated since cutoff date
    const pendingInquiries = await Inquiry.find({
      organization: tenantId,
      assignedTo: { $exists: true, $ne: null },
      leadStatus: { $in: ['NEW', 'OPEN', 'CONTACTED', 'FOLLOW_UP', 'NEGOTIATION', 'PENDING'] },
      updatedAt: { $lt: cutoffDate }
    }).populate('assignedTo', 'email firstName lastName');

    console.log(`🔍 Found ${pendingInquiries.length} pending inquiries`);

    if (pendingInquiries.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No pending inquiries found matching criteria',
        data: { sentCount: 0 }
      });
    }

    // Group by Salesman
    const groupedBySalesman = {};
    pendingInquiries.forEach(inquiry => {
      if (!inquiry.assignedTo) return; // Skip if user not found (orphaned)

      const salesmanId = inquiry.assignedTo._id.toString();
      if (!groupedBySalesman[salesmanId]) {
        groupedBySalesman[salesmanId] = {
          salesman: inquiry.assignedTo,
          inquiries: []
        };
      }
      groupedBySalesman[salesmanId].inquiries.push(inquiry);
    });

    // Send Emails
    let emailsSent = 0;
    let emailsFailed = 0;

    console.log(`📨 Attempting to send emails to ${Object.keys(groupedBySalesman).length} salesmen...`);

    for (const salesmanId in groupedBySalesman) {
      const { salesman, inquiries } = groupedBySalesman[salesmanId];

      console.log(`\n👤 Processing salesman:`, {
        id: salesmanId,
        name: salesman?.firstName || 'Unknown',
        email: salesman?.email || 'No email',
        inquiriesCount: inquiries.length
      });

      if (salesman && salesman.email) {
        try {
          console.log(`  ➤ Sending email to ${salesman.email}...`);
          await EmailService.sendFollowUpReminderEmail(salesman, inquiries);
          console.log(`  ✅ Email sent successfully to ${salesman.email}`);
          emailsSent++;
        } catch (emailErr) {
          emailsFailed++;
          console.error(`  ❌ Failed to send email to ${salesman.email}`);
          console.error(`  Error:`, emailErr.message);
          console.error(`  Stack:`, emailErr.stack);
        }
      } else {
        console.warn(`  ⚠️ Skipping - No email for salesman ${salesmanId}`);
      }
    }

    console.log(`\n📊 Email Summary: ${emailsSent} sent, ${emailsFailed} failed`);


    res.status(200).json({
      success: true,
      message: `Reminders sent to ${emailsSent} salesmen`,
      data: {
        totalPending: pendingInquiries.length,
        salesmenCount: Object.keys(groupedBySalesman).length,
        emailsSent
      }
    });

  } catch (error) {
    console.error('Error sending follow-up reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reminders',
      error: error.message
    });
  }
};

/**
 * Get current reminder settings for the organization
 */
exports.getReminderSettings = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    let settings = await ReminderSetting.findOne({ organization: tenantId });

    // If no settings exist, return default
    if (!settings) {
      return res.status(200).json({
        success: true,
        data: {
          enabled: false,
          threshold: 3,
          timeUnit: 'days',
          lastRun: null,
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        enabled: settings.enabled,
        threshold: settings.threshold,
        timeUnit: settings.timeUnit,
        lastRun: settings.lastRun,
        updatedAt: settings.updatedAt,
      }
    });
  } catch (error) {
    console.error('Error fetching reminder settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reminder settings',
      error: error.message
    });
  }
};

/**
 * Update/Create reminder settings for the organization
 */
exports.updateReminderSettings = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const userId = req.user?.id;
    const { enabled, threshold, timeUnit } = req.body;

    console.log('⚙️ Updating reminder settings:', { enabled, threshold, timeUnit });

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    // Validation
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Invalid "enabled" value' });
    }

    if (!threshold || threshold < 1) {
      return res.status(400).json({ success: false, message: 'Threshold must be at least 1' });
    }

    if (!['minutes', 'days'].includes(timeUnit)) {
      return res.status(400).json({ success: false, message: 'Invalid time unit' });
    }

    // Update or create
    let settings = await ReminderSetting.findOne({ organization: tenantId });

    if (settings) {
      // Update existing
      settings.enabled = enabled;
      settings.threshold = threshold;
      settings.timeUnit = timeUnit;
      settings.updatedBy = userId;
      await settings.save();
      console.log('✅ Reminder settings updated');
    } else {
      // Create new
      settings = await ReminderSetting.create({
        organization: tenantId,
        enabled,
        threshold,
        timeUnit,
        createdBy: userId,
        updatedBy: userId,
      });
      console.log('✅ Reminder settings created');
    }

    res.status(200).json({
      success: true,
      message: enabled ? 'Automatic reminders enabled' : 'Automatic reminders disabled',
      data: {
        enabled: settings.enabled,
        threshold: settings.threshold,
        timeUnit: settings.timeUnit,
        lastRun: settings.lastRun,
      }
    });
  } catch (error) {
    console.error('Error updating reminder settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update reminder settings',
      error: error.message
    });
  }
};

/**
 * Disable automatic reminders
 */
exports.disableReminderSettings = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    const settings = await ReminderSetting.findOne({ organization: tenantId });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'No reminder settings found'
      });
    }

    settings.enabled = false;
    settings.updatedBy = req.user?.id;
    await settings.save();

    console.log('🔕 Automatic reminders disabled');

    res.status(200).json({
      success: true,
      message: 'Automatic reminders disabled successfully'
    });
  } catch (error) {
    console.error('Error disabling reminder settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable reminder settings',
      error: error.message
    });
  }
};

/**
 * Upload layout plan PDF to Google Drive
 */
exports.uploadLayoutPlan = async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'];
    const googleDriveService = require('../services/googleDriveService');

    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'Missing tenant ID' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Get the inquiry
    const inquiry = await Inquiry.findOne({ _id: req.params.id, organization: tenantId });

    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    console.log(`📤 Uploading layout plan for inquiry ${inquiry._id}`);

    // Upload to Google Drive
    const fileName = `layout_plan_${inquiry._id}_${Date.now()}.pdf`;
    const driveUrl = await googleDriveService.uploadFile(
      req.file.buffer,
      fileName,
      'application/pdf'
    );

    console.log(`✅ Layout plan uploaded to Drive: ${driveUrl}`);

    // Ensure meta object exists
    if (!inquiry.meta) {
      inquiry.meta = {};
    }

    // Update inquiry with Drive URL
    inquiry.meta.layoutPlanUrl = driveUrl;
    inquiry.meta.layoutPlanFileName = req.file.originalname;
    inquiry.markModified('meta');
    await inquiry.save();

    res.status(200).json({
      success: true,
      data: {
        layoutPlanUrl: driveUrl,
        layoutPlanFileName: req.file.originalname
      },
      message: 'Layout plan uploaded successfully'
    });
  } catch (error) {
    console.error('❌ Error uploading layout plan:', error);
    console.error('   Error name:', error.name);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);

    // Check if it's a Google Drive error
    if (error.message && error.message.includes('GOOGLE_DRIVE')) {
      return res.status(500).json({
        success: false,
        message: 'Google Drive configuration error. Please check environment variables.',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload layout plan',
      error: error.message
    });
  }
};

