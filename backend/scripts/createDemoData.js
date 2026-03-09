require('dotenv').config();
const mongoose = require('mongoose');
const Organization = require('../models/shared/Organization');
const SuperAdmin = require('../models/shared/SuperAdmin');
const connectDB = require('../config/database');
const { initializeTenantModels } = require('../utils/tenantDatabase');
const { seedTenantData } = require('../utils/seedTenantData');

const demoOrganizations = [
  {
    name: 'Vlite Furnitures',
    slug: 'vlite-furnitures',
    email: 'vlite@furniture.com',
    phone: '+91 9876543210',
    address: {
      street: '123 Furniture Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      zipCode: '400001',
    },
    subscriptionPlan: 'ENTERPRISE',
    adminUser: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@vlite.com',
      password: 'Vlite123!',
      phone: '+91 9876543210',
    },
  },
  {
    name: 'ABC Corporation',
    slug: 'abc-corporation',
    email: 'abc@corporation.com',
    phone: '+91 9876543211',
    address: {
      street: '456 Business Park',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      zipCode: '110001',
    },
    subscriptionPlan: 'PROFESSIONAL',
    adminUser: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@abc.com',
      password: 'Abc123!',
      phone: '+91 9876543211',
    },
  },
  {
    name: 'XYZ Limited',
    slug: 'xyz-limited',
    email: 'xyz@limited.com',
    phone: '+91 9876543212',
    address: {
      street: '789 Tech Avenue',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      zipCode: '560001',
    },
    subscriptionPlan: 'BASIC',
    adminUser: {
      firstName: 'Mike',
      lastName: 'Johnson',
      email: 'mike@xyz.com',
      password: 'Xyz123!',
      phone: '+91 9876543212',
    },
  },
];

const createDemoData = async () => {
  try {
    console.log('🎯 Multi-Tenant Demo Data Creator\n');

    // Connect to database
    await connectDB();

    // Check if super admin exists
    const superAdmin = await SuperAdmin.findOne({});
    if (!superAdmin) {
      console.log('⚠️  No super admin found!');
      console.log('   Please run: node scripts/createSuperAdmin.js first\n');
      process.exit(1);
    }

    console.log(`✅ Found super admin: ${superAdmin.email}\n`);

    // Create organizations
    console.log('Creating demo organizations...\n');

    for (const orgData of demoOrganizations) {
      try {
        // Check if organization already exists
        const existing = await Organization.findOne({
          $or: [{ email: orgData.email }, { slug: orgData.slug }],
        });

        if (existing) {
          console.log(`⏭️  Skipping "${orgData.name}" - already exists`);
          continue;
        }

        console.log(`📝 Creating: ${orgData.name}...`);

        // Create organization
        const organization = await Organization.create({
          ...orgData,
          subscriptionStatus: 'ACTIVE',
          subscriptionStartDate: Date.now(),
          subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          isActive: true,
          isVerified: true,
          verifiedAt: Date.now(),
          createdBy: superAdmin._id,
        });

        const dbName = organization.database.name;
        console.log(`   ✓ Organization created (ID: ${organization._id})`);
        console.log(`   ✓ Database name: ${dbName}`);

        // Initialize tenant database
        console.log(`   ⏳ Initializing database...`);
        await initializeTenantModels(dbName, organization._id);
        console.log(`   ✓ Database initialized`);

        // Seed data
        console.log(`   ⏳ Seeding initial data...`);
        const seedResult = await seedTenantData(dbName, organization._id, {});
        console.log(`   ✓ Data seeded: ${JSON.stringify(seedResult.data)}`);

        console.log(`   ✅ ${orgData.name} ready!\n`);
      } catch (error) {
        console.error(`   ❌ Error creating ${orgData.name}:`, error.message);
      }
    }

    console.log('\n✅ Demo data creation complete!\n');
    console.log('📊 Summary:');
    const orgs = await Organization.find({});
    console.log(`   Total Organizations: ${orgs.length}`);
    orgs.forEach((org) => {
      console.log(`   - ${org.name} (${org.subscriptionPlan})`);
      console.log(`     Email: ${org.adminUser.email}`);
      console.log(`     Database: ${org.database.name}`);
    });

    console.log('\n🎉 You can now login to these organizations:');
    demoOrganizations.forEach((org) => {
      console.log(`\n   ${org.name}:`);
      console.log(`   - Email: ${org.adminUser.email}`);
      console.log(`   - Password: ${org.adminUser.password}`);
    });

    console.log('\n💡 Next steps:');
    console.log('   1. Start frontend-org: npm run dev:org');
    console.log('   2. Open: http://localhost:5173/select-organization');
    console.log('   3. Select an organization and login!');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

createDemoData();
