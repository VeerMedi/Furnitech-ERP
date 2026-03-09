/**
 * Create POC User with Dashboard Permissions
 * Run: node scripts/createPocUser.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/database');
const User = require('../models/vlite/User');
const Role = require('../models/vlite/Role');
const Organization = require('../models/shared/Organization');

const createPocUser = async () => {
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

        // Delete existing POC user if exists
        await User.deleteOne({
            email: 'poc@vlite.com',
            organizationId: vliteOrg._id
        });

        // Create POC user with dashboard permissions
        const hashedPassword = await bcrypt.hash('poc@123', 10);

        const pocUser = await User.create({
            firstName: 'POC',
            lastName: 'User',
            email: 'poc@vlite.com',
            phone: '+919999999999',
            password: hashedPassword,
            employeeId: 'EMP-POC',
            designation: 'Point of Contact - Limited Access',
            department: 'SALES_MARKETING',
            workflowRole: 'POC',
            role: salesRole._id,
            organizationId: vliteOrg._id,
            isActive: true,
            status: 'ACTIVE',
            // Dashboard permissions - only 3 dashboards with edit/view access
            dashboardPermissions: [
                { dashboard: 'inquiries', accessLevel: 'edit' },
                { dashboard: 'crm', accessLevel: 'view' },
                { dashboard: 'products', accessLevel: 'view' },
            ],
            // Data source from jasleen
            dataSourceUserId: jaslеenUser._id,
        });

        console.log('✅ POC user created successfully!\n');
        console.log('📋 POC User Details:');
        console.log('─────────────────────────────────────');
        console.log(`  Email: ${pocUser.email}`);
        console.log(`  Password: poc@123`);
        console.log(`  Data Source: ${jaslеenUser.email}`);
        console.log('\n  Dashboard Permissions:');
        pocUser.dashboardPermissions.forEach(perm => {
            console.log(`    - ${perm.dashboard}: ${perm.accessLevel}`);
        });
        console.log('─────────────────────────────────────\n');

        console.log('🎯 Login with poc@vlite.com to see:');
        console.log('  ✓ Only 3 dashboards: Inquiries, CRM, Products');
        console.log('  ✓ Inquiries: Edit access (Add/Delete allowed)');
        console.log('  ✓ CRM & Products: View-only access');
        console.log('  ✓ Data from jasleen@vlite.com account\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

createPocUser();
