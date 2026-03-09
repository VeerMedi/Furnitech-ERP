const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const Subscription = require('../models/shared/Subscription');
const vliteConfig = require('../config/vlite.config');

const ORG_ID = vliteConfig.organizationId;

async function deleteSubscription() {
    try {
        console.log('🚀 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        console.log('🔍 Deleting Subscription for Org:', ORG_ID);
        const result = await Subscription.deleteOne({ organizationId: ORG_ID });

        if (result.deletedCount > 0) {
            console.log('✅ Subscription DELETED from Database.');
        } else {
            console.log('⚠️ No subscription found to delete.');
        }

        process.exit(0);

    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

deleteSubscription();
