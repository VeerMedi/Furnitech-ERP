// Script to update jasleen@vlite.com role to Admin
const mongoose = require('mongoose');
require('dotenv').config();

const updateJasleenRole = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const User = require('./models/vlite/User');

        const result = await User.findOneAndUpdate(
            { email: 'jasleen@vlite.com' },
            { userRole: 'Admin' },
            { new: true }
        );

        if (result) {
            console.log('✅ SUCCESS: jasleen@vlite.com role updated to Admin');
            console.log('   Current role:', result.userRole);
        } else {
            console.log('❌ User not found: jasleen@vlite.com');
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

updateJasleenRole();
