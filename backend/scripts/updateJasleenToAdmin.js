require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/vlite/User');

const updateJasleenRole = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find jasleen's user record
        const jasleen = await User.findOne({ email: 'jasleen@vlite.com' });

        if (!jasleen) {
            console.log('❌ User jasleen@vlite.com not found!');
            process.exit(1);
        }

        console.log('\n📋 Current User Details:');
        console.log('Email:', jasleen.email);
        console.log('Name:', jasleen.firstName, jasleen.lastName);
        console.log('Current Role:', jasleen.userRole);

        // Update role to Admin
        const result = await User.updateOne(
            { email: 'jasleen@vlite.com' },
            {
                $set: {
                    userRole: 'Admin',
                    isSystemAdmin: true  // Also set system admin flag
                }
            }
        );

        console.log('\n✅ Role Updated Successfully!');
        console.log('Modified Count:', result.modifiedCount);

        // Verify the update
        const updatedUser = await User.findOne({ email: 'jasleen@vlite.com' });
        console.log('\n📋 Updated User Details:');
        console.log('Email:', updatedUser.email);
        console.log('New Role:', updatedUser.userRole);
        console.log('System Admin:', updatedUser.isSystemAdmin);

        console.log('\n🎉 jasleen@vlite.com is now an Admin!');

    } catch (error) {
        console.error('❌ Error updating user:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
        process.exit(0);
    }
};

// Run the script
updateJasleenRole();
