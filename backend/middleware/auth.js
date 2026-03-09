const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const SuperAdmin = require('../models/shared/SuperAdmin');
const Organization = require('../models/shared/Organization');
const User = require('../models/vlite/User');
const { getTenantConnection, initializeTenantModels } = require('../utils/tenantDatabase');
const vliteConfig = require('../config/vlite.config');

/**
 * Authentication Middleware
 * Verifies JWT token and sets req.user
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      console.log('❌ [Auth] No token provided');
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔐 [Auth] Verified. Type:', decoded.type, 'ID:', decoded.id);

      // Set user based on type
      if (decoded.type === 'SUPER_ADMIN') {
        req.user = await SuperAdmin.findById(decoded.id).select('-password');

        // If not found in SuperAdmin model, check if it's an Org Admin from the main organization
        if (!req.user) {
          const organization = await Organization.findById(decoded.id);
          if (organization && organization._id.toString() === vliteConfig.organizationId) {
            req.organization = organization;
            req.user = {
              _id: organization._id,
              id: organization._id,
              email: organization.adminUser.email,
              firstName: organization.adminUser.firstName,
              lastName: organization.adminUser.lastName,
              userRole: 'Admin',
              organizationId: organization._id,
              type: 'SUPER_ADMIN'
            };
          }
        }
        req.userType = 'SUPER_ADMIN';
      } else if (decoded.type === 'ORG_ADMIN') {
        req.organization = await Organization.findById(decoded.organizationId);
        if (!req.organization) console.log('❌ [Auth] ORG_ADMIN Org not found:', decoded.organizationId);

        req.user = {
          _id: req.organization?._id,
          id: req.organization?._id,
          organizationId: req.organization?._id,
          email: req.organization?.adminUser.email,
          firstName: req.organization?.adminUser.firstName,
          lastName: req.organization?.adminUser.lastName,
        };
        req.userType = 'ORG_ADMIN';
      } else if (decoded.type === 'USER') {
        req.user = await User.findById(decoded.id)
          .populate('role');
        req.organization = await Organization.findById(decoded.organizationId);
        req.userType = 'USER';
      } else if (decoded.type === 'HARDCODED_ADMIN') {
        // Relaxed Check with isActive fix
        const orgId = vliteConfig.organizationId;
        req.organization = {
          _id: orgId,
          isActive: true, // CRITICAL: tenantContext checks this
          name: 'Vlite System (Mock)',
          database: { name: 'vlite_erp_multitenant' } // Needed for tenantDatabase middleware
        };

        req.user = {
          _id: 'hardcoded-admin-system',
          id: 'hardcoded-admin-system',
          email: 'admin@vlite.com',
          firstName: 'System',
          lastName: 'Admin',
          userRole: 'Admin',
          organizationId: orgId,
          role: null,
          hasPermission: () => true
        };
        req.userType = 'SUPER_ADMIN';
      }

      if (!req.user) {
        console.log('❌ [Auth] User processing failed');
        throw new Error('User not found');
      }

      next();
    } catch (error) {
      console.log('❌ [Auth] Verify Error:', error.message);
      return res.status(401).json({ success: false, message: 'Token is not valid' });
    }
  } catch (error) {
    console.log('❌ [Auth] Server Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Super Admin Authorization
 * Ensures only super admins can access
 */
const authorizeSuperAdmin = (req, res, next) => {
  if (req.userType !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super admin privileges required.',
    });
  }
  next();
};

/**
 * Organization Admin Authorization
 * Ensures only organization admins can access
 */
const authorizeOrgAdmin = (req, res, next) => {
  if (req.userType !== 'ORG_ADMIN' && req.userType !== 'SUPER_ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Organization admin privileges required.',
    });
  }
  next();
};

/**
 * Tenant Context Middleware (Single Tenant - Vlite)
 * Ensures Vlite organization context is set for all operations
 */
const tenantContext = async (req, res, next) => {
  try {
    // Skip for super admin routes
    if (req.userType === 'SUPER_ADMIN') {
      return next();
    }

    // SINGLE TENANT: Always use Vlite organization
    if (!req.organization) {
      req.organization = await Organization.findById(vliteConfig.organizationId);
    }

    if (!req.organization) {
      logger.error('[Single Tenant] Vlite organization not found');
      return res.status(500).json({
        success: false,
        message: 'System organization not configured',
      });
    }

    if (!req.organization.isActive) {
      return res.status(403).json({
        success: false,
        message: 'System is currently inactive',
      });
    }

    // Set organization context for queries
    req.organizationId = req.organization._id;

    logger.debug(`[Single Tenant] Using Vlite organization: ${req.organization.name}`);

    next();
  } catch (error) {
    logger.error(`Tenant context error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error setting tenant context',
    });
  }
};

/**
 * Permission-based Authorization
 * Checks if user has specific permission
 */
const authorize = (module, subModule, action) => {
  return async (req, res, next) => {
    try {
      // Super admin has all permissions
      if (req.userType === 'SUPER_ADMIN') {
        return next();
      }

      // Organization admin has all permissions within their org
      if (req.userType === 'ORG_ADMIN') {
        return next();
      }

      // Check user permissions
      if (!req.user || !req.user.role) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. No role assigned.',
        });
      }

      // Check if user has permission
      const hasPermission = req.user.hasPermission(module, subModule, action);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. ${action} permission required for ${module}/${subModule}`,
        });
      }

      next();
    } catch (error) {
      logger.error(`Authorization error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions',
      });
    }
  };
};

/**
 * Feature Access Middleware
 * Checks if organization has access to a specific feature
 */
const checkFeatureAccess = (featureCode) => {
  return async (req, res, next) => {
    try {
      // Super admin bypasses feature check
      if (req.userType === 'SUPER_ADMIN') {
        return next();
      }

      if (!req.organization) {
        return res.status(400).json({
          success: false,
          message: 'Organization context required',
        });
      }

      // Populate features if not already populated
      if (!req.organization.enabledFeatures[0]?.featureId?.code) {
        await req.organization.populate('enabledFeatures.featureId');
      }

      const hasFeature = req.organization.hasFeature(featureCode);

      if (!hasFeature) {
        return res.status(403).json({
          success: false,
          message: `Feature '${featureCode}' is not enabled for your organization`,
        });
      }

      next();
    } catch (error) {
      logger.error(`Feature access error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error checking feature access',
      });
    }
  };
};

/**
 * Tenant Database Middleware
 * Connects to the tenant's isolated database and provides models
 */
const tenantDatabase = async (req, res, next) => {
  try {
    // Skip for super admin routes that don't need tenant database
    if (req.userType === 'SUPER_ADMIN' && !req.organization) {
      return next();
    }

    if (!req.organization || !req.organization.database || !req.organization.database.name) {
      return res.status(400).json({
        success: false,
        message: 'Organization database not configured',
      });
    }

    const dbName = req.organization.database.name;

    // Get or create tenant connection and models
    const { connection, models } = await initializeTenantModels(dbName, req.organization._id);

    // Attach to request for use in controllers
    req.tenantDb = connection;
    req.tenantModels = models;
    req.dbName = dbName;

    logger.debug(`Tenant database context set: ${dbName}`);

    next();
  } catch (error) {
    logger.error(`Tenant database middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error connecting to organization database',
      error: error.message,
    });
  }
};

module.exports = {
  authenticate,
  authorizeSuperAdmin,
  authorizeOrgAdmin,
  tenantContext,
  authorize,
  checkFeatureAccess,
  tenantDatabase,
};
