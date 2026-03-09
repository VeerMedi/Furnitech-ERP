require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/vlite/User');

const verifyJasleenRole = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const jasleen = await User.findOne({ email: 'jasleen@vlite.com' });

        if (!jasleen) {
            console.log('❌ User not found!');
        } else {
            console.log('📋 Current Database Values:');
            console.log('Email:', jasleen.email);
            console.log('Name:', jasleen.firstName, jasleen.lastName);
            console.log('userRole:', jasleen.userRole);
            console.log('isSystemAdmin:', jasleen.isSystemAdmin);
            console.log('organizationId:', jasleen.organizationId);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

verifyJasleenRole();
