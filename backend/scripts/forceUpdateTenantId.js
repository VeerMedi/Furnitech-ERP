require('dotenv').config();
const mongoose = require('mongoose');

const forceUpdateTenantId = async () => {
    try {
        console.log('🚀 Force Updating TenantId (Direct MongoDB)...\n');

        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vlite';
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB\n');

        const db = mongoose.connection.db;

        // Get organization
        const Organization = require('../models/shared/Organization');
        let org = await Organization.findOne({});

        if (!org) {
            org = await Organization.create({
                name: 'Vlite Furnitures',
                email: 'info@vlitefurnitures.com',
                phone: '1234567890',
                address: 'Default Address',
                isActive: true
            });
            console.log('✅ Created organization:', org.name);
        } else {
            console.log('✅ Found organization:', org.name);
        }

        const tenantId = org._id.toString();
        console.log('📌 Using TenantId:', tenantId);
        console.log('');

        // Collections to update (direct MongoDB)
        const collections = [
            'customers',
            'products',
            'orders',
            'leads',
            'quotations',
            'machines',
            'users',
            'rawmaterials',
            'drawings',
            'inventoryitems'
        ];

        console.log('📊 Updating Collections:\n');
        let totalUpdated = 0;

        for (const collectionName of collections) {
            try {
                const collection = db.collection(collectionName);

                // Check if collection exists
                const count = await collection.countDocuments({});
                if (count === 0) {
                    console.log(`  ⊘ ${collectionName.padEnd(20)} - Empty (0 documents)`);
                    continue;
                }

                // Update documents without tenantId
                const result = await collection.updateMany(
                    {
                        $or: [
                            { tenantId: { $exists: false } },
                            { tenantId: null },
                            { tenantId: '' }
                        ]
                    },
                    {
                        $set: { tenantId: tenantId }
                    }
                );

                totalUpdated += result.modifiedCount;
                console.log(`  ✅ ${collectionName.padEnd(20)} - Updated ${result.modifiedCount}/${count} documents`);

            } catch (error) {
                console.log(`  ⚠️  ${collectionName.padEnd(20)} - Error: ${error.message}`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`✅ Migration Complete!`);
        console.log(`📊 Total documents updated: ${totalUpdated}`);
        console.log(`📌 TenantId: ${tenantId}`);
        console.log('='.repeat(60));

        await mongoose.connection.close();

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

forceUpdateTenantId();
