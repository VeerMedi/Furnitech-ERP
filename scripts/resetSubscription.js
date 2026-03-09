const mongoose = require('mongoose');
require('dotenv').config({ path: '../backend/.env' }); // Adjust path if needed

const Subscription = require('../backend/models/shared/Subscription');
const User = require('../backend/models/vlite/User');

const resetSubscription = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vlite-furnitures');
        console.log('✅ Connected to MongoDB');

        // Find the test organization
        const testUser = await User.findOne({
            $or: [
                { email: 'admin@vlite.com' },
                { userRole: 'Admin' }
            ]
        });

        if (!testUser || !testUser.organizationId) {
            console.error('❌ Could not find test admin/organization');
            process.exit(1);
        }

        const organizationId = testUser.organizationId;
        console.log(`🔍 Found Organization ID: ${organizationId}`);

        // Delete Subscription
        const result = await Subscription.deleteOne({ organizationId });

        if (result.deletedCount > 0) {
            console.log('🗑️  Subscription DELETED successfully!');
            console.log('✨ You can now buy a fresh plan.');
        } else {
            console.log('⚠️  No active subscription found to delete.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

resetSubscription();
