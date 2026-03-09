require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/vlite/User');
const Organization = require('../models/shared/Organization');
const Feature = require('../models/shared/Feature');
const connectDB = require('../config/database');

const MOHIT_EMAIL = 'mohit@vlite.com';

const debugMohit = async () => {
    try {
        await connectDB();

        console.log('\n🔍 DEBUGGING MOHIT ACCOUNT\n');
        console.log('='.repeat(60));

        const mohit = await User.findOne({ email: MOHIT_EMAIL });
        if (!mohit) {
            console.log('User not found!');
            process.exit(1);
        }

        const org = await Organization.findById(mohit.organizationId).populate('enabledFeatures.featureId');

        console.log('\n📊 MOHIT USER DATA:');
        console.log('   Email:', mohit.email);
        console.log('   UserRole:', mohit.userRole);
        console.log('\n   Dashboard Permissions:');
        mohit.dashboardPermissions.forEach((dp, i) => {
            console.log(`      ${i + 1}. ${dp.dashboard} (${dp.accessLevel})`);
        });

        console.log('\n🏢 ORGANIZATION DATA:');
        console.log('   Name:', org.name);
        console.log('   Enabled Features:', org.enabledFeatures.length);

        console.log('\n📦 ENABLED FEATURE CODES:');
        const featureCodes = [];
        for (const ef of org.enabledFeatures) {
            if (ef.featureId) {
                const code = ef.featureId.code;
                featureCodes.push(code);
                console.log(`      - ${code}`);
            }
        }

        // Check if SALESMAN feature is enabled
        console.log('\n🎯 SALESMAN FEATURE CHECK:');
        if (featureCodes.includes('SALESMAN')) {
            console.log('   ✅ SALESMAN feature IS enabled');
        } else {
            console.log('   ❌ SALESMAN feature NOT enabled!');
            console.log('   🔧 FIXING NOW...');

            const feature = await Feature.findOne({ code: 'SALESMAN' });
            if (feature) {
                org.enabledFeatures.push({
                    featureId: feature._id,
                    enabled: true,
                    enabledAt: new Date(),
                    enabledBy: 'Debug Fix'
                });
                await org.save();
                console.log('   ✅ SALESMAN feature NOW enabled!');
                console.log('   ⚠️  MUST logout and login again!');
            } else {
                console.log('   ❌ SALESMAN feature not found in Feature collection!');
                console.log('   Run: node scripts/seedFeatures.js');
            }
        }

        console.log('\n' + '='.repeat(60) + '\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

debugMohit();
