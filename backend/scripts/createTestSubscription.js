/**
 * Script to find and create test subscription
 * Works with vlite User schema
 */

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vlite_erp');
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
};

// User schema (simplified)
const userSchema = new mongoose.Schema({
    email: String,
    firstName: String,
    lastName: String,
    organizationId: mongoose.Schema.Types.ObjectId,
    userRole: String,
}, { strict: false });

const User = mongoose.model('User', userSchema);

// Subscription Schema
const subscriptionSchema = new mongoose.Schema({
    organizationId: mongoose.Schema.Types.ObjectId,
    plan: String,
    planPrice: Number,
    startDate: Date,
    endDate: Date,
    status: String,
    freeTokens: Object,
    purchasedTokens: Object,
    tokenUsageHistory: Array,
    paymentHistory: Array,
    autoRenew: Boolean,
    expiryNotificationSent: Object,
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

const createTestSubscription = async () => {
    await connectDB();

    try {
        console.log('\n🔍 Looking for users...\n');

        // Find admin user
        const user = await User.findOne({
            $or: [
                { userRole: 'Admin' },
                { email: { $regex: /admin/i } }
            ]
        }).sort({ createdAt: -1 });

        if (!user) {
            console.log('❌ No users found in database!');
            console.log('💡 Please create a user first by logging in.');

            // Try to find ANY user
            const anyUser = await User.findOne().sort({ createdAt: -1 });
            if (anyUser) {
                console.log(`\n📋 Found user: ${anyUser.email}`);
                console.log(`   Using this user's organizationId: ${anyUser.organizationId}\n`);
            } else {
                process.exit(1);
            }
        }

        const orgId = user.organizationId || new mongoose.Types.ObjectId();

        console.log(`📋 Found user: ${user.email || user.firstName}`);
        console.log(`   Role: ${user.userRole || 'Unknown'}`);
        console.log(`   Organization ID: ${orgId}\n`);

        // Check if subscription already exists
        let subscription = await Subscription.findOne({ organizationId: orgId });

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30); // 30 days from now

        if (subscription) {
            console.log('⚠️  Subscription already exists! Updating...\n');

            subscription.plan = '1-month';
            subscription.planPrice = 15000;
            subscription.startDate = startDate;
            subscription.endDate = endDate;
            subscription.status = 'active';

            subscription.freeTokens = {
                aiReports: { total: 1000, used: 0, remaining: 1000 },
                aiDemandForecasting: { total: 1000, used: 0, remaining: 1000 },
                aiCustomerInsights: { total: 1000, used: 0, remaining: 1000 },
            };

            subscription.purchasedTokens = {
                aiReports: { total: 0, used: 0, remaining: 0 },
                aiDemandForecasting: { total: 0, used: 0, remaining: 0 },
                aiCustomerInsights: { total: 0, used: 0, remaining: 0 },
                purchaseHistory: [],
            };

            subscription.tokenUsageHistory = [];
            subscription.autoRenew = false;
            subscription.expiryNotificationSent = {
                sevenDays: false,
                threeDays: false,
                oneDay: false,
            };

            await subscription.save();
            console.log('✅ Subscription updated to ACTIVE!\n');
        } else {
            console.log('📝 Creating new subscription...\n');

            subscription = await Subscription.create({
                organizationId: orgId,
                plan: '1-month',
                planPrice: 15000,
                startDate: startDate,
                endDate: endDate,
                status: 'active',
                freeTokens: {
                    aiReports: { total: 1000, used: 0, remaining: 1000 },
                    aiDemandForecasting: { total: 1000, used: 0, remaining: 1000 },
                    aiCustomerInsights: { total: 1000, used: 0, remaining: 1000 },
                },
                purchasedTokens: {
                    aiReports: { total: 0, used: 0, remaining: 0 },
                    aiDemandForecasting: { total: 0, used: 0, remaining: 0 },
                    aiCustomerInsights: { total: 0, used: 0, remaining: 0 },
                    purchaseHistory: [],
                },
                tokenUsageHistory: [],
                paymentHistory: [{
                    amount: 15000,
                    plan: '1-month',
                    type: 'subscription',
                    paymentDate: new Date(),
                    transactionId: 'TEST_' + Date.now(),
                    paymentMethod: 'test',
                    paymentStatus: 'success',
                }],
                autoRenew: false,
                expiryNotificationSent: {
                    sevenDays: false,
                    threeDays: false,
                    oneDay: false,
                },
            });

            console.log('✅ Subscription created successfully!\n');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 SUBSCRIPTION DETAILS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   Plan: ${subscription.plan}`);
        console.log(`   Price: ₹${subscription.planPrice.toLocaleString()}`);
        console.log(`   Status: ${subscription.status.toUpperCase()}`);
        console.log(`   Start: ${subscription.startDate.toLocaleDateString()}`);
        console.log(`   Expires: ${subscription.endDate.toLocaleDateString()}`);
        console.log(`   Days Left: ${Math.ceil((subscription.endDate - new Date()) / (1000 * 60 * 60 * 24))}`);

        console.log('\n📊 FREE TOKENS (From Plan):');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('   🤖 AI Reports & Analytics: 1000');
        console.log('   📈 AI Demand Forecasting: 1000');
        console.log('   👥 AI Customer Insights: 1000');

        console.log('\n💳 PURCHASED TOKENS:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('   Currently: 0 (Buy using /pricing page)');

        console.log('\n🎉 READY TO TEST!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('   ✅ 1. Refresh: http://localhost:5174/dashboard');
        console.log('   ✅ 2. Check subscription status (should be GREEN)');
        console.log('   ✅ 3. Check token balances (1000 each)');
        console.log('   ✅ 4. Visit: http://localhost:5174/pricing');
        console.log('   ✅ 5. Try buying more tokens (Admin only)\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
};

createTestSubscription();
