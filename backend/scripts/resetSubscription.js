require('dotenv').config();
const mongoose = require('mongoose');
const Subscription = require('../models/shared/Subscription');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    });

const resetTokensOnly = async () => {
    try {
        console.log('🔄 Resetting TOKENS (Free & Purchased) to 0...');

        const subscription = await Subscription.findOne({});

        if (!subscription) {
            console.log('❌ No subscription found.');
            process.exit(0);
        }

        console.log(`Found subscription for Org: ${subscription.organizationId}`);

        // Ensure Plan is ACTIVE
        subscription.status = 'active';

        // Ensure End Date is in the future
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        subscription.endDate = futureDate;

        // Reset FREE tokens
        if (subscription.freeTokens) {
            ['aiReports', 'aiDemandForecasting', 'aiCustomerInsights'].forEach(feature => {
                if (subscription.freeTokens[feature]) {
                    subscription.freeTokens[feature].remaining = 0;
                    subscription.freeTokens[feature].used = 0;
                    // Keeping 'total' as is? Or reset to 0? User asked to "token 0 krodo".
                    // Usually total implies what was allocated. Remaining is what is available.
                    // I will set remaining to 0. Effectively user has 0 tokens to use.
                }
            });
        }

        // Reset PURCHASED tokens
        if (subscription.purchasedTokens) {
            ['aiReports', 'aiDemandForecasting', 'aiCustomerInsights'].forEach(feature => {
                if (subscription.purchasedTokens[feature]) {
                    subscription.purchasedTokens[feature].remaining = 0;
                    subscription.purchasedTokens[feature].used = 0;
                }
            });
        }

        // Save changes
        // Important: Mongoose might not detect changes in nested objects if we don't mark modified
        subscription.markModified('freeTokens');
        subscription.markModified('purchasedTokens');

        await subscription.save();

        console.log('✅ Tokens (Available) reset to 0.');
        console.log('✅ Plan status set to ACTIVE.');
        console.log(`✅ New EndDate: ${subscription.endDate}`);
        console.log(`✅ Free AI Reports Remaining: ${subscription.freeTokens?.aiReports?.remaining}`);
        console.log(`✅ Purchased AI Reports Remaining: ${subscription.purchasedTokens?.aiReports?.remaining}`);

    } catch (error) {
        console.error('❌ Error resetting tokens:', error);
    } finally {
        mongoose.connection.close();
        process.exit(0);
    }
};

// Run the function
resetTokensOnly();
