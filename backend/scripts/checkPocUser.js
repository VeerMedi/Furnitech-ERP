/**
 * Check if POC user exists
 * Run: node scripts/checkPocUser.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/vlite/User');
const Role = require('../models/vlite/Role');
const Organization = require('../models/shared/Organization');

const checkPocUser = async () => {
    try {
        await connectDB();

        console.log('🔍 Checking POC user...\n');

        const vliteOrg = await Organization.findOne({ slug: 'vlite-furnitures' });

        if (!vliteOrg) {
            console.error('❌ Organization not found');
            process.exit(1);
        }

        const pocUser = await User.findOne({
            email: 'poc@vlite.com',
            organizationId: vliteOrg._id
        })
            .populate('role')
            .populate('dataSourceUserId');

        if (!pocUser) {
            console.error('❌ POC user NOT found in database');
            process.exit(1);
        }

        console.log('✅ POC user FOUND in database\n');
        console.log('📋 User Details:');
        console.log('─────────────────────────────────────');
        console.log(`  ID: ${pocUser._id}`);
        console.log(`  Email: ${pocUser.email}`);
        console.log(`  First Name: ${pocUser.firstName}`);
        console.log(`  Last Name: ${pocUser.lastName}`);
        console.log(`  Organization ID: ${pocUser.organizationId}`);
        console.log(`  Role: ${pocUser.role?.name || 'N/A'}`);
        console.log(`  Status: ${pocUser.status}`);
        console.log(`  Active: ${pocUser.isActive}`);
        console.log(`  Data Source: ${pocUser.dataSourceUserId?.email || 'None'}`);
        console.log('\n  Dashboard Permissions:');
        if (pocUser.dashboardPermissions && pocUser.dashboardPermissions.length > 0) {
            pocUser.dashboardPermissions.forEach(perm => {
                console.log(`    - ${perm.dashboard}: ${perm.accessLevel}`);
            });
        } else {
            console.log('    No permissions set');
        }
        console.log('─────────────────────────────────────\n');

        console.log('🔑 Login Credentials:');
        console.log(`  Email: poc@vlite.com`);
        console.log(`  Password: poc@123`);
        console.log(`  Organization ID: ${vliteOrg._id}\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

checkPocUser();
