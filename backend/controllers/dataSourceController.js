const User = require('../models/vlite/User');

/**
 * Get list of users for data source selection
 */
exports.getDataSourceUsers = async (req, res) => {
    try {
        const { organizationId } = req.user;

        const users = await User.find({
            organizationId,
            isDeleted: false,
            isActive: true,
        })
            .select('firstName lastName email employeeId')
            .sort({ firstName: 1 });

        res.status(200).json({
            success: true,
            data: users,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching users',
            error: error.message,
        });
    }
};
