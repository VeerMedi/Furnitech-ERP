const express = require('express');
const router = express.Router();
const {
  createOrganization,
  getAllOrganizations,
  getOrganization,
  updateOrganization,
  updateOrganizationFeatures,
  deleteOrganization,
  getAllFeatures,
  createFeature,
  getSystemStats,
  addSecondaryAdmin,
  updateSecondaryAdmin,
  removeSecondaryAdmin,
  getAllPaymentHistory,
  getAllSubscriptionDetails,
} = require('../controllers/adminController');
const { authenticate, authorizeSuperAdmin } = require('../middleware/auth');

// All routes require super admin authentication
router.use(authenticate);
router.use(authorizeSuperAdmin);

// Organization routes
router.route('/organizations')
  .get(getAllOrganizations)
  .post(createOrganization);

router.route('/organizations/:id')
  .get(getOrganization)
  .put(updateOrganization)
  .delete(deleteOrganization);

router.put('/organizations/:id/features', updateOrganizationFeatures);

// Feature routes
router.route('/features')
  .get(getAllFeatures)
  .post(createFeature);

// Admins management
router.post('/organizations/:id/admins', addSecondaryAdmin);
router.put('/organizations/:id/admins/:adminId', updateSecondaryAdmin);
router.delete('/organizations/:id/admins/:email', removeSecondaryAdmin);

// Statistics
router.get('/stats', getSystemStats);

// Payments
router.get('/payments', getAllPaymentHistory);
router.get('/subscriptions', getAllSubscriptionDetails);

module.exports = router;
