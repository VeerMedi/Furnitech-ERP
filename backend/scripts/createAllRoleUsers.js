/**
 * Create User Accounts for All Roles
 * Password for all accounts: krishna123
 * Run: node scripts/createAllRoleUsers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/database');
const User = require('../models/vlite/User');
const Role = require('../models/vlite/Role');
const Organization = require('../models/shared/Organization');

// All roles from the Users & Permissions page
const roleUsers = [
    {
        email: 'poc@vlite.com',
        firstName: 'POC',
        lastName: 'User',
        userRole: 'POC',
        employeeId: 'EMP-POC',
        designation: 'Point of Contact',
        department: 'SALES_MARKETING',
        workflowRole: 'POC'
    },
    {
        email: 'salesman@vlite.com',
        firstName: 'Salesman',
        lastName: 'User',
        userRole: 'Salesman',
        employeeId: 'EMP-SALES',
        designation: 'Salesman',
        department: 'SALES_MARKETING',
        workflowRole: 'SALES_EXECUTIVE'
    },
    {
        email: 'hod@vlite.com',
        firstName: 'Head of Sales',
        lastName: 'HOD',
        userRole: 'Head of Sales (HOD)',
        employeeId: 'EMP-HOD',
        designation: 'Head of Sales',
        department: 'SALES_MARKETING',
        workflowRole: 'SALES_EXECUTIVE'
    },
    {
        email: 'design@vlite.com',
        firstName: 'Design',
        lastName: 'User',
        userRole: 'Design',
        employeeId: 'EMP-DESIGN',
        designation: 'Designer',
        department: 'DESIGN',
        workflowRole: 'DESIGNER'
    },
    {
        email: 'designhead@vlite.com',
        firstName: 'Design Dept',
        lastName: 'Head',
        userRole: 'Design Dept Head',
        employeeId: 'EMP-DESIGN-HEAD',
        designation: 'Design Department Head',
        department: 'DESIGN',
        workflowRole: 'DESIGN_LEAD'
    },
    {
        email: 'production@vlite.com',
        firstName: 'Production',
        lastName: 'User',
        userRole: 'Production',
        employeeId: 'EMP-PROD',
        designation: 'Production Staff',
        department: 'PRODUCTION',
        workflowRole: 'PRODUCTION_MANAGER'
    },
    {
        email: 'projectmanager@vlite.com',
        firstName: 'Project',
        lastName: 'Manager',
        userRole: 'Project Manager',
        employeeId: 'EMP-PM',
        designation: 'Project Manager',
        department: 'MANAGEMENT',
        workflowRole: 'MARKETING_DIRECTOR'
    },
    {
        email: 'accounthandler@vlite.com',
        firstName: 'Account',
        lastName: 'Handler',
        userRole: 'Account Handler',
        employeeId: 'EMP-ACC-HDL',
        designation: 'Account Handler',
        department: 'ACCOUNTS',
        workflowRole: 'ACCOUNTS_MANAGER'
    },
    // Steel Production Roles
    {
        email: 'steel.cutting@vlite.com',
        firstName: 'Steel Cutting',
        lastName: 'Operator',
        userRole: 'Steel (Steel Cutting)',
        employeeId: 'EMP-STEEL-CUT',
        designation: 'Steel Cutting Operator',
        department: 'PRODUCTION',
        workflowRole: 'PRODUCTION_MANAGER'
    },
    {
        email: 'steel.cnc@vlite.com',
        firstName: 'CNC Cutting',
        lastName: 'Operator',
        userRole: 'Steel (CNC Cutting)',
        employeeId: 'EMP-CNC',
        designation: 'CNC Cutting Operator',
        department: 'PRODUCTION',
        workflowRole: 'PRODUCTION_MANAGER'
    },
    {
        email: 'steel.bending@vlite.com',
        firstName: 'Steel Bending',
        lastName: 'Operator',
        userRole: 'Steel (Bending)',
        employeeId: 'EMP-STEEL-BEND',
        designation: 'Steel Bending Operator',
        department: 'PRODUCTION',
        workflowRole: 'PRODUCTION_MANAGER'
    },
    {
        email: 'steel.welding@vlite.com',
        firstName: 'Steel Welding',
        lastName: 'Operator',
        userRole: 'Steel (Welding)',
        employeeId: 'EMP-STEEL-WELD',
        designation: 'Steel Welding Operator',
        department: 'PRODUCTION',
        workflowRole: 'PRODUCTION_MANAGER'
    },
    {
        email: 'steel.finishing@vlite.com',
        firstName: 'Steel Finishing',
        lastName: 'Operator',
        userRole: 'Steel (Finishing)',
        employeeId: 'EMP-STEEL-FIN',
        designation: 'Steel Finishing Operator',
        department: 'PRODUCTION',
        workflowRole: 'PRODUCTION_MANAGER'
    },
    {
        email: 'steel.packing@vlite.com',
        firstName: 'Steel Packing',
        lastName: 'Operator',
        userRole: 'Steel (Packing)',
        employeeId: 'EMP-STEEL-PACK',
        designation: 'Steel Packing Operator',
        department: 'PRODUCTION',
        workflowRole: 'PRODUCTION_MANAGER'
    },
    // Wood Production Roles
    {
        email: 'wood.beamsaw@vlite.com',
        firstName: 'Beam Saw',
        lastName: 'Operator',
        userRole: 'Wood (Beam Saw)',
        employeeId: 'EMP-WOOD-BEAM',
        designation: 'Beam Saw Operator',
        department: 'PRODUCTION',
        workflowRole: 'PRODUCTION_MANAGER'
    },
    {
        email: 'wood.edgebending@vlite.com',
        firstName: 'Edge Bending',
        lastName: 'Operator',
        userRole: 'Wood (Edge Bending)',
        employeeId: 'EMP-WOOD-EDGE',
        designation: 'Edge Bending Operator',
        department: 'PRODUCTION',
        workflowRole: 'PRODUCTION_MANAGER'
    },
    {
        email: 'wood.profiling@vlite.com',
        firstName: 'Profiling',
        lastName: 'Operator',
        userRole: 'Wood (Profiling)',
        employeeId: 'EMP-WOOD-PROF',
        designation: 'Profiling Operator',
        department: 'PRODUCTION',
        workflowRole: 'PRODUCTION_MANAGER'
    },
    {
        email: 'wood.grooming@vlite.com',
        firstName: 'Grooming',
        lastName: 'Operator',
        userRole: 'Wood (Grooming)',
        employeeId: 'EMP-WOOD-GROOM',
        designation: 'Grooming Operator',
        department: 'PRODUCTION',
        workflowRole: 'PRODUCTION_MANAGER'
    },
    {
        email: 'wood.boring@vlite.com',
        firstName: 'Boring Machine',
        lastName: 'Operator',
        userRole: 'Wood (Boring Machine)',
        employeeId: 'EMP-WOOD-BORE',
        designation: 'Boring Machine Operator',
        department: 'PRODUCTION',
        workflowRole: 'PRODUCTION_MANAGER'
    },
    {
        email: 'wood.finishing@vlite.com',
        firstName: 'Wood Finishing',
        lastName: 'Operator',
        userRole: 'Wood (Finishing)',
        employeeId: 'EMP-WOOD-FIN',
        designation: 'Wood Finishing Operator',
        department: 'PRODUCTION',
        workflowRole: 'PRODUCTION_MANAGER'
    },
    {
        email: 'wood.packaging@vlite.com',
        firstName: 'Wood Packaging',
        lastName: 'Operator',
        userRole: 'Wood (Packaging)',
        employeeId: 'EMP-WOOD-PACK',
        designation: 'Wood Packaging Operator',
        department: 'PRODUCTION',
        workflowRole: 'PRODUCTION_MANAGER'
    }
];

const createAllRoleUsers = async () => {
    try {
        await connectDB();

        console.log('🔍 Finding organization...');
        const vliteOrg = await Organization.findOne({ slug: 'vlite-furnitures' });

        if (!vliteOrg) {
            console.error('❌ Organization not found');
            process.exit(1);
        }

        // Find a default role for users
        const defaultRole = await Role.findOne({
            organizationId: vliteOrg._id
        });

        if (!defaultRole) {
            console.error('❌ No role found in organization');
            process.exit(1);
        }

        console.log('✅ Organization found:', vliteOrg.name);
        console.log('📝 Creating users with password: krishna123\n');

        const commonPassword = 'krishna123';
        const hashedPassword = await bcrypt.hash(commonPassword, 10);

        const createdUsers = [];
        const errors = [];

        for (const userData of roleUsers) {
            try {
                // Delete existing user if exists
                await User.deleteOne({
                    email: userData.email,
                    organizationId: vliteOrg._id
                });

                // Create user
                const newUser = await User.create({
                    ...userData,
                    password: hashedPassword,
                    plainPassword: commonPassword, // Store plain password for admin viewing
                    role: defaultRole._id,
                    organizationId: vliteOrg._id,
                    isActive: true,
                    status: 'ACTIVE',
                    dashboardPermissions: [
                        { dashboard: 'dashboard', accessLevel: 'view' },
                        { dashboard: 'inquiries', accessLevel: 'view' },
                        { dashboard: 'production', accessLevel: 'view' }
                    ]
                });

                createdUsers.push({
                    email: userData.email,
                    name: `${userData.firstName} ${userData.lastName}`,
                    role: userData.userRole
                });

                console.log(`✅ Created: ${userData.email} (${userData.userRole})`);
            } catch (error) {
                errors.push({
                    email: userData.email,
                    error: error.message
                });
                console.error(`❌ Failed to create ${userData.email}:`, error.message);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('📊 SUMMARY');
        console.log('='.repeat(80));
        console.log(`✅ Successfully created: ${createdUsers.length} users`);
        console.log(`❌ Failed: ${errors.length} users`);
        console.log(`🔑 Password for all accounts: ${commonPassword}`);
        console.log('='.repeat(80));

        if (createdUsers.length > 0) {
            console.log('\n📋 Created User Accounts:');
            console.log('-'.repeat(80));
            createdUsers.forEach((user, index) => {
                console.log(`${(index + 1).toString().padStart(2, '0')}. ${user.email.padEnd(30)} | ${user.role}`);
            });
        }

        if (errors.length > 0) {
            console.log('\n⚠️  Errors:');
            console.log('-'.repeat(80));
            errors.forEach((err, index) => {
                console.log(`${index + 1}. ${err.email}: ${err.error}`);
            });
        }

        console.log('\n' + '='.repeat(80));
        console.log('🎯 All users can login with their email and password: krishna123');
        console.log('='.repeat(80) + '\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

createAllRoleUsers();








