const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const Subscription = require('../models/shared/Subscription');
const vliteConfig = require('../config/vlite.config');

const ORG_ID = vliteConfig.organizationId;

async function resetSubscription() {
    try {
        console.log('🚀 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        console.log('🔍 Finding Subscription for Org:', ORG_ID);
        const sub = await Subscription.findOne({ organizationId: ORG_ID });

        if (!sub) {
            console.log('❌ No subscription found.');
            process.exit(1);
        }

        console.log('🔄 Resetting Subscription...');

        // Expire Membership
        sub.status = 'expired';
        sub.endDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
        sub.isActive = false; // Note: Schema might not have this field if it's a method

        // Reset Purchased Tokens
        ['aiReports', 'aiDemandForecasting', 'aiCustomerInsights'].forEach(feature => {
            if (sub.purchasedTokens[feature]) {
                sub.purchasedTokens[feature].total = 0;
                sub.purchasedTokens[feature].used = 0;
                sub.purchasedTokens[feature].remaining = 0;
            }
            // Reset Free Tokens too (in case of manual reset)
            if (sub.freeTokens[feature]) {
                sub.freeTokens[feature].total = 0;
                sub.freeTokens[feature].used = 0;
                sub.freeTokens[feature].remaining = 0;
            }
        });

        await sub.save();
        console.log('✅ Subscription Expired & Tokens Reset to 0.');
        console.log('📅 New End Date:', sub.endDate);

        process.exit(0);

    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

resetSubscription();
