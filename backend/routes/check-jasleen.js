const express = require('express');
const router = express.Router();
const User = require('../models/vlite/User');

// Debug endpoint to check jasleen's current stored role
router.get('/jasleen-role', async (req, res) => {
    try {
        const user = await User.findOne({ email: 'jasleen@vlite.com' });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            userRole: user.userRole,
            isSystemAdmin: user.isSystemAdmin,
            organizationId: user.organizationId,
            dashboardPermissions: user.dashboardPermissions
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
