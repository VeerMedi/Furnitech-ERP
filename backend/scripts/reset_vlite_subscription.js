const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Define Organization Schema (Minimal)
const orgSchema = new mongoose.Schema({ email: String });
const Organization = mongoose.model('Organization', orgSchema);

// Define Subscription Schema (Minimal)
const subSchema = new mongoose.Schema({
    organizationId: mongoose.Schema.Types.ObjectId,
    plan: String,
    status: String,
    freeTokens: {
        aiReports: { total: Number, used: Number, remaining: Number },
        aiDemandForecasting: { total: Number, used: Number, remaining: Number },
        aiCustomerInsights: { total: Number, used: Number, remaining: Number }
    },
    purchasedTokens: {
        aiReports: { total: Number, used: Number, remaining: Number },
        aiDemandForecasting: { total: Number, used: Number, remaining: Number },
        aiCustomerInsights: { total: Number, used: Number, remaining: Number },
        purchaseHistory: []
    },
    paymentHistory: []
});
const Subscription = mongoose.model('Subscription', subSchema);

const resetSubscription = async () => {
    try {
        if (!process.env.MONGODB_URI) require('dotenv').config();

        console.log('🔌 Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vlite_furnitures');
        console.log('✅ Connected.');

        const email = 'admin@vlite.com';
        const org = await Organization.findOne({ email });

        if (!org) {
            console.error(`❌ Organization with email ${email} not found.`);
            process.exit(1);
        }

        console.log(`\n🎯 Target Organization: ${email} (ID: ${org._id})`);

        // Find Subscription
        let sub = await Subscription.findOne({ organizationId: org._id });

        if (!sub) {
            console.log('ℹ️ No subscription found. Creating a new empty/expired one for testing...');
            // Create a dummy expired subscription if needed or just exit
            console.log('❌ No existing subscription to reset.');
            process.exit(1);
        }

        console.log('🔄 Resetting Subscription and Tokens to 0...');

        // Reset Logic
        sub.status = 'expired';
        sub.plan = 'Free'; // or just keep it but expired
        sub.endDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday (Expired)

        // Reset Free Tokens to 0
        sub.freeTokens = {
            aiReports: { total: 0, used: 0, remaining: 0 },
            aiDemandForecasting: { total: 0, used: 0, remaining: 0 },
            aiCustomerInsights: { total: 0, used: 0, remaining: 0 }
        };

        // Reset Purchased Tokens to 0
        sub.purchasedTokens = {
            aiReports: { total: 0, used: 0, remaining: 0 },
            aiDemandForecasting: { total: 0, used: 0, remaining: 0 },
            aiCustomerInsights: { total: 0, used: 0, remaining: 0 },
            purchaseHistory: [] // Clear purchase history if you want total reset
        };

        // Clear Payment History too? Maybe keep it for record, but user said "0 kar do".
        // Usually "reset subscription" implies removing active entitlements.
        // Let's keep payment history (logs) but clear active tokens.
        // Or if you strictly mean "fresh start", I'll clear history too.
        // I'll clear history to be "0".
        sub.paymentHistory = [];

        await sub.save();

        console.log('✅ Subscription Reset Successful!');
        console.log('   - Status: Expired');
        console.log('   - Tokens: 0');
        console.log('   - History: Cleared');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

resetSubscription();
