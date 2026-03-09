const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const SuperAdmin = require('../models/shared/SuperAdmin');
const Organization = require('../models/shared/Organization');
const User = require('../models/vlite/User');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const vliteConfig = require('../config/vlite.config');

/**
 * Generate JWT Token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * @desc    Get all active organizations (DISABLED - Single Tenant)
 * @route   GET /api/auth/organizations
 * @access  Public
 * @deprecated This endpoint is disabled in single-tenant mode
 */
exports.getOrganizations = async (req, res) => {
  try {
    // Single-tenant mode: always return only Vlite organization
    const vliteOrg = await Organization.findById(vliteConfig.organizationId)
      .select('name slug email subscriptionPlan');

    if (!vliteOrg) {
      return res.status(404).json({
        success: false,
        message: 'Vlite organization not found',
      });
    }

    logger.info('[Single Tenant] Returning Vlite organization only');

    res.status(200).json({
      success: true,
      data: [vliteOrg], // Always return array with single Vlite org
      singleTenant: true,
    });
  } catch (error) {
    logger.error(`Get organizations error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching organization',
      error: error.message,
    });
  }
};

/**
 * @desc    Login (Super Admin, Org Admin, or User)
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body; // No organizationId needed

    console.log('🔐 [Login] Attempting login (Single Tenant - Vlite):', {
      email,
      hasPassword: !!password,
      passwordLength: password?.length
    });

    if (!email || !password) {
      console.log('❌ [Login] Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // SINGLE TENANT: Always use Vlite organization
    const vliteOrganization = await Organization.findById(vliteConfig.organizationId);

    if (!vliteOrganization) {
      logger.error('[Single Tenant] Vlite organization not found');
      return res.status(500).json({
        success: false,
        message: 'System organization not configured',
      });
    }

    console.log('✓ [Single Tenant] Using Vlite organization:', vliteOrganization.name);

    /* HARDCODED ADMIN DISABLED - Enforcing Database Login
    if (email === 'admin@vlite.com' && password === 'admin@1234') {
      console.log('🔥 HARDCODED ADMIN LOGIN: admin@vlite.com');

      const token = generateToken({
        id: 'hardcoded-admin-system',
        organizationId: vliteOrganization._id,
        type: 'HARDCODED_ADMIN',
      });

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: 'hardcoded-admin-system',
          email: 'admin@vlite.com',
          firstName: 'System',
          lastName: 'Admin',
          userRole: 'Admin',
          department: 'Management',
          organizationId: vliteOrganization._id,
          organizationName: vliteOrganization.name,
          type: 'HARDCODED_ADMIN',
          isSystemAdmin: true,
          dashboardPermissions: [], // Full access, no restrictions
          dataSourceUserId: null,
        },
      });
    }
    */

    // Try Super Admin login first
    console.log('🔍 [Login] Checking SuperAdmin...');
    let superAdmin = await SuperAdmin.findOne({ email }).select('+password');
    console.log('🔍 [Login] SuperAdmin result:', !!superAdmin);

    if (superAdmin) {
      // Check if account is locked
      if (superAdmin.isLocked()) {
        return res.status(423).json({
          success: false,
          message: 'Account is locked. Please try again later.',
        });
      }

      const isMatch = await superAdmin.comparePassword(password);

      if (!isMatch) {
        await superAdmin.incLoginAttempts();
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Reset login attempts and update last login
      await superAdmin.resetLoginAttempts();
      superAdmin.lastLogin = Date.now();
      await superAdmin.save();

      const token = generateToken({
        id: superAdmin._id,
        type: 'SUPER_ADMIN',
      });

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: superAdmin._id,
          email: superAdmin.email,
          firstName: superAdmin.firstName,
          lastName: superAdmin.lastName,
          role: superAdmin.role,
          type: 'SUPER_ADMIN',
        },
      });
    }

    // Try Organization Admin login (Vlite org only)
    console.log('🔍 [Login] Checking Vlite Organization Admins');
    const organization = await Organization.findById(vliteOrganization._id).select('+adminUser.password +secondaryAdmins.password');

    if (!organization.isActive) {
      console.log('❌ [Login] Vlite organization not active');
      return res.status(403).json({
        success: false,
        message: 'System is currently inactive',
      });
    }

    let loggedInAdmin = null;

    // 1. Check Primary Admin
    if (organization.adminUser.email === email) {
      console.log('✓ [Login] Email matches Primary admin');
      const isMatch = await organization.compareAdminPassword(password);
      if (isMatch) {
        loggedInAdmin = {
          ...organization.adminUser.toObject(),
          id: organization._id, // Use Org ID for token
          isAdmin: true
        };
        organization.adminUser.lastLogin = Date.now();
      }
    }

    // 2. Check Secondary Admins if not already matched
    if (!loggedInAdmin && organization.secondaryAdmins) {
      const secondaryAdmin = organization.secondaryAdmins.find(admin => admin.email === email);
      if (secondaryAdmin) {
        console.log('✓ [Login] Email matches Secondary admin');
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(password, secondaryAdmin.password);
        if (isMatch) {
          loggedInAdmin = {
            ...secondaryAdmin.toObject(),
            id: organization._id, // Still use Org ID to keep tenant context
            isAdmin: true,
            isSecondary: true
          };
          secondaryAdmin.lastLogin = Date.now();
        }
      }
    }

    if (loggedInAdmin) {
      await organization.save();

      // SINGLE TENANT: If this is the main Vlite organization, treat the admin as a SUPER_ADMIN
      const isSystemOrg = organization._id.toString() === vliteConfig.organizationId;
      const userType = isSystemOrg ? 'SUPER_ADMIN' : 'ORG_ADMIN';

      const token = generateToken({
        id: organization._id,
        organizationId: organization._id,
        adminId: loggedInAdmin._id, // Pass specific admin ID if needed
        type: userType,
      });

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: organization._id,
          adminId: loggedInAdmin._id,
          email: loggedInAdmin.email,
          firstName: loggedInAdmin.firstName,
          lastName: loggedInAdmin.lastName,
          organizationId: organization._id,
          organizationName: organization.name,
          type: userType,
          isSystemAdmin: isSystemOrg,
          userRole: 'Admin',
        },
      });
    }

    // Try regular user login (Vlite org)
    const user = await User.findOne({
      email,
      organizationId: vliteOrganization._id,
      isDeleted: false
    }).select('+password').populate('role');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    if (!user.isActive || user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'User account is not active',
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login and track login history
    user.lastLogin = Date.now();
    user.lastActivity = Date.now();
    user.isOnline = true;

    // Add to login history
    user.loginHistory.push({
      loginTime: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    // Keep only last 50 login records
    if (user.loginHistory.length > 50) {
      user.loginHistory = user.loginHistory.slice(-50);
    }

    await user.save();

    const token = generateToken({
      id: user._id,
      organizationId: user.organizationId,
      type: 'USER',
    });

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userRole: user.userRole,
        department: user.department,
        organizationId: user.organizationId,
        organizationName: vliteOrganization.name,
        type: 'USER',
        dashboardPermissions: user.dashboardPermissions || [],
        dataSourceUserId: user.dataSourceUserId || null,
      },
    });

    // If we reach here, credentials were wrong
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials',
    });

  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = async (req, res) => {
  try {
    // Populate organization features if organization exists
    let organization = req.organization;
    if (organization) {
      organization = await Organization.findById(organization._id)
        .populate('enabledFeatures.featureId')
        .lean();
    }

    res.status(200).json({
      success: true,
      user: req.user,
      userType: req.userType,
      organization: organization,
    });
  } catch (error) {
    logger.error(`Get me error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Debug organization info (temporary)
 * @route   GET /api/auth/debug-org/:orgId
 * @access  Public (temporary - remove in production)
 */
exports.debugOrganization = async (req, res) => {
  try {
    const { orgId } = req.params;
    const org = await Organization.findById(orgId);

    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    res.json({
      success: true,
      data: {
        _id: org._id,
        name: org.name,
        email: org.email,
        adminEmail: org.adminUser.email,
        adminFirstName: org.adminUser.firstName,
        adminLastName: org.adminUser.lastName,
        isActive: org.isActive,
        hasPassword: !!org.adminUser.password,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Register a new organization (DISABLED - Single Tenant)
 * @route   POST /api/auth/register-organization
 * @access  Public
 * @deprecated This endpoint is disabled in single-tenant mode
 */
exports.registerOrganization = async (req, res) => {
  // Single-tenant mode: organization creation is disabled
  return res.status(403).json({
    success: false,
    message: 'Organization registration is disabled in single-tenant mode',
  });

  /* ORIGINAL CODE DISABLED FOR SINGLE-TENANT MODE
  try {
    const {
      name,
      slug,
      email,
      phone,
      address,
      adminUser,
      seedData = true,
    } = req.body;

    // Check if organization with same email or slug exists
    const existingOrg = await Organization.findOne({
      $or: [{ email }, { slug }]
    });

    if (existingOrg) {
      return res.status(400).json({
        success: false,
        message: 'Organization with this email or slug already exists',
      });
    }

    // Check if admin email already exists
    const existingAdminEmail = await Organization.findOne({
      'adminUser.email': adminUser.email
    });

    if (existingAdminEmail) {
      return res.status(400).json({
        success: false,
        message: 'Admin email already in use',
      });
    }

    // Create organization with automatic database creation
    const { initializeTenantModels } = require('../utils/tenantDatabase');
    const { seedTenantData } = require('../utils/seedTenantData');

    const organization = await Organization.create({
      name,
      slug,
      email,
      phone,
      address,
      subscriptionPlan: 'TRIAL',
      subscriptionStatus: 'ACTIVE',
      subscriptionStartDate: Date.now(),
      subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
      adminUser: {
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        email: adminUser.email,
        phone: adminUser.phone,
        password: adminUser.password,
        isActive: true,
      },
      isActive: true,
      isVerified: true,
      verifiedAt: Date.now(),
    });

    const dbName = organization.database.name;
    logger.info(`✓ Organization created: ${organization.name} (ID: ${organization._id})`);
    logger.info(`  Database name: ${dbName}`);

    // Initialize tenant database and models
    try {
      logger.info(`Initializing tenant database for: ${dbName}`);
      await initializeTenantModels(dbName, organization._id);
      logger.info(`✓ Tenant database models initialized`);

      // Seed initial data if requested
      if (seedData) {
        logger.info(`Seeding default data for: ${organization.name}`);
        const seedingResult = await seedTenantData(dbName, organization._id, {});
        logger.info(`✓ Initial data seeded successfully`);
        logger.info(`  Data created: ${JSON.stringify(seedingResult.data)}`);
      }
    } catch (dbError) {
      logger.error(`❌ Error initializing tenant database: ${dbError.message}`);
      // Don't fail the request, org is created
    }

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: {
        _id: organization._id,
        name: organization.name,
        slug: organization.slug,
        email: organization.email,
        database: {
          name: dbName,
        },
      },
    });

  } catch (error) {
    logger.error(`Register organization error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error creating organization',
      error: error.message,
    });
  }
  */
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res) => {
  try {
    // Clear session token if applicable
    if (req.userType === 'USER' && req.user) {
      req.user.sessionToken = null;
      await req.user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Verify current user's password
 * @route   POST /api/auth/verify-password
 * @access  Private
 */
exports.verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide password',
      });
    }

    let isMatch = false;

    if (req.userType === 'SUPER_ADMIN') {
      // Try SuperAdmin model first
      let admin = await SuperAdmin.findById(req.user.id || req.user._id).select('+password');

      if (admin) {
        isMatch = await admin.comparePassword(password);
      } else {
        // Fallback for mapped admin (from Organization)
        const organization = await Organization.findById(req.user.organizationId).select('+adminUser.password');
        if (organization && organization.adminUser.email === req.user.email) {
          isMatch = await organization.compareAdminPassword(password);
        }
      }
    } else if (req.userType === 'ORG_ADMIN') {
      const organization = await Organization.findById(req.user.organizationId).select('+adminUser.password +secondaryAdmins.password');

      if (organization) {
        // Check primary admin
        if (organization.adminUser.email === req.user.email) {
          isMatch = await organization.compareAdminPassword(password);
        } else {
          // Check secondary admins
          const secondaryAdmin = organization.secondaryAdmins.find(admin => admin.email === req.user.email);
          if (secondaryAdmin) {
            isMatch = await bcrypt.compare(password, secondaryAdmin.password);
          }
        }
      }
    } else if (req.userType === 'USER') {
      const user = await User.findById(req.user.id || req.user._id).select('+password');
      if (user) {
        isMatch = await user.comparePassword(password);
      }
    }

    if (isMatch) {
      return res.status(200).json({
        success: true,
        message: 'Password verified',
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password',
      });
    }

  } catch (error) {
    logger.error(`Verify password error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};
