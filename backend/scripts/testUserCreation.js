require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/vlite/User');
const Role = require('../models/vlite/Role');
const Organization = require('../models/shared/Organization');
const connectDB = require('../config/database');

const testUserCreation = async () => {
    try {
        await connectDB();

        console.log('\n🧪 Testing User Creation...\n');

        // Get first active organization
        const org = await Organization.findOne({ isActive: true });
        if (!org) {
            console.log('❌ No active organization found!');
            process.exit(1);
        }

        console.log(`🏢 Using organization: ${org.name} (${org._id})\n`);
        const ORG_ID = org._id;

        // Check if roles exist
        const roles = await Role.find({ organizationId: ORG_ID });
        console.log(`📋 Found ${roles.length} roles for organization\n`);

        if (roles.length === 0) {
            console.log('❌ No roles found! Need to run: node scripts/seedRoles.js');
            process.exit(1);
        }

        roles.forEach(role => {
            console.log(`   - ${role.name} (${role.code})`);
        });

        const defaultRole = roles[0];
        console.log(`\n✅ Using default role: ${defaultRole.name} (${defaultRole._id})\n`);

        // Try to create a test user
        const testUserData = {
            firstName: 'Test',
            lastName: 'User',
            email: `test${Date.now()}@example.com`,
            password: 'Test@12345',
            role: defaultRole._id,
            organizationId: ORG_ID,
            employeeId: `TEST${Date.now()}`,
            dashboardPermissions: [
                { dashboard: 'salesman-dashboard', accessLevel: 'edit' }
            ],
            userRole: 'Salesman'
        };

        console.log('📝 Attempting to create user with data:');
        console.log(JSON.stringify(testUserData, null, 2));
        console.log('');

        const newUser = await User.create(testUserData);

        console.log('✅ User created successfully!');
        console.log(`   ID: ${newUser._id}`);
        console.log(`   Email: ${newUser.email}`);
        console.log(`   Role: ${newUser.role}\n`);

        // Clean up test user
        await User.findByIdAndDelete(newUser._id);
        console.log('🗑️  Test user cleaned up\n');

        console.log('🎉 User creation is working! The issue might be in the API request.\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error creating user:');
        console.error(`   Message: ${error.message}`);

        if (error.errors) {
            console.error('\n   Validation errors:');
            Object.keys(error.errors).forEach(key => {
                console.error(`     - ${key}: ${error.errors[key].message}`);
            });
        }

        console.error('\n   Stack:', error.stack);
        process.exit(1);
    }
};

testUserCreation();
