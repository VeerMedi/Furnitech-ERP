/**
 * Check All Organizations and Raw Materials
 * Shows data across all organizations in the database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const RawMaterial = require('../models/vlite/RawMaterial');
const Organization = require('../models/shared/Organization');

const checkAllData = async () => {
    try {
        await connectDB();

        // Get all organizations
        const organizations = await Organization.find({});
        console.log(`📊 Total Organizations: ${organizations.length}\n`);

        if (organizations.length === 0) {
            console.log('❌ No organizations found.');
            process.exit(1);
        }

        // Check raw materials for each organization
        for (const org of organizations) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🏢 Organization: ${org.name}`);
            console.log(`   ID: ${org._id}`);
            console.log(`   Slug: ${org.slug}`);
            console.log(`   Status: ${org.subscriptionStatus}`);

            const materialCount = await RawMaterial.countDocuments({ organizationId: org._id });
            console.log(`   📦 Raw Materials: ${materialCount}`);

            if (materialCount > 0) {
                // Get category breakdown
                const categories = await RawMaterial.aggregate([
                    { $match: { organizationId: org._id } },
                    { $group: { _id: '$category', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]);

                console.log(`\n   Category Breakdown:`);
                categories.forEach(cat => {
                    console.log(`     ${cat._id}: ${cat.count} items`);
                });
            }
        }

        // Check for materials without organizationId
        const orphanedMaterials = await RawMaterial.countDocuments({ organizationId: { $exists: false } });
        if (orphanedMaterials > 0) {
            console.log(`\n⚠️  Found ${orphanedMaterials} raw materials without organizationId!`);
        }

        // Check for materials with null organizationId
        const nullOrgMaterials = await RawMaterial.countDocuments({ organizationId: null });
        if (nullOrgMaterials > 0) {
            console.log(`⚠️  Found ${nullOrgMaterials} raw materials with null organizationId!`);
        }

        console.log(`\n${'='.repeat(60)}\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkAllData();
