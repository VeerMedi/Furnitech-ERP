
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/database');
const User = require('../models/vlite/User');

const migrateJasleen = async () => {
    try {
        await connectDB();
        console.log('✅ Connected to MongoDB');

        // 1. Check for the NEW admin user I might have just created and delete it to avoid collision
        const newAdmin = await User.findOne({ email: 'admin@vlite.com' });
        if (newAdmin) {
            // Check if this is the "System Admin" created recently (we can infer by creation time or just email)
            // If it's the one we just made, we delete it to allow Jasleen to take this email.
            console.log('🗑️  Deleting temporary admin@vlite.com account to allow migration...');
            await User.deleteOne({ _id: newAdmin._id });
        }

        // 2. Find Jasleen
        const jasleen = await User.findOne({ email: 'jasleen@vlite.com' });

        if (!jasleen) {
            console.log('❌ Jasleen user not found! Cannot migrate.');
            process.exit(1);
        }

        console.log(`👤 Found Jasleen (${jasleen._id}). Migrating to Admin...`);

        // 3. Update Jasleen to be the Admin
        const hashedPassword = await bcrypt.hash('admin@1234', 10);

        jasleen.email = 'admin@vlite.com';
        jasleen.firstName = 'System';
        jasleen.lastName = 'Admin'; // Or keep 'Singh' if preferred, but usually 'System Admin' for generic
        jasleen.password = hashedPassword;
        jasleen.isSystemAdmin = true;
        jasleen.dashboardPermissions = [
            { dashboard: 'customers', accessLevel: 'edit' },
            { dashboard: 'crm', accessLevel: 'edit' },
            { dashboard: 'products', accessLevel: 'edit' },
            { dashboard: 'inquiries', accessLevel: 'edit' },
            { dashboard: 'quotations', accessLevel: 'edit' },
            { dashboard: 'orders', accessLevel: 'edit' },
            { dashboard: 'drawings', accessLevel: 'edit' },
            { dashboard: 'machines', accessLevel: 'edit' },
            { dashboard: 'production', accessLevel: 'edit' },
            { dashboard: 'transport', accessLevel: 'edit' },
            { dashboard: 'vendors', accessLevel: 'edit' },
            { dashboard: 'management', accessLevel: 'edit' },
            { dashboard: 'users', accessLevel: 'edit' },
            { dashboard: 'raw-material', accessLevel: 'edit' },
            { dashboard: 'inventory-management', accessLevel: 'edit' }
        ];

        await jasleen.save();

        console.log('✅ Successfully migrated Jasleen user to Admin!');
        console.log('  New Email: admin@vlite.com');
        console.log('  New Password: admin@1234');
        console.log('  ID preserved: ' + jasleen._id);

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

migrateJasleen();
