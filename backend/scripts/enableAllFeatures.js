require('dotenv').config();
const mongoose = require('mongoose');
const Organization = require('../models/shared/Organization');
const Feature = require('../models/shared/Feature');
const connectDB = require('../config/database');

const enableAllFeaturesForAllOrgs = async () => {
    try {
        await connectDB();

        console.log('\n🔍 Finding all organizations...\n');

        // Get ALL organizations
        const organizations = await Organization.find({});

        if (organizations.length === 0) {
            console.log('❌ No organizations found!');
            process.exit(1);
        }

        console.log(`✅ Found ${organizations.length} organization(s):\n`);

        organizations.forEach((org, index) => {
            console.log(`${index + 1}. ${org.name}`);
            console.log(`   ID: ${org._id}`);
            console.log(`   Active: ${org.isActive}`);
            console.log(`   Current features: ${org.enabledFeatures?.length || 0}\n`);
        });

        // Get all available features
        const allFeatures = await Feature.find({ isActive: true });
        console.log(`📦 Found ${allFeatures.length} available features\n`);

        if (allFeatures.length === 0) {
            console.log('❌ No features found! Run: node scripts/seedFeatures.js first');
            process.exit(1);
        }

        console.log('🚀 Enabling ALL features for ALL organizations...\n');

        // Enable all features for each organization
        for (const org of organizations) {
            const enabledFeatures = allFeatures.map(feature => ({
                featureId: feature._id,
                enabled: true,
                enabledAt: new Date(),
                enabledBy: 'System Auto-Enable'
            }));

            org.enabledFeatures = enabledFeatures;
            await org.save();

            console.log(`✅ Enabled ${allFeatures.length} features for: ${org.name}`);
        }

        console.log('\n🎉 Done! Enabled features:');
        allFeatures.forEach((feature, index) => {
            console.log(`   ${index + 1}. ${feature.name} (${feature.code})`);
        });

        console.log('\n✨ Now logout and login again to see all dashboards!\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

enableAllFeaturesForAllOrgs();
