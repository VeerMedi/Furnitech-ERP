const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Debug route to check user details
router.get('/me', authenticate, (req, res) => {
    console.log('=== DEBUG USER INFO ===');
    console.log('User ID:', req.user?.id || req.user?._id);
    console.log('User Role:', req.user?.userRole);
    console.log('User Type:', req.userType);
    console.log('Organization ID:', req.user?.organizationId);
    console.log('Data Source User ID:', req.user?.dataSourceUserId);
    console.log('Full User Object:', JSON.stringify(req.user, null, 2));
    console.log('======================');

    res.json({
        success: true,
        data: {
            userId: req.user?.id || req.user?._id,
            userRole: req.user?.userRole,
            userType: req.userType,
            organizationId: req.user?.organizationId,
            dataSourceUserId: req.user?.dataSourceUserId,
            firstName: req.user?.firstName,
            lastName: req.user?.lastName,
            email: req.user?.email
        }
    });
});

module.exports = router;
