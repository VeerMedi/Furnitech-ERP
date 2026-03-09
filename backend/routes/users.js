const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUsersByDepartment,
  getUsersByWorkflowRole,
  getDashboardData,
  getProductionWorkers,
  getSidebarPreferences,
  updateSidebarPreferences,
} = require('../controllers/userController');
const { authenticate, authorizeOrgAdmin } = require('../middleware/auth');

// TEMPORARILY DISABLE AUTH FOR DEBUGGING
// router.use(authenticate);

// Dashboard data for current user
router.get('/dashboard', authenticate, getDashboardData);

// Production workers (for Production Manager)
router.get('/production-workers', authenticate, getProductionWorkers);

// Department and workflow role queries
router.get('/department/:department', authenticate, getUsersByDepartment);
router.get('/workflow/:role', authenticate, getUsersByWorkflowRole);

// TEST ROUTE - to verify routing works
router.get('/test-route', (req, res) => {
  console.log('🧪 TEST ROUTE HIT!');
  res.json({ success: true, message: 'Test route working!' });
});

// Optional auth middleware - works with or without token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const tenantId = req.headers['x-tenant-id'];

    if (token && tenantId) {
      // If token exists, try to authenticate
      const jwt = require('jsonwebtoken');
      const User = require('../models/vlite/User');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      req.tenantId = tenantId;
    } else {
      // No token - create anonymous user context
      req.user = { id: 'anonymous', email: 'anonymous' };
      req.tenantId = 'default';
    }
    next();
  } catch (error) {
    // Auth failed - still continue with anonymous
    req.user = { id: 'anonymous', email: 'anonymous' };
    req.tenantId = 'default';
    next();
  }
};

// Middleware to authorize user updates (Org Admin OR Management Dashboard Edit Access OR Self Update)
const authorizeUserUpdate = (req, res, next) => {
  console.log('🛡️ [authorizeUserUpdate] HIT! Checking for:', req.user?.email);

  // 0. EMERGENCY FORCE ALLOW for specific admin user AND Hardcoded System Admin
  // This bypasses all other checks to ensure access
  if (req.user && (
    req.user.email === 'sourabh@thehustlehouseofficial.com' ||
    req.user.email === 'admin@vlite.com' ||
    req.user.id === 'hardcoded-admin-system' ||
    req.user._id === 'hardcoded-admin-system'
  )) {
    console.log(`🚨 EMERGENCY ALLOW: ${req.user.email} (${req.user.id})`);
    return next();
  }

  // 1. Allow Super Admin
  if (req.userType === 'SUPER_ADMIN') {
    return next();
  }

  // 2. Allow Org Admin
  if (req.userType === 'ORG_ADMIN') {
    return next();
  }

  // 3. Allow Self Update (User updating their own profile)
  // Converting to string for safe comparison
  if (req.user && req.params.id && req.user._id && req.user._id.toString() === req.params.id.toString()) {
    console.log('✅ Allowed: Self Update');
    return next();
  }

  // 4. Check for Management Dashboard Edit Permission OR Admin Role
  if (req.user) {
    // Check dashboard permissions
    if (req.user.dashboardPermissions) {
      const hasPermission = req.user.dashboardPermissions.some(p =>
        p.dashboard === 'management' && p.accessLevel === 'edit'
      );
      if (hasPermission) {
        console.log('✅ Allowed: Management Edit Permission');
        return next();
      }
    }

    // Check Admin Role (Robust check for role name or workflowRole)
    const isAdminRole =
      req.user.workflowRole === 'ADMIN' ||
      req.user.role?.name === 'Admin';

    if (isAdminRole) {
      console.log('✅ Allowed: Admin Role check');
      return next();
    }
  }

  console.log('❌ Access Denied in authorizeUserUpdate');
  console.log('User:', req.user?.email);

  return res.status(403).json({
    success: false,
    message: `Access denied. debug info: user=${req.user?.email}, id=${req.user?._id}, role=${req.user?.userRole}, workflow=${req.user?.workflowRole}, target=${req.params.id}`,
  });
};

// Sidebar Preferences - Works with or without auth
router.get('/preferences/sidebar', optionalAuth, getSidebarPreferences);
router.put('/preferences/sidebar', optionalAuth, updateSidebarPreferences);

// CRUD operations (require org admin)
router.route('/')
  .get(authenticate, getAllUsers)
  .post(authenticate, authorizeOrgAdmin, createUser);

router.route('/:id')
  .get(authenticate, getUser)
  .put(authenticate, authorizeUserUpdate, updateUser)
  .delete(authenticate, authorizeOrgAdmin, deleteUser);

module.exports = router;
