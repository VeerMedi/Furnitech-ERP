require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/vlite/User');
const Role = require('../models/vlite/Role');

const fixJasleenRole = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find jasleen user
        const jasleen = await User.findOne({ email: 'jasleen@vlite.com' });

        if (!jasleen) {
            console.log('❌ jasleen@vlite.com not found!');
            process.exit(1);
        }

        console.log('📋 BEFORE Fix:');
        console.log('   Email:', jasleen.email);
        console.log('   userRole field:', jasleen.userRole);
        console.log('   role ObjectId:', jasleen.role);

        // Check if role reference exists and what it points to
        if (jasleen.role) {
            const roleDoc = await Role.findById(jasleen.role);
            console.log('   role.name:', roleDoc?.name || 'NOT FOUND');
        }

        console.log('\n🔧 Applying Fixes...\n');

        // Fix 1: Update userRole field to "Admin"
        jasleen.userRole = 'Admin';

        // Fix 2: Find or create Admin role in Role collection
        let adminRole = await Role.findOne({
            name: 'Admin',
            organizationId: jasleen.organizationId
        });

        if (!adminRole) {
            console.log('   Creating Admin role...');
            adminRole = await Role.create({
                name: 'Admin',
                organizationId: jasleen.organizationId,
                permissions: {
                    canManageUsers: true,
                    canManageRoles: true,
                    canViewReports: true,
                    canManageSettings: true,
                    canManageOrganization: true,
                },
                isSystemRole: true,
            });
            console.log('   ✅ Admin role created');
        }

        // Fix 3: Update role reference to point to Admin role
        jasleen.role = adminRole._id;

        // Fix 4: Set system admin flag
        jasleen.isSystemAdmin = true;

        // Save changes
        await jasleen.save();

        console.log('✅ All fixes applied!\n');

        // Verify the changes
        const updated = await User.findOne({ email: 'jasleen@vlite.com' }).populate('role');

        console.log('📋 AFTER Fix:');
        console.log('   Email:', updated.email);
        console.log('   userRole field:', updated.userRole);
        console.log('   role.name:', updated.role?.name);
        console.log('   isSystemAdmin:', updated.isSystemAdmin);

        console.log('\n🎉 SUCCESS! jasleen@vlite.com is now fully Admin!');
        console.log('\n📝 Next Steps:');
        console.log('   1. Logout from the app');
        console.log('   2. Login again with jasleen@vlite.com');
        console.log('   3. You should see "Admin" role everywhere');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

fixJasleenRole();
