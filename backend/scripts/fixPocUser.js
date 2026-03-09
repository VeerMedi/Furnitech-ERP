/**
 * Fix POC User Password
 * Run: node scripts/fixPocUser.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/vlite/User');
const Role = require('../models/vlite/Role');
const Organization = require('../models/shared/Organization');

const fixPocUser = async () => {
    try {
        await connectDB();

        console.log('🔍 Finding organization and users...');
        const vliteOrg = await Organization.findOne({ slug: 'vlite-furnitures' });

        if (!vliteOrg) {
            console.error('❌ Organization not found');
            process.exit(1);
        }

        // Find jasleen user for data source
        const jaslеenUser = await User.findOne({
            email: 'jasleen@vlite.com',
            organizationId: vliteOrg._id
        });

        if (!jaslеenUser) {
            console.error('❌ Jasleen user not found');
            process.exit(1);
        }

        // Find role
        const salesRole = await Role.findOne({
            code: 'SALES_EXEC',
            organizationId: vliteOrg._id
        });

        if (!salesRole) {
            console.error('❌ Sales role not found');
            process.exit(1);
        }

        // Delete existing POC user
        console.log('🗑️  Deleting old POC user...');
        await User.deleteOne({
            email: 'poc@vlite.com',
            organizationId: vliteOrg._id
        });

        // Create POC user - DON'T hash password manually, User model will do it
        console.log('👤 Creating new POC user...');
        const pocUser = await User.create({
            firstName: 'POC',
            lastName: 'User',
            email: 'poc@vlite.com',
            phone: '+919999999999',
            password: 'poc@1234', // Plain text - User model's pre-save hook will hash it (min 8 chars)
            employeeId: 'EMP-POC',
            designation: 'Point of Contact - Limited Access',
            department: 'SALES_MARKETING',
            workflowRole: 'POC',
            role: salesRole._id,
            organizationId: vliteOrg._id,
            isActive: true,
            status: 'ACTIVE',
            dashboardPermissions: [
                { dashboard: 'inquiries', accessLevel: 'edit' },
                { dashboard: 'crm', accessLevel: 'view' },
                { dashboard: 'products', accessLevel: 'view' },
            ],
            dataSourceUserId: jaslеenUser._id,
        });

        console.log('✅ POC user created successfully!\n');
        console.log('📋 POC User Login:');
        console.log('─────────────────────────────────────');
        console.log(`  Email: ${pocUser.email}`);
        console.log(`  Password: poc@1234`);
        console.log(`  Organization ID: ${vliteOrg._id}`);
        console.log('─────────────────────────────────────\n');

        console.log('🎯 Try logging in now at http://localhost:5174/login\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

fixPocUser();
