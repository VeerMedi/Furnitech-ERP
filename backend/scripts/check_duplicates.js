const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const Subscription = require('../models/shared/Subscription');
const vliteConfig = require('../config/vlite.config');

const TARGET_ORG_ID = vliteConfig.organizationId;

async function checkDuplicates() {
    try {
        console.log('🚀 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const subs = await Subscription.find({ organizationId: TARGET_ORG_ID });
        console.log(`📋 Found ${subs.length} subscriptions for Org ${TARGET_ORG_ID}:`);

        subs.forEach((sub, index) => {
            console.log(`\n--- Subscription ${index + 1} ---`);
            console.log('ID:', sub._id);
            console.log('Status:', sub.status);
            console.log('EndDate:', sub.endDate);
            console.log('Tokens (Reports):', sub.freeTokens?.aiReports?.total);
            console.log('Created:', sub.createdAt);
            console.log('Updated:', sub.updatedAt);
        });

        if (subs.length > 1) {
            console.log('\n⚠️ DUPLICATES FOUND! Verify which one is active.');
        } else {
            console.log('\n✅ No duplicates found.');
        }

        process.exit(0);

    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

checkDuplicates();
