const express = require('express');
const router = express.Router();
const User = require('../models/vlite/User');
const { authenticate } = require('../middleware/auth');

// Fix user role endpoint
router.post('/fix/:userId', authenticate, async (req, res) => {
    try {
        const { userId } = req.params;
        const { newRole } = req.body;

        console.log('Fixing user role for:', userId);
        console.log('New role:', newRole);

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('Current role:', user.userRole);

        user.userRole = newRole;
        await user.save();

        console.log('Updated role:', user.userRole);

        res.json({
            success: true,
            message: 'User role updated successfully',
            data: {
                userId: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                oldRole: user.userRole,
                newRole: newRole
            }
        });
    } catch (error) {
        console.error('Error fixing user role:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get user by email
router.get('/user-by-email/:email', authenticate, async (req, res) => {
    try {
        const { email } = req.params;
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                userId: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                userRole: user.userRole,
                designation: user.designation,
                department: user.department
            }
        });
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
