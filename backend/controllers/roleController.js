const Role = require('../models/vlite/Role');
const logger = require('../utils/logger');

/**
 * @desc    Get all roles in organization
 * @route   GET /api/roles
 * @access  Private
 */
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find({
      organizationId: req.organization._id,
      isActive: true,
    }).sort({ level: -1, name: 1 });
    
    res.status(200).json({
      success: true,
      count: roles.length,
      data: roles,
    });
    
  } catch (error) {
    logger.error(`Get roles error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching roles',
      error: error.message,
    });
  }
};

/**
 * @desc    Get single role
 * @route   GET /api/roles/:id
 * @access  Private
 */
exports.getRole = async (req, res) => {
  try {
    const role = await Role.findOne({
      _id: req.params.id,
      organizationId: req.organization._id,
    });
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: role,
    });
    
  } catch (error) {
    logger.error(`Get role error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching role',
      error: error.message,
    });
  }
};

/**
 * @desc    Create new role
 * @route   POST /api/roles
 * @access  Private/OrgAdmin
 */
exports.createRole = async (req, res) => {
  try {
    const { name, code, description, permissions, level } = req.body;
    
    // Check if role code already exists
    const existingRole = await Role.findOne({
      code,
      organizationId: req.organization._id,
    });
    
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Role with this code already exists',
      });
    }
    
    const role = await Role.create({
      name,
      code,
      description,
      permissions,
      level,
      organizationId: req.organization._id,
      isActive: true,
      isSystemRole: false,
    });
    
    logger.info(`Role created: ${role.name} in organization ${req.organization.name}`);
    
    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: role,
    });
    
  } catch (error) {
    logger.error(`Create role error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error creating role',
      error: error.message,
    });
  }
};

/**
 * @desc    Update role
 * @route   PUT /api/roles/:id
 * @access  Private/OrgAdmin
 */
exports.updateRole = async (req, res) => {
  try {
    let role = await Role.findOne({
      _id: req.params.id,
      organizationId: req.organization._id,
    });
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }
    
    if (role.isSystemRole) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify system role',
      });
    }
    
    const updateFields = ['name', 'description', 'permissions', 'level', 'dashboardAccess'];
    
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        role[field] = req.body[field];
      }
    });
    
    await role.save();
    
    logger.info(`Role updated: ${role.name}`);
    
    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: role,
    });
    
  } catch (error) {
    logger.error(`Update role error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error updating role',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete role
 * @route   DELETE /api/roles/:id
 * @access  Private/OrgAdmin
 */
exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findOne({
      _id: req.params.id,
      organizationId: req.organization._id,
    });
    
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }
    
    if (role.isSystemRole) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete system role',
      });
    }
    
    role.isActive = false;
    await role.save();
    
    logger.warn(`Role deactivated: ${role.name}`);
    
    res.status(200).json({
      success: true,
      message: 'Role deactivated successfully',
    });
    
  } catch (error) {
    logger.error(`Delete role error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error deleting role',
      error: error.message,
    });
  }
};
