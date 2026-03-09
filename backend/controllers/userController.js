const User = require('../models/vlite/User');
const Role = require('../models/vlite/Role');
const logger = require('../utils/logger');

/**
 * @desc    Get all users in organization
 * @route   GET /api/users
 * @access  Private/OrgAdmin
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { department, status, search } = req.query;

    const query = { organizationId: req.organization._id };

    if (department) {
      query.department = department;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .populate('role')
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });

  } catch (error) {
    logger.error(`Get users error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message,
    });
  }
};

/**
 * @desc    Get single user
 * @route   GET /api/users/:id
 * @access  Private
 */
exports.getUser = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      organizationId: req.organization._id,
    })
      .populate('role')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });

  } catch (error) {
    logger.error(`Get user error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message,
    });
  }
};

/**
 * @desc    Create new user
 * @route   POST /api/users
 * @access  Private/OrgAdmin
 */
exports.createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      employeeId,
      designation,
      department,
      workflowRole,
      role,
    } = req.body;

    // Check if email already exists in organization
    const existingUser = await User.findOne({
      email,
      organizationId: req.organization._id,
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists in your organization',
      });
    }

    // Verify role exists and belongs to organization
    const roleDoc = await Role.findOne({
      _id: role,
      organizationId: req.organization._id,
    });

    if (!roleDoc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified',
      });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      employeeId,
      designation,
      department,
      workflowRole,
      role,
      organizationId: req.organization._id,
      isActive: true,
      status: 'ACTIVE',
    });

    // Return user without password
    const userResponse = await User.findById(user._id)
      .populate('role')
      .select('-password');

    logger.info(`User created: ${user.email} in organization ${req.organization.name}`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse,
    });

  } catch (error) {
    logger.error(`Create user error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message,
    });
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private/OrgAdmin
 */
exports.updateUser = async (req, res) => {
  try {
    let user = await User.findOne({
      _id: req.params.id,
      organizationId: req.organization._id,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Fields that can be updated
    const updateFields = [
      'firstName', 'lastName', 'email', 'phone', 'employeeId', 'designation',
      'department', 'workflowRole', 'role', 'isActive', 'status',
      'notificationPreferences', 'dashboardConfig'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    // Validations
    if (req.body.email && req.body.email !== user.email) {
      const existingUser = await User.findOne({
        email: req.body.email,
        organizationId: req.organization._id,
        _id: { $ne: user._id }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists in your organization'
        });
      }
    }

    await user.save();

    const updatedUser = await User.findById(user._id)
      .populate('role')
      .select('-password');

    logger.info(`User updated: ${user.email} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });

  } catch (error) {
    logger.error(`Update user error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete user (soft delete)
 * @route   DELETE /api/users/:id
 * @access  Private/OrgAdmin
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      organizationId: req.organization._id,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Soft delete
    user.isActive = false;
    user.status = 'TERMINATED';
    await user.save();

    logger.warn(`User deactivated: ${user.email} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
    });

  } catch (error) {
    logger.error(`Delete user error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message,
    });
  }
};

/**
 * @desc    Get users by department
 * @route   GET /api/users/department/:department
 * @access  Private
 */
exports.getUsersByDepartment = async (req, res) => {
  try {
    const users = await User.find({
      organizationId: req.organization._id,
      department: req.params.department,
      isActive: true,
    })
      .populate('role')
      .select('firstName lastName email phone designation workflowRole');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });

  } catch (error) {
    logger.error(`Get users by department error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message,
    });
  }
};

/**
 * @desc    Get users by workflow role
 * @route   GET /api/users/workflow/:role
 * @access  Private
 */
exports.getUsersByWorkflowRole = async (req, res) => {
  try {
    const users = await User.find({
      organizationId: req.organization._id,
      workflowRole: req.params.role,
      isActive: true,
    })
      .populate('role')
      .select('firstName lastName email phone designation department');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });

  } catch (error) {
    logger.error(`Get users by workflow role error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message,
    });
  }
};

/**
 * @desc    Get dashboard data based on user role
 * @route   GET /api/users/dashboard
 * @access  Private
 */
exports.getDashboardData = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('role');

    let dashboardData = {
      userInfo: {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        department: user.department,
        workflowRole: user.workflowRole,
        designation: user.designation,
      },
      permissions: user.role.permissions,
    };

    // Role-specific dashboard data
    switch (user.workflowRole) {
      case 'POC':
        // Enquiry tracking dashboard
        dashboardData.widgets = ['enquiries', 'followUps', 'sources'];
        dashboardData.stats = {
          pendingEnquiries: 0, // TODO: Get from Inquiry model
          todayFollowUps: 0,
        };
        break;

      case 'SALES_EXECUTIVE':
        // Customer interaction dashboard
        dashboardData.widgets = ['customers', 'quotations', 'followUps'];
        dashboardData.stats = {
          activeCustomers: 0,
          pendingQuotations: 0,
        };
        break;

      case 'DESIGN_LEAD':
      case 'DESIGNER':
        // Design work dashboard
        dashboardData.widgets = ['quotations', 'designs', 'workload'];
        dashboardData.stats = {
          pendingQuotations: 0,
          pendingDesigns: 0,
        };
        break;

      case 'MARKETING_DIRECTOR':
        // Management overview dashboard
        dashboardData.widgets = ['overview', 'revenue', 'team', 'projects'];
        dashboardData.stats = {
          totalProjects: 0,
          monthlyRevenue: 0,
        };
        break;

      case 'ACCOUNTS_MANAGER':
        // Financial dashboard
        dashboardData.widgets = ['payments', 'invoices', 'ledger'];
        dashboardData.stats = {
          pendingPayments: 0,
          monthlyRevenue: 0,
        };
        break;

      default:
        dashboardData.widgets = ['overview'];
    }

    res.status(200).json({
      success: true,
      data: dashboardData,
    });

  } catch (error) {
    logger.error(`Get dashboard data error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message,
    });
  }
};

/**
 * @desc    Get production workers by userRole (for process assignment)
 * @route   GET /api/users/production-workers
 * @access  Private/Production Manager
 */
exports.getProductionWorkers = async (req, res) => {
  try {
    const { process } = req.query;

    // Define mapping of process to userRole
    const processRoleMap = {
      // Wood processes
      'beamSaw': ['Wood (Beam Saw)', 'Wood (Panel Cutting)'],
      'edgeBending': ['Wood (Edge Bending)', 'Wood (Edgeband)'],
      'profiling': ['Wood (Profiling)'],
      'grooming': ['Wood (Grooming)'],
      'boringMachine': ['Wood (Boring Machine)', 'Wood (Boring)', 'Wood (Drilling)'],
      'finish': ['Wood (Finishing)', 'Wood (Finish)', 'Wood (Polishing)'],

      // Steel processes
      'steelCutting': ['Steel (Steel Cutting)', 'Steel Cutting', 'Cutting'],
      'cncCutting': ['Steel (CNC Cutting)', 'CNC Cutting', 'CNC'],
      'bending': ['Steel (Bending)', 'Bending'],
      'welding': ['Steel (Welding)', 'Welding', 'Welder'],
      'finishing': ['Steel (Finishing)', 'Finishing', 'Finisher'],

      // Packaging - separated by product type
      'woodPackaging': ['Wood (Packaging)'],
      'steelPackaging': ['Steel (Packing)', 'Steel (Packaging)'],
    };

    let query = {
      organizationId: req.organization._id,
      isActive: true,
      status: 'ACTIVE',
    };

    // If specific process is requested, filter by role
    if (process && processRoleMap[process]) {
      query.userRole = { $in: processRoleMap[process] };
    } else if (process === 'packaging') {
      // Generic packaging - check productType from request
      const { productType } = req.query;
      if (productType === 'Wood' || productType === 'WOOD') {
        query.userRole = { $in: processRoleMap['woodPackaging'] };
      } else if (productType === 'Steel' || productType === 'STEEL') {
        query.userRole = { $in: processRoleMap['steelPackaging'] };
      } else {
        // Fallback - show both
        query.userRole = { $in: [...processRoleMap['woodPackaging'], ...processRoleMap['steelPackaging']] };
      }
    } else {
      // Return all production users if no specific process
      query.userRole = {
        $in: [
          'Production',
          'Wood (Beam Saw)',
          'Wood (Edge Bending)',
          'Wood (Profiling)',
          'Wood (Grooming)',
          'Wood (Boring Machine)',
          'Wood (Finishing)',
          'Wood (Packaging)',
          'Steel (Steel Cutting)',
          'Steel (CNC Cutting)',
          'Steel (Bending)',
          'Steel (Welding)',
          'Steel (Finishing)',
          'Steel (Packing)',
        ]
      };
    }

    const workers = await User.find(query)
      .select('firstName lastName email userRole employeeId')
      .sort({ firstName: 1 });

    logger.info(`Fetched ${workers.length} production workers for process: ${process || 'all'}`);

    res.status(200).json({
      success: true,
      count: workers.length,
      data: workers,
    });

  } catch (error) {
    logger.error(`Get production workers error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching production workers',
      error: error.message,
    });
  }
};

/**
 * @desc    Get sidebar preferences for current user
 * @route   GET /api/users/preferences/sidebar
 * @access  Private
 */
exports.getSidebarPreferences = async (req, res) => {
  try {
    console.log('📖 getSidebarPreferences called');
    console.log('👤 req.user:', req.user);

    // Handle anonymous users
    if (!req.user || req.user.id === 'anonymous') {
      console.log('⚠️ Anonymous user - returning empty order');
      return res.status(200).json({
        success: true,
        data: { sidebarOrder: [] }
      });
    }

    const user = await User.findById(req.user.id).select('sidebarOrder');

    if (!user) {
      console.log('❌ User not found for GET');
      return res.status(200).json({
        success: true,
        data: { sidebarOrder: [] }
      });
    }

    console.log('✅ User found, sidebarOrder:', user.sidebarOrder);

    res.status(200).json({
      success: true,
      data: {
        sidebarOrder: user.sidebarOrder || [],
      },
    });

  } catch (error) {
    console.error('❌ Get sidebar preferences error:', error);
    logger.error(`Get sidebar preferences error: ${error.message}`);
    res.status(200).json({
      success: true,
      data: { sidebarOrder: [] }
    });
  }
};

/**
 * @desc    Update sidebar preferences for current user
 * @route   PUT /api/users/preferences/sidebar
 * @access  Private
 */
exports.updateSidebarPreferences = async (req, res) => {
  try {
    console.log('🔧 updateSidebarPreferences called');
    console.log('📦 req.body:', req.body);
    console.log('👤 req.user:', req.user);

    const { sidebarOrder } = req.body;

    if (!Array.isArray(sidebarOrder)) {
      console.log('❌ sidebarOrder is not an array');
      return res.status(400).json({
        success: false,
        message: 'sidebarOrder must be an array',
      });
    }

    // Handle anonymous users - accept but don't save
    if (!req.user || req.user.id === 'anonymous') {
      console.log('⚠️ Anonymous user - order not saved to DB');
      return res.status(200).json({
        success: true,
        message: 'Sidebar preferences updated (local only)',
        data: { sidebarOrder }
      });
    }

    console.log('🔍 Looking for user ID:', req.user?.id);
    const user = await User.findById(req.user.id);

    if (!user) {
      console.log('❌ User not found');
      return res.status(200).json({
        success: true,
        message: 'Sidebar preferences updated (local only)',
        data: { sidebarOrder }
      });
    }

    console.log('✅ User found:', user.email);
    console.log('📝 Setting sidebarOrder:', sidebarOrder);

    user.sidebarOrder = sidebarOrder;
    await user.save();

    console.log('✅ Sidebar preferences saved successfully');
    logger.info(`Sidebar preferences updated for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Sidebar preferences updated successfully',
      data: {
        sidebarOrder: user.sidebarOrder,
      },
    });

  } catch (error) {
    console.error('❌ Update sidebar preferences error:', error);
    console.error('Stack:', error.stack);
    logger.error(`Update sidebar preferences error: ${error.message}`);
    res.status(200).json({
      success: true,
      message: 'Sidebar preferences updated (local only)',
      data: { sidebarOrder: req.body.sidebarOrder || [] }
    });
  }
};

