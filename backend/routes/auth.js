const express = require('express');
const router = express.Router();
const { login, getMe, logout, getOrganizations, registerOrganization, debugOrganization, verifyPassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.get('/organizations', getOrganizations);
router.post('/register-organization', registerOrganization);
router.get('/debug-org/:orgId', debugOrganization);
router.post('/login', login);

// Protected routes
router.get('/me', authenticate, getMe);

router.post('/logout', authenticate, logout);
router.post('/verify-password', authenticate, verifyPassword);

module.exports = router;
