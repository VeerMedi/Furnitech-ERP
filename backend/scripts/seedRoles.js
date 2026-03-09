require('dotenv').config();
const mongoose = require('mongoose');
const Role = require('../models/vlite/Role');
const Organization = require('../models/shared/Organization');
const connectDB = require('../config/database');

const defaultRoles = [
    {
        name: 'Admin',
        code: 'ADMIN',
        description: 'Full access to organization',
        level: 99,
        permissions: [
            { module: 'ALL', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT'] }
        ],
    },
    {
        name: 'Manager',
        code: 'MANAGER',
        description: 'Manage team and operations',
        level: 80,
        permissions: [
            { module: 'CRM', actions: ['CREATE', 'READ', 'UPDATE', 'EXPORT'] },
            { module: 'INVENTORY', actions: ['READ', 'UPDATE'] },
        ],
    },
    {
        name: 'Salesman',
        code: 'SALESMAN',
        description: 'Sales and customer management',
        level: 50,
        permissions: [
            { module: 'CRM', subModule: 'CUSTOMER', actions: ['READ', 'UPDATE'] },
            { module: 'CRM', subModule: 'INQUIRY', actions: ['CREATE', 'READ', 'UPDATE'] },
            { module: 'CRM', subModule: 'QUOTATION', actions: ['CREATE', 'READ'] },
        ],
    },
    {
        name: 'POC',
        code: 'POC',
        description: 'Point of Contact for customer assignments',
        level: 60,
        permissions: [
            { module: 'CRM', subModule: 'INQUIRY', actions: ['CREATE', 'READ', 'UPDATE'] },
            { module: 'CRM', subModule: 'CUSTOMER', actions: ['READ', 'UPDATE'] },
        ],
    },
    {
        name: 'Employee',
        code: 'EMPLOYEE',
        description: 'Basic employee access',
        level: 10,
        permissions: [
            { module: 'CRM', actions: ['READ'] },
        ],
    },
];

const seedRoles = async () => {
    try {
        await connectDB();

        // Get all organizations
        const organizations = await Organization.find({ isActive: true });

        if (organizations.length === 0) {
            console.log('\n❌ No active organizations found!');
            console.log('Please create an organization first.\n');
            process.exit(1);
        }

        console.log(`\n✅ Found ${organizations.length} organization(s)\n`);

        for (const org of organizations) {
            console.log(`📦 Processing organization: ${org.name} (${org._id})`);

            // Check existing roles
            const existingRoles = await Role.find({ organizationId: org._id });
            console.log(`   Current roles: ${existingRoles.length}`);

            // Create default roles if they don't exist
            let created = 0;
            for (const roleData of defaultRoles) {
                const exists = await Role.findOne({
                    organizationId: org._id,
                    code: roleData.code
                });

                if (!exists) {
                    await Role.create({
                        ...roleData,
                        organizationId: org._id
                    });
                    console.log(`   ✅ Created role: ${roleData.name}`);
                    created++;
                } else {
                    console.log(`   ⏭️  Role already exists: ${roleData.name}`);
                }
            }

            console.log(`   Total new roles created: ${created}\n`);
        }

        console.log('✅ Role seeding completed!\n');
        console.log('You can now create users in the application.\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding roles:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

seedRoles();
