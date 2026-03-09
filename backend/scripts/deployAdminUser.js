
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/database');
const User = require('../models/vlite/User');
const Role = require('../models/vlite/Role');
const Organization = require('../models/shared/Organization');

const deployAdminUser = async () => {
    try {
        await connectDB();
        console.log('✅ Connected to MongoDB');

        console.log('🔍 Finding organization...');
        const vliteOrg = await Organization.findOne({ slug: 'vlite-furnitures' });

        if (!vliteOrg) {
            console.error('❌ Organization "vlite-furnitures" not found! Please seed organizations first.');
            // List all orgs
            const orgs = await Organization.find({});
            console.log('Available Organizations:', orgs.map(o => ({ id: o._id, slug: o.slug, name: o.name })));
            process.exit(1);
        }
        console.log(`✅ Found Organization: ${vliteOrg.name} (${vliteOrg._id})`);

        console.log('🔍 Finding Roles...');
        // We need a valid role for the 'role' field. Using MANAGER as existing admin setup pattern
        const adminRole = await Role.findOne({
            code: 'MANAGER',
            organizationId: vliteOrg._id
        });

        if (!adminRole) {
            console.error(`❌ "MANAGER" role not found for Org ID ${vliteOrg._id}!`);
            const roles = await Role.find({ organizationId: vliteOrg._id });
            console.log('Available Roles for this Org:', roles.map(r => ({ code: r.code, name: r.name, id: r._id })));
            process.exit(1);
        }

        const email = 'admin@vlite.com';
        const rawPassword = 'admin@1234';

        console.log(`🔍 Checking for existing user: ${email}...`);
        const existingUser = await User.findOne({
            email: email,
            organizationId: vliteOrg._id
        });

        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const userData = {
            firstName: 'System',
            lastName: 'Admin',
            email: email,
            password: hashedPassword,
            plainPassword: rawPassword, // Optional, but useful for debug/admin view based on schema
            phone: '+919999999999',
            employeeId: 'ADM-001',
            designation: 'System Administrator',
            department: 'MANAGEMENT',
            workflowRole: 'ADMIN', // Matches enum in schema
            role: adminRole._id, // Required field
            roles: ['SALES_HEAD', 'QUOTATION_MANAGER', 'PRODUCTION_MANAGER', 'INVENTORY_MANAGER', 'ACCOUNTS'], // Give broad access via roles enum
            userRole: 'Admin', // Matches enum in schema
            organizationId: vliteOrg._id,
            isActive: true,
            status: 'ACTIVE',
            isSystemAdmin: true,
            dashboardPermissions: [
                { dashboard: 'customers', accessLevel: 'edit' },
                { dashboard: 'crm', accessLevel: 'edit' },
                { dashboard: 'products', accessLevel: 'edit' },
                { dashboard: 'inquiries', accessLevel: 'edit' },
                { dashboard: 'quotations', accessLevel: 'edit' },
                { dashboard: 'orders', accessLevel: 'edit' },
                { dashboard: 'drawings', accessLevel: 'edit' },
                { dashboard: 'machines', accessLevel: 'edit' },
                { dashboard: 'production', accessLevel: 'edit' },
                { dashboard: 'transport', accessLevel: 'edit' },
                { dashboard: 'vendors', accessLevel: 'edit' },
                { dashboard: 'management', accessLevel: 'edit' },
                { dashboard: 'users', accessLevel: 'edit' },
                { dashboard: 'raw-material', accessLevel: 'edit' },
                { dashboard: 'inventory-management', accessLevel: 'edit' }
            ]
        };

        if (existingUser) {
            console.log('✏️  User exists. Updating credentials and permissions...');
            Object.assign(existingUser, userData);
            // Mongoose pre-save middleware might re-hash if we just set password directly unless we handle it carefully.
            // But we already hashed it. Let's see. 
            // The schema says: if (!this.isModified('password')) return next();
            // Assigning userData.password (which is already hashed) might be re-hashed if we are not careful OR 
            // the pre-save hook will hash it again if we simply set it.

            // Actually, the pre-save hook hashes `this.password`. 
            // If I pass the ALREADY HASHED password to the document, the pre-save hook will hash the HASH.
            // So for update, it's safer to set the RAW password and let the pre-save hook hash it in `user.save()`.
            // BUT, `User.create` does the hashing.

            // Let's reset the password field to raw for the update logic to be correct with the pre-save hook.
            existingUser.password = rawPassword;

            // Wait, if I use `Object.assign`, I am overwriting fields.
            // Let's do it explicitly.
            existingUser.firstName = userData.firstName;
            existingUser.lastName = userData.lastName;
            existingUser.phone = userData.phone;
            existingUser.designation = userData.designation;
            existingUser.department = userData.department;
            existingUser.workflowRole = userData.workflowRole;
            existingUser.role = userData.role;
            existingUser.roles = userData.roles;
            existingUser.userRole = userData.userRole;
            existingUser.isActive = userData.isActive;
            existingUser.status = userData.status;
            existingUser.isSystemAdmin = userData.isSystemAdmin;
            existingUser.plainPassword = userData.plainPassword;
            existingUser.dashboardPermissions = userData.dashboardPermissions;

            // Update password
            existingUser.password = rawPassword; // The pre-save hook will detect this modification and hash it.

            await existingUser.save();
            console.log('✅ User updated successfully!');
        } else {
            console.log('🆕 Creating new user...');
            // For create, we can pass rawPassword and the pre-save hook will hash it.
            // So we should NOT use the hashed variable from line 43.
            userData.password = rawPassword;

            await User.create(userData);
            console.log('✅ User created successfully!');
        }

        console.log('\n📋 Admin User Details:');
        console.log('─────────────────────────────────────');
        console.log(`  Email: ${email}`);
        console.log(`  Password: ${rawPassword}`);
        console.log(`  Role: Admin`);
        console.log('─────────────────────────────────────\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

deployAdminUser();
