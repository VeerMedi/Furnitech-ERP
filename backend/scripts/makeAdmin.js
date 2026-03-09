// Script to make a user a system admin
const mongoose = require('mongoose');
const User = require('../models/vlite/User');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vlite-furnitures';

async function makeAdmin(email) {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const user = await User.findOne({ email });

        if (!user) {
            console.log(`❌ User with email ${email} not found!`);
            return;
        }

        console.log(`Found user: ${user.firstName} ${user.lastName}`);
        console.log(`Current isSystemAdmin: ${user.isSystemAdmin}`);

        // Update to system admin
        user.isSystemAdmin = true;
        await user.save();

        console.log(`✅ Successfully made ${user.firstName} ${user.lastName} a system admin!`);
        console.log('Please logout and login again to apply changes.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
    console.log('Usage: node makeAdmin.js <email>');
    console.log('Example: node makeAdmin.js jasleen@vlite.com');
    process.exit(1);
}

makeAdmin(email);
