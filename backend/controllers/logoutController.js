const User = require('../models/vlite/User');

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res) => {
    try {
        const userId = req.user._id;

        // Update user online status and last login history
        const user = await User.findById(userId);

        if (user && user.loginHistory.length > 0) {
            // Update the last login entry with logout time
            const lastLoginIndex = user.loginHistory.length - 1;
            if (!user.loginHistory[lastLoginIndex].logoutTime) {
                user.loginHistory[lastLoginIndex].logoutTime = new Date();
            }

            user.isOnline = false;
            await user.save();
        }

        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error logging out',
            error: error.message
        });
    }
};
