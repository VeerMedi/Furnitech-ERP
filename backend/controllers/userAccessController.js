const User = require('../models/vlite/User');
const Role = require('../models/vlite/Role');
const logger = require('../utils/logger');

exports.getAllUsers = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { role } = req.query; // Role filtering

    const query = {
      organizationId,
      isDeleted: false
    };

    // Filter by role if provided
    if (role) {
      if (role === 'Steel') {
        // Show all Steel production roles
        query.userRole = { $regex: '^Steel \\(', $options: 'i' };
      } else if (role === 'Wood') {
        // Show all Wood production roles
        query.userRole = { $regex: '^Wood \\(', $options: 'i' };
      } else {
        // Exact role match for other filters
        query.userRole = role;
      }
    }

    const users = await User.find(query)
      .select('firstName lastName email roles role status isActive employeeId designation userRole dashboardPermissions dataSourceUserId loginHistory lastLogin isOnline plainPassword')
      .populate('role', 'name code')
      .populate('dataSourceUserId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message,
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;

    const user = await User.findOne({
      _id: id,
      organizationId,
      isDeleted: false
    })
      .select('firstName lastName email roles role status isActive employeeId designation customPermissions')
      .populate('role', 'name code permissions');

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
    logger.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message,
    });
  }
};

exports.updateUserPermissions = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const { roles, customPermissions, role, dashboardPermissions } = req.body;

    const user = await User.findOne({
      _id: id,
      organizationId,
      isDeleted: false
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (roles !== undefined) user.roles = roles;
    if (customPermissions !== undefined) user.customPermissions = customPermissions;
    if (role !== undefined) user.role = role;
    if (dashboardPermissions !== undefined) user.dashboardPermissions = dashboardPermissions;

    await user.save();

    const updatedUser = await User.findById(id)
      .select('firstName lastName email roles role status isActive dashboardPermissions')
      .populate('role', 'name code permissions');

    res.status(200).json({
      success: true,
      message: 'User permissions updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    logger.error('Error updating user permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user permissions',
      error: error.message,
    });
  }
};

exports.getAllRoles = async (req, res) => {
  try {
    const { organizationId } = req.user;

    const roles = await Role.find({
      organizationId,
      isActive: true
    })
      .select('name code description permissions level')
      .sort({ level: -1, name: 1 });

    res.status(200).json({
      success: true,
      count: roles.length,
      data: roles,
    });
  } catch (error) {
    logger.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching roles',
      error: error.message,
    });
  }
};

exports.createRole = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const roleData = {
      ...req.body,
      organizationId,
    };

    const role = await Role.create(roleData);

    res.status(201).json({
      success: true,
      data: role,
    });
  } catch (error) {
    logger.error('Error creating role:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating role',
      error: error.message,
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const {
      firstName,
      lastName,
      username,
      phone,
      email,
      password,
      roles,
      crmStages,
      isSystemAdmin,
      quotationHead,
      dashboardPermissions,
      dataSourceUserId,
      userRole,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email, organizationId, isDeleted: false });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Check if username/employeeId already exists
    if (username) {
      const existingUsername = await User.findOne({ employeeId: username, organizationId, isDeleted: false });
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists. Please choose a different username.',
        });
      }
    }

    // Get any role for the organizationId (we use roles array now, so this is just for legacy compatibility)
    const defaultRole = await Role.findOne({ organizationId });
    if (!defaultRole) {
      return res.status(400).json({
        success: false,
        message: 'No roles found in organization. Please create roles first.',
      });
    }

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      email,
      phone,
      password,
      plainPassword: password, // Store plain password for admin viewing
      roles: roles || [],
      role: defaultRole._id,
      organizationId,
      isSystemAdmin: isSystemAdmin || false,
      quotationHead: quotationHead || false,
      crmStages,
      employeeId: username || `EMP${Date.now()}`,
      dashboardPermissions: dashboardPermissions || [],
      dataSourceUserId: dataSourceUserId || null,
      userRole, // Must be provided explicitly, no default
    });

    await newUser.save();

    // Return user without password
    const userResponse = await User.findById(newUser._id)
      .select('firstName lastName email roles role status isActive employeeId designation dashboardPermissions dataSourceUserId')
      .populate('role', 'name code')
      .populate('dataSourceUserId', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse,
    });
  } catch (error) {
    console.error('❌ CRITICAL ERROR Creating User:', error);
    console.error('Stack:', error.stack);
    logger.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user: ' + error.message,
      error: error.message,
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;
    const updates = req.body;

    delete updates.password;
    delete updates.organizationId;

    // Remove empty string values to avoid validation errors
    Object.keys(updates).forEach(key => {
      if (updates[key] === '' || updates[key] === null) {
        delete updates[key];
      }
    });

    const user = await User.findOneAndUpdate(
      { _id: id, organizationId, isDeleted: false },
      updates,
      { new: true, runValidators: true }
    )
      .select('firstName lastName email roles role status isActive employeeId designation phone department crmStages isSystemAdmin quotationHead')
      .populate('role', 'name code');

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
    logger.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message,
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;

    const user = await User.findOne({
      _id: id,
      organizationId,
      isDeleted: false
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Soft delete - set isDeleted flag
    user.isDeleted = true;
    user.isActive = false;
    await user.save();

    logger.info(`User deleted: ${user.email} (${user._id})`);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message,
    });
  }
};
