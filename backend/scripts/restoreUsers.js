/**
 * Restore Users Script
 * Re-creates the user accounts that were deleted
 * Run: node scripts/restoreUsers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/database');
const User = require('../models/vlite/User');
const Role = require('../models/vlite/Role');
const Organization = require('../models/shared/Organization');

const restoreUsers = async () => {
    try {
        // Connect to database
        await connectDB();

        console.log('🔍 Finding Vlite Furnitures organization...');
        const vliteOrg = await Organization.findOne({ slug: 'vlite-furnitures' });

        if (!vliteOrg) {
            console.error('❌ Vlite Furnitures organization not found.');
            process.exit(1);
        }

        console.log(`✅ Found organization: ${vliteOrg.name} (ID: ${vliteOrg._id})`);

        // Find roles
        console.log('🔍 Finding roles...');
        const roles = await Role.find({ organizationId: vliteOrg._id });
        const adminRole = roles.find(r => r.code === 'ADMIN');
        const salesRole = roles.find(r => r.code === 'SALES_EXEC');
        const designerRole = roles.find(r => r.code === 'DESIGNER');
        const accountsRole = roles.find(r => r.code === 'ACCOUNTS');

        if (!adminRole || !salesRole || !designerRole || !accountsRole) {
            console.error('❌ Required roles not found.');
            process.exit(1);
        }

        // Hash password once for all users
        const hashedPassword = await bcrypt.hash('krishna@123', 10);

        console.log('👥 Creating users...');
        const users = await User.insertMany([
            {
                firstName: 'Jasleen',
                lastName: 'POC',
                email: 'jasleen@vlite.com',
                phone: '+919876543211',
                password: hashedPassword,
                employeeId: 'EMP001',
                designation: 'First Point of Contact',
                department: 'SALES_MARKETING',
                workflowRole: 'POC',
                role: salesRole._id,
                organizationId: vliteOrg._id,
                isActive: true,
                status: 'ACTIVE',
            },
            {
                firstName: 'Rachana',
                lastName: 'Matondkar',
                email: 'rachana@vlite.com',
                phone: '+919876543212',
                password: hashedPassword,
                employeeId: 'EMP002',
                designation: 'Sales Executive',
                department: 'SALES_MARKETING',
                workflowRole: 'SALES_EXECUTIVE',
                role: salesRole._id,
                organizationId: vliteOrg._id,
                isActive: true,
                status: 'ACTIVE',
            },
            {
                firstName: 'Akshay',
                lastName: 'Patil',
                email: 'akshay@vlite.com',
                phone: '+919876543213',
                password: hashedPassword,
                employeeId: 'EMP003',
                designation: 'Design Team Lead',
                department: 'DESIGN',
                workflowRole: 'DESIGN_LEAD',
                role: designerRole._id,
                organizationId: vliteOrg._id,
                isActive: true,
                status: 'ACTIVE',
            },
            {
                firstName: 'Sandeep',
                lastName: 'Sinha',
                email: 'sandeep@vlite.com',
                phone: '+919876543214',
                password: hashedPassword,
                employeeId: 'EMP004',
                designation: 'Marketing Director',
                department: 'MANAGEMENT',
                workflowRole: 'MARKETING_DIRECTOR',
                role: adminRole._id,
                organizationId: vliteOrg._id,
                isActive: true,
                status: 'ACTIVE',
            },
            {
                firstName: 'Sachin',
                lastName: 'Girhe',
                email: 'sachin@vlite.com',
                phone: '+919876543215',
                password: hashedPassword,
                employeeId: 'EMP005',
                designation: 'Accounts Manager',
                department: 'ACCOUNTS',
                workflowRole: 'ACCOUNTS_MANAGER',
                role: accountsRole._id,
                organizationId: vliteOrg._id,
                isActive: true,
                status: 'ACTIVE',
            },
        ]);

        console.log(`✅ Created ${users.length} users successfully!`);
        console.log('\n📋 User Accounts Created:');
        console.log('─────────────────────────────────────');
        users.forEach(user => {
            console.log(`  ${user.firstName} ${user.lastName} - ${user.email}`);
        });
        console.log('─────────────────────────────────────');
        console.log('  Password for all users: krishna@123');
        console.log('─────────────────────────────────────\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error restoring users:', error);
        process.exit(1);
    }
};

// Run script
restoreUsers();
