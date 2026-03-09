
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/vlite/User');
const Organization = require('../models/shared/Organization');

const checkJasleen = async () => {
    try {
        await connectDB();
        console.log('✅ Connected to MongoDB');

        const jasleenUser = await User.findOne({ email: 'jasleen@vlite.com' });

        if (jasleenUser) {
            console.log('⚠️  User FOUND: jasleen@vlite.com exists in the database.');
            console.log(`  _id: ${jasleenUser._id}`);
            console.log(`  Role: ${jasleenUser.userRole}`);
            console.log(`  Organization ID: ${jasleenUser.organizationId}`);
            console.log(`  Is Active: ${jasleenUser.isActive}`);
        } else {
            console.log('✅ User NOT FOUND: jasleen@vlite.com does not exist in the User collection.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

checkJasleen();
