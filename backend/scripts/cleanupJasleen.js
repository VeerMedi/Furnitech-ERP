
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/vlite/User');

const cleanupJasleen = async () => {
    try {
        await connectDB();
        console.log('✅ Connected to MongoDB');

        // 1. Verify we have the admin account
        const adminUser = await User.findOne({ email: 'admin@vlite.com' });
        if (adminUser) {
            console.log('✅ Main Admin Account (admin@vlite.com) exists.');
            console.log(`   ID: ${adminUser._id}`);
        } else {
            console.error('❌ WARNING: admin@vlite.com NOT FOUND. Creating it should be prioritized before deleting others, but proceeding with cleanup as requested.');
        }

        // 2. Find ALL Jasleen accounts
        const jasleenUsers = await User.find({ email: 'jasleen@vlite.com' });
        console.log(`🔍 Found ${jasleenUsers.length} accounts with email 'jasleen@vlite.com'`);

        if (jasleenUsers.length > 0) {
            console.log('🗑️  Deleting them now...');
            const result = await User.deleteMany({ email: 'jasleen@vlite.com' });
            console.log(`✅ Deleted ${result.deletedCount} users with email jasleen@vlite.com`);
        } else {
            console.log('✅ No Jasleen accounts found to delete.');
        }

        // 3. Double check
        const remaining = await User.countDocuments({ email: 'jasleen@vlite.com' });
        if (remaining === 0) {
            console.log('✨ Cleanup Verification: ZERO users found with jasleen@vlite.com');
        } else {
            console.error(`❌ Verification Failed: ${remaining} users still exist!`);
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

cleanupJasleen();
