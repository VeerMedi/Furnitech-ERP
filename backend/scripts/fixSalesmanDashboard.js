require('dotenv').config();
const mongoose = require('mongoose');
const Organization = require('../models/shared/Organization');
const Feature = require('../models/shared/Feature');
const connectDB = require('../config/database');

const fixSalesmanDashboard = async () => {
    try {
        await connectDB();

        console.log('\n🔧 AUTO-FIX: Enabling SALESMAN Dashboard\n');
        console.log('='.repeat(50));

        // Get all organizations
        const organizations = await Organization.find({ isActive: true });

        console.log(`\n✅ Found ${organizations.length} organization(s)\n`);

        // Get SALESMAN feature
        const salesmanFeature = await Feature.findOne({ code: 'SALESMAN' });

        if (!salesmanFeature) {
            console.log('❌ SALESMAN feature not found!');
            console.log('   Run: node scripts/seedFeatures.js');
            process.exit(1);
        }

        console.log(`✅ SALESMAN feature found: ${salesmanFeature.name}\n`);

        // Get other important features
        const featureCodes = ['SALESMAN', 'POC_ASSIGNMENT', 'INQUIRIES', 'QUOTATIONS', 'CUSTOMERS', 'ORDERS'];
        const features = await Feature.find({ code: { $in: featureCodes } });

        console.log(`📦 Enabling ${features.length} features for all organizations...\n`);

        for (const org of organizations) {
            console.log(`Organization: ${org.name}`);

            let updated = false;

            for (const feature of features) {
                const isEnabled = org.enabledFeatures?.some(
                    ef => ef.featureId && ef.featureId.toString() === feature._id.toString()
                );

                if (!isEnabled) {
                    if (!org.enabledFeatures) org.enabledFeatures = [];

                    org.enabledFeatures.push({
                        featureId: feature._id,
                        enabled: true,
                        enabledAt: new Date(),
                        enabledBy: 'Auto-Fix Script'
                    });

                    console.log(`   ✅ Enabled: ${feature.code}`);
                    updated = true;
                }
            }

            if (updated) {
                await org.save();
                console.log(`   💾 Saved changes`);
            } else {
                console.log(`   ✓ Already enabled`);
            }

            console.log('');
        }

        console.log('='.repeat(50));
        console.log('\n✅ FIX COMPLETE!\n');
        console.log('📝 Next Steps:');
        console.log('   1. Logout from your account');
        console.log('   2. Login again with Salesman credentials');
        console.log('   3. Salesman Dashboard should now be visible!\n');
        console.log('   URL: http://localhost:5174\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

fixSalesmanDashboard();
