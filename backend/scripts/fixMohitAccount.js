require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/vlite/User');
const Organization = require('../models/shared/Organization');
const Feature = require('../models/shared/Feature');
const connectDB = require('../config/database');

const MOHIT_EMAIL = 'mohit@vlite.com';

const fixMohitAccount = async () => {
    try {
        await connectDB();

        console.log('\n🔧 FIXING MOHIT SALESMAN ACCOUNT\n');
        console.log('='.repeat(60));

        // Step 1: Find Mohit user
        console.log('\n📋 Step 1: Finding Mohit user...\n');
        const mohit = await User.findOne({ email: MOHIT_EMAIL, isDeleted: false });

        if (!mohit) {
            console.log(`❌ User ${MOHIT_EMAIL} not found!`);
            process.exit(1);
        }

        console.log(`✅ Found user: ${mohit.firstName} ${mohit.lastName}`);
        console.log(`   Email: ${mohit.email}`);
        console.log(`   Organization ID: ${mohit.organizationId}`);
        console.log(`   User Role: ${mohit.userRole}`);
        console.log(`   Current Dashboard Permissions: ${JSON.stringify(mohit.dashboardPermissions, null, 2)}\n`);

        // Step 2: Fix userRole
        console.log('👤 Step 2: Fixing User Role...\n');

        if (mohit.userRole !== 'Salesman') {
            mohit.userRole = 'Salesman';
            console.log('   ✅ Set userRole to: Salesman');
        } else {
            console.log('   ✓ UserRole already correct: Salesman');
        }

        // Step 3: Fix dashboard permissions
        console.log('\n📊 Step 3: Fixing Dashboard Permissions...\n');

        const requiredDashboards = [
            { dashboard: 'salesman-dashboard', accessLevel: 'edit' },
            { dashboard: 'quotations', accessLevel: 'edit' },
            { dashboard: 'orders', accessLevel: 'view' },
            { dashboard: 'customers', accessLevel: 'view' },
            { dashboard: 'inquiries', accessLevel: 'edit' }
        ];

        mohit.dashboardPermissions = requiredDashboards;
        console.log('   ✅ Set dashboard permissions to:');
        requiredDashboards.forEach(dp => {
            console.log(`      - ${dp.dashboard} (${dp.accessLevel})`);
        });

        await mohit.save();
        console.log('\n   💾 User saved!\n');

        // Step 4: Enable organization features
        console.log('🏢 Step 4: Enabling Organization Features...\n');

        const org = await Organization.findById(mohit.organizationId);
        console.log(`   Organization: ${org.name}`);

        const featuresToEnable = ['SALESMAN', 'POC_ASSIGNMENT', 'INQUIRIES', 'QUOTATIONS', 'CUSTOMERS', 'ORDERS'];

        for (const featureCode of featuresToEnable) {
            const feature = await Feature.findOne({ code: featureCode });
            if (!feature) {
                console.log(`   ⚠️  Feature ${featureCode} not found in database`);
                continue;
            }

            const isEnabled = org.enabledFeatures?.some(
                ef => ef.featureId && ef.featureId.toString() === feature._id.toString()
            );

            if (!isEnabled) {
                if (!org.enabledFeatures) org.enabledFeatures = [];

                org.enabledFeatures.push({
                    featureId: feature._id,
                    enabled: true,
                    enabledAt: new Date(),
                    enabledBy: 'Fix Script'
                });

                console.log(`   ✅ Enabled: ${featureCode}`);
            } else {
                console.log(`   ✓ Already enabled: ${featureCode}`);
            }
        }

        await org.save();
        console.log('\n   💾 Organization saved!\n');

        // Final verification
        console.log('='.repeat(60));
        console.log('\n✅ FIX COMPLETE!\n');
        console.log('📝 Summary:');
        console.log(`   User: ${mohit.email}`);
        console.log(`   Role: ${mohit.userRole}`);
        console.log(`   Dashboards: ${mohit.dashboardPermissions.length}`);
        mohit.dashboardPermissions.forEach((dp, i) => {
            console.log(`      ${i + 1}. ${dp.dashboard} (${dp.accessLevel})`);
        });

        console.log('\n🎯 Next Steps:');
        console.log('   1. Complete LOGOUT from browser');
        console.log('   2. Clear browser cache (Ctrl+Shift+Delete)');
        console.log('   3. LOGIN again with: mohit@vlite.com');
        console.log('   4. Check sidebar - Salesman Dashboard should appear!');
        console.log('\n   Expected dashboards in sidebar:');
        console.log('      - Salesman Dashboard ⭐');
        console.log('      - Quotations');
        console.log('      - Orders');
        console.log('      - Customers');
        console.log('      - Inquiries\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

fixMohitAccount();
