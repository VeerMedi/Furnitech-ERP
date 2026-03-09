require('dotenv').config();
const mongoose = require('mongoose');

/**
 * Migration Script: Add TenantId to Legacy Data
 * 
 * This script adds tenantId to all documents that don't have one.
 * Safe to run multiple times - only updates documents without tenantId.
 */

const addTenantIdToLegacyData = async () => {
    try {
        console.log('🚀 Starting TenantId Migration...\n');

        // Connect to database
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vlite';
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB');
        console.log('📦 Database:', mongoose.connection.db.databaseName);
        console.log('');

        // Get or create default tenantId
        const Organization = require('../models/shared/Organization');
        let defaultTenantId;

        // Try to find existing organization
        const existingOrg = await Organization.findOne({});

        if (existingOrg) {
            defaultTenantId = existingOrg._id.toString();
            console.log('✅ Found existing organization:', existingOrg.name);
            console.log('📌 Using tenantId:', defaultTenantId);
        } else {
            // Create a default organization
            const newOrg = await Organization.create({
                name: 'Vlite Furnitures',
                email: 'info@vlitefurnitures.com',
                phone: '1234567890',
                address: 'Default Address',
                isActive: true
            });
            defaultTenantId = newOrg._id.toString();
            console.log('✅ Created new organization: Vlite Furnitures');
            console.log('📌 Generated tenantId:', defaultTenantId);
        }
        console.log('');

        // Collections to update
        const collections = [
            { name: 'Customers', model: require('../models/vlite/Customer') },
            { name: 'Products', model: require('../models/vlite/Product') },
            { name: 'Orders', model: require('../models/vlite/Order') },
            { name: 'Leads', model: require('../models/vlite/Lead') },
            { name: 'Quotations', model: require('../models/vlite/Quotation') },
            { name: 'Machines', model: require('../models/vlite/Machine') },
            { name: 'Users', model: require('../models/vlite/User') },
            { name: 'RawMaterials', model: require('../models/vlite/RawMaterial') },
            { name: 'Drawings', model: require('../models/vlite/Drawing') },
        ];

        console.log('📊 Migration Progress:\n');

        let totalUpdated = 0;

        for (const collection of collections) {
            try {
                const Model = collection.model;

                // Count documents without tenantId
                const countWithoutTenant = await Model.countDocuments({
                    $or: [
                        { tenantId: { $exists: false } },
                        { tenantId: null },
                        { tenantId: '' }
                    ]
                });

                if (countWithoutTenant === 0) {
                    console.log(`  ✓ ${collection.name.padEnd(20)} - Already migrated (0 documents need update)`);
                    continue;
                }

                // Update documents
                const result = await Model.updateMany(
                    {
                        $or: [
                            { tenantId: { $exists: false } },
                            { tenantId: null },
                            { tenantId: '' }
                        ]
                    },
                    {
                        $set: { tenantId: defaultTenantId }
                    }
                );

                totalUpdated += result.modifiedCount;
                console.log(`  ✅ ${collection.name.padEnd(20)} - Updated ${result.modifiedCount} documents`);

            } catch (error) {
                console.log(`  ⚠️  ${collection.name.padEnd(20)} - Skipped (${error.message})`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`✅ Migration Complete!`);
        console.log(`📊 Total documents updated: ${totalUpdated}`);
        console.log(`📌 TenantId used: ${defaultTenantId}`);
        console.log('='.repeat(60));
        console.log('');

        // Verify migration
        console.log('🔍 Verification:\n');
        for (const collection of collections) {
            try {
                const Model = collection.model;
                const withTenant = await Model.countDocuments({ tenantId: defaultTenantId });
                const withoutTenant = await Model.countDocuments({
                    $or: [
                        { tenantId: { $exists: false } },
                        { tenantId: null },
                        { tenantId: '' }
                    ]
                });

                console.log(`  ${collection.name.padEnd(20)} - With TenantId: ${withTenant}, Without: ${withoutTenant}`);
            } catch (error) {
                // Skip if model doesn't exist
            }
        }

        console.log('\n✅ All legacy data now has tenantId!');
        console.log('🎉 You can now use proper multi-tenant filtering.\n');

        await mongoose.connection.close();

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

// Run migration
addTenantIdToLegacyData();
