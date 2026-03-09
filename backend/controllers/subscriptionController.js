const Subscription = require('../models/shared/Subscription');
const Organization = require('../models/shared/Organization');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Helper: Get Razorpay Instance
const getRazorpayInstance = () => {
    // Check if simulation mode is forced via .env
    if (process.env.RAZORPAY_SIMULATION_MODE === 'true') return null;

    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        return new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return null;
};

/**
 * Get current subscription status
 * GET /api/subscription/status
 */
exports.getSubscriptionStatus = async (req, res) => {
    try {

        let organizationId = req.user?.organizationId || req.organizationId;

        // TEMP: Fallback for testing without auth
        if (!organizationId) {
            console.log('⚠️ Status Check: No auth user, finding organization from database...');
            const User = require('../models/vlite/User');
            const testUser = await User.findOne({
                $or: [
                    { email: 'admin@vlite.com' },
                    { userRole: 'Admin' }
                ]
            });

            if (testUser && testUser.organizationId) {
                organizationId = testUser.organizationId;
                console.log('✅ TEST MODE: Status check using org:', organizationId);
            }
        }

        // Sanitize Organization ID
        let orgIdToQuery = organizationId;
        if (typeof organizationId === 'object') orgIdToQuery = organizationId.toString();

        if (typeof orgIdToQuery === 'string' && orgIdToQuery.includes('ObjectId')) {
            const match = orgIdToQuery.match(/ObjectId\(['"](.+)['"]\)/);
            if (match) orgIdToQuery = match[1];
            else orgIdToQuery = orgIdToQuery.replace(/new ObjectId\(['"]?/g, '').replace(/['"]?\)/g, '');
        }

        let subscription = await Subscription.findOne({ organizationId: orgIdToQuery });

        if (!subscription) {
            // FALLBACK: In Single Tenant Mode, try to find by Config ID
            const vliteConfig = require('../config/vlite.config');
            if (vliteConfig.organizationId) {
                subscription = await Subscription.findOne({ organizationId: vliteConfig.organizationId });
            }
        }

        if (!subscription) {
            return res.status(200).json({
                success: true,
                hasSubscription: false,
                message: 'No subscription found',
            });
        }

        // Check if expired
        const now = new Date();
        const isExpired = now > subscription.endDate || subscription.status === 'expired';

        // Calculate days remaining
        const daysRemaining = Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24));

        res.status(200).json({
            success: true,
            hasSubscription: true,
            subscription: {
                plan: subscription.plan,
                planPrice: subscription.planPrice,
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                status: isExpired ? 'expired' : subscription.status,
                isActive: subscription.isActive(),
                daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
                autoRenew: subscription.autoRenew,
            },
            tokens: {
                aiReports: {
                    purchased: subscription.purchasedTokens.aiReports,
                    free: subscription.freeTokens.aiReports,
                    total: subscription.getTotalTokens('aiReports'),
                },
                aiDemandForecasting: {
                    purchased: subscription.purchasedTokens.aiDemandForecasting,
                    free: subscription.freeTokens.aiDemandForecasting,
                    total: subscription.getTotalTokens('aiDemandForecasting'),
                },
                aiCustomerInsights: {
                    purchased: subscription.purchasedTokens.aiCustomerInsights,
                    free: subscription.freeTokens.aiCustomerInsights,
                    total: subscription.getTotalTokens('aiCustomerInsights'),
                },
            },
        });

    } catch (error) {
        console.error('Get subscription status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching subscription status',
            error: error.message,
        });
    }
};

// Helper: Activate Plan (Shared logic)
const activatePlanInternal = async (organizationId, plan, transactionId, paymentMethod) => {
    // Check if subscription already exists
    let subscription = await Subscription.findOne({ organizationId });

    if (subscription) {
        // Renew existing subscription
        const planConfig = {
            '1-month': { price: 15000, tokens: 1000, months: 1 },
            '3-months': { price: 45000, tokens: 3000, months: 3 },
            '6-months': { price: 90000, tokens: 6000, months: 6 },
        };

        const config = planConfig[plan];

        // Check if currently active to stack days and tokens
        // Explicitly check status to avoid method issues
        const isExpired = subscription.status === 'expired' || new Date() > subscription.endDate;
        const isActive = !isExpired && subscription.isActive();

        console.log(`[Renew] Plan: ${plan}, Status: ${subscription.status}, Expired: ${isExpired}, Active: ${isActive}`);

        // DEBUG LOGGING FILE
        try {
            const fs = require('fs');
            const path = require('path');
            const logPath = path.join(__dirname, '../debug_subscription.log');
            const debugLog = `\n[${new Date().toISOString()}] Renew Attempt\nSubID: ${subscription._id}\nStatus: ${subscription.status}\nEndDate: ${subscription.endDate}\nIsActive: ${isActive}\nTokensBefore: ${JSON.stringify(subscription.freeTokens || {})}\n`;
            fs.appendFileSync(logPath, debugLog);
        } catch (e) { console.error('Log Error', e); }

        const now = new Date();

        let newEndDate = new Date();
        let newStartDate = new Date();

        if (isActive) {
            // Stack Duration: Add new months to existing end date
            newEndDate = new Date(subscription.endDate);
            newEndDate.setMonth(newEndDate.getMonth() + config.months);
            newStartDate = subscription.startDate; // Keep original start
        } else {
            // New Period: Start from now
            newEndDate = new Date(now);
            newEndDate.setMonth(now.getMonth() + config.months);
            newStartDate = now;
        }

        subscription.plan = plan;
        subscription.planPrice = config.price;
        subscription.startDate = newStartDate;
        subscription.endDate = newEndDate;
        subscription.status = 'active';

        // Always Reset FREE tokens to plan limit (Do NOT Stack Free Tokens)
        // Stacking logic only applies to Purchased Tokens (which are separate)
        subscription.freeTokens = {
            aiReports: { total: config.tokens, used: 0, remaining: config.tokens },
            aiDemandForecasting: { total: config.tokens, used: 0, remaining: config.tokens },
            aiCustomerInsights: { total: config.tokens, used: 0, remaining: config.tokens },
        };

        // Add payment record
        subscription.paymentHistory.push({
            amount: config.price,
            plan,
            type: 'subscription',
            paymentDate: new Date(),
            transactionId: transactionId || `MOCK-${Date.now()}`,
            paymentMethod: paymentMethod || 'gateway',
            paymentStatus: 'success',
        });

        // Reset expiry notifications
        subscription.expiryNotificationSent = {
            sevenDays: false,
            threeDays: false,
            oneDay: false,
        };

        await subscription.save();
    } else {
        // Create new subscription
        subscription = await Subscription.createFromPlan(
            organizationId,
            plan,
            transactionId || `MOCK-${Date.now()}`,
            paymentMethod || 'gateway'
        );
    }

    return subscription;
};

/**
 * Create/Purchase new subscription
 * POST /api/subscription/purchase
 */
exports.purchaseSubscription = async (req, res) => {
    try {
        const { plan, transactionId, paymentMethod } = req.body;

        // Get organizationId from authenticated user
        let organizationId;

        if (req.organization && req.organization._id) {
            organizationId = req.organization._id;
            console.log('✅ OrganizationId from req.organization:', organizationId);
        } else if (req.user && req.user.organizationId) {
            organizationId = req.user.organizationId;
            console.log('✅ OrganizationId from req.user:', organizationId);
        } else {
            // TEMP: For testing without auth, find any organization
            console.log('⚠️ No auth user, finding organization from database...');
            const User = require('../models/vlite/User');
            // Try to find the specific admin user being used or any admin
            const testUser = await User.findOne({
                $or: [
                    { email: 'admin@vlite.com' },
                    { userRole: 'Admin' }
                ]
            });

            if (testUser && testUser.organizationId) {
                organizationId = testUser.organizationId;
                console.log('✅ TEST MODE: Using organizationId from database:', organizationId);
            } else {
                console.error('❌ No organizationId found anywhere!');
                return res.status(400).json({
                    success: false,
                    message: 'Organization ID not found. Please login or create an organization first.',
                });
            }
        }

        if (!plan || !['1-month', '3-months', '6-months'].includes(plan)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan selected',
            });
        }

        console.log('📦 Purchasing subscription for org:', organizationId, 'plan:', plan);

        // Check if subscription already exists
        let subscription = await Subscription.findOne({ organizationId });

        if (subscription && subscription.isActive()) {
            console.log('ℹ️ Existing active subscription found. Updating plan...');
            // return res.status(400).json({
            //     success: false,
            //     message: 'You already have an active subscription',
            //     currentSubscription: {
            //         plan: subscription.plan,
            //         endDate: subscription.endDate,
            //     },
            // });
        }

        // Create new subscription or update existing
        if (subscription) {
            // Renew existing subscription
            const planConfig = {
                '1-month': { price: 15000, tokens: 1000, months: 1 },
                '3-months': { price: 45000, tokens: 3000, months: 3 },
                '6-months': { price: 90000, tokens: 6000, months: 6 },
            };

            const config = planConfig[plan];

            // Explicitly verify status for Date Stacking
            const isExpired = subscription.status === 'expired' || new Date() > subscription.endDate;
            const isActive = !isExpired && subscription.isActive();
            const now = new Date();

            if (isActive) {
                // Stack Duration: Add new months to existing end date for accurate calendar calculation
                newEndDate = new Date(subscription.endDate);
                newEndDate.setMonth(newEndDate.getMonth() + config.months);
                newStartDate = subscription.startDate; // Keep original start
            } else {
                // New Period: Start from now
                newEndDate = new Date(now);
                newEndDate.setMonth(now.getMonth() + config.months);
                newStartDate = now;
            }

            subscription.plan = plan;
            subscription.planPrice = config.price;
            subscription.startDate = newStartDate;
            subscription.endDate = newEndDate;
            subscription.status = 'active';

            // Always Reset FREE tokens to plan limit (Do NOT Stack Free Tokens)
            subscription.freeTokens = {
                aiReports: { total: config.tokens, used: 0, remaining: config.tokens },
                aiDemandForecasting: { total: config.tokens, used: 0, remaining: config.tokens },
                aiCustomerInsights: { total: config.tokens, used: 0, remaining: config.tokens },
            };

            // Add payment record
            subscription.paymentHistory.push({
                amount: config.price,
                plan,
                type: 'subscription',
                paymentDate: new Date(),
                transactionId,
                paymentMethod,
                paymentStatus: 'success',
            });

            // Reset expiry notifications
            subscription.expiryNotificationSent = {
                sevenDays: false,
                threeDays: false,
                oneDay: false,
            };

            await subscription.save();

        } else {
            // Create new subscription
            subscription = await Subscription.createFromPlan(
                organizationId,
                plan,
                transactionId,
                paymentMethod
            );
        }

        res.status(201).json({
            success: true,
            message: 'Subscription purchased successfully',
            subscription: {
                plan: subscription.plan,
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                status: subscription.status,
            },
            tokens: {
                aiReports: subscription.freeTokens.aiReports,
                aiDemandForecasting: subscription.freeTokens.aiDemandForecasting,
                aiCustomerInsights: subscription.freeTokens.aiCustomerInsights,
            },
        });

    } catch (error) {
        console.error('Purchase subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Error purchasing subscription',
            error: error.message,
        });
    }
};

/**
 * Create Razorpay Order for Token Pack
 * POST /api/subscription/create-token-order
 */
exports.createTokenOrder = async (req, res) => {
    try {
        const { type, feature } = req.body;
        // type: 'bundle' | 'single'

        const razorpay = getRazorpayInstance();

        // If Sim Mode
        if (!razorpay) {
            return res.json({
                success: true,
                simulationMode: true,
                message: 'Simulation Mode: Direct activation enabled'
            });
        }

        let amountInPaise = 0;

        if (type === 'bundle') {
            amountInPaise = 899 * 100; // ₹899
        } else if (type === 'single') {
            if (!feature || !['aiReports', 'aiDemandForecasting', 'aiCustomerInsights'].includes(feature)) {
                return res.status(400).json({ success: false, message: 'Invalid feature selected' });
            }
            amountInPaise = 299 * 100; // ₹299
        } else {
            return res.status(400).json({ success: false, message: 'Invalid purchase type' });
        }

        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `tkn_${Date.now()}`,
            notes: { type, feature },
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error('Create Token Order Error:', error);
        res.status(500).json({ success: false, message: 'Could not initiate payment' });
    }
};

/**
 * Verify Token Payment & Add Tokens
 * POST /api/subscription/verify-token-payment
 */
exports.verifyTokenPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            type,
            feature
        } = req.body;

        let organizationId = req.user?.organizationId || req.organizationId;

        // Fallback for testing
        if (!organizationId) {
            const User = require('../models/vlite/User');
            const testUser = await User.findOne({ $or: [{ email: 'admin@vlite.com' }, { userRole: 'Admin' }] });
            if (testUser?.organizationId) organizationId = testUser.organizationId;
        }

        // Verify Signature
        if (process.env.RAZORPAY_SIMULATION_MODE !== 'true') {
            const generated_signature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(razorpay_order_id + '|' + razorpay_payment_id)
                .digest('hex');

            if (generated_signature !== razorpay_signature) {
                return res.status(400).json({ success: false, message: 'Payment verification failed' });
            }
        }

        // Add Tokens Logic
        const subscription = await Subscription.findOne({ organizationId });
        if (!subscription) return res.status(404).json({ success: false, message: 'Subscription not found' });

        let amount = type === 'bundle' ? 899 : 299;
        let specificFeature = type === 'single' ? feature : null;

        await subscription.addPurchasedTokens(amount, razorpay_payment_id, 'razorpay', specificFeature);

        res.status(200).json({
            success: true,
            message: 'Tokens purchased successfully',
            tokensAdded: specificFeature ? { [specificFeature]: 1000 } : {
                aiReports: 1000,
                aiDemandForecasting: 1000,
                aiCustomerInsights: 1000,
            },
        });

    } catch (error) {
        console.error('Verify Token Payment Error:', error);
        res.status(500).json({ success: false, message: 'Verification failed' });
    }
};

/**
 * Get token usage history
 * GET /api/subscription/token-usage
 */
exports.getTokenUsage = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || req.organizationId;
        const { feature, limit = 50 } = req.query;

        const subscription = await Subscription.findOne({ organizationId })
            .populate('tokenUsageHistory.userId', 'firstName lastName email');

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'No subscription found',
            });
        }

        let usageHistory = subscription.tokenUsageHistory;

        // Filter by feature if specified
        if (feature) {
            usageHistory = usageHistory.filter(h => h.feature === feature);
        }

        // Sort by timestamp desc and limit
        usageHistory = usageHistory
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, parseInt(limit));

        res.status(200).json({
            success: true,
            usageHistory,
            totalRecords: subscription.tokenUsageHistory.length,
        });

    } catch (error) {
        console.error('Get token usage error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching token usage',
            error: error.message,
        });
    }
};

/**
 * Get payment history
 * GET /api/subscription/payment-history
 */
exports.getPaymentHistory = async (req, res) => {
    try {
        const organizationId = req.user?.organizationId || req.organizationId;

        const subscription = await Subscription.findOne({ organizationId });

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'No subscription found',
            });
        }

        // Combine subscription payments and token purchases
        const allPayments = [
            ...subscription.paymentHistory,
            ...subscription.purchasedTokens.purchaseHistory.map(p => ({
                ...p,
                type: 'tokens',
            })),
        ].sort((a, b) => b.paymentDate - a.paymentDate);

        res.status(200).json({
            success: true,
            paymentHistory: allPayments,
        });

    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payment history',
            error: error.message,
        });
    }
};

/**
 * Get pricing plans
 * GET /api/subscription/plans
 */
exports.getPricingPlans = async (req, res) => {
    try {
        const plans = [
            {
                id: '1-month',
                name: 'Starter',
                duration: '1 Month',
                price: 15000,
                tokens: {
                    aiReports: 1000,
                    aiDemandForecasting: 1000,
                    aiCustomerInsights: 1000,
                },
                features: [
                    'Full Dashboard Access',
                    '1000 AI Tokens per Feature',
                    'AI Reports & Analytics',
                    'AI Demand Forecasting',
                    'AI Customer Insights',
                    'Email Support',
                ],
            },
            {
                id: '3-months',
                name: 'Professional',
                duration: '3 Months',
                price: 45000,
                tokens: {
                    aiReports: 3000,
                    aiDemandForecasting: 3000,
                    aiCustomerInsights: 3000,
                },
                features: [
                    'Full Dashboard Access',
                    '3000 AI Tokens per Feature',
                    'AI Reports & Analytics',
                    'AI Demand Forecasting',
                    'AI Customer Insights',
                    'Priority Email Support',
                    'Save ₹0 (No discount)',
                ],
                recommended: true,
            },
            {
                id: '6-months',
                name: 'Enterprise',
                duration: '6 Months',
                price: 90000,
                tokens: {
                    aiReports: 6000,
                    aiDemandForecasting: 6000,
                    aiCustomerInsights: 6000,
                },
                features: [
                    'Full Dashboard Access',
                    '6000 AI Tokens per Feature',
                    'AI Reports & Analytics',
                    'AI Demand Forecasting',
                    'AI Customer Insights',
                    'Priority Support',
                    'Dedicated Account Manager',
                ],
            },
        ];

        const tokenPackage = {
            id: 'token-pack',
            name: 'AI Token Pack',
            price: 499,
            tokens: {
                aiReports: 1000,
                aiDemandForecasting: 1000,
                aiCustomerInsights: 1000,
            },
            description: 'Add 1000 tokens to each AI feature',
        };

        res.status(200).json({
            success: true,
            plans,
            tokenPackage,
        });

    } catch (error) {
        console.error('Get pricing plans error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pricing plans',
            error: error.message,
        });
    }
};

/**
 * RESET SUBSCRIPTION (FOR TESTING)
 * DELETE /api/subscription/reset
 */
exports.resetSubscription = async (req, res) => {
    try {
        console.log('🔄 Resetting subscription...');
        const User = require('../models/vlite/User');

        // Find Test User
        const testUser = await User.findOne({
            $or: [
                { email: 'admin@vlite.com' },
                { userRole: 'Admin' }
            ]
        });

        if (!testUser || !testUser.organizationId) {
            return res.status(404).json({ success: false, message: 'Test admin/org not found' });
        }

        const organizationId = testUser.organizationId;

        // Delete Subscription
        const result = await Subscription.deleteOne({ organizationId });

        if (result.deletedCount > 0) {
            console.log('✅ Subscription deleted for org:', organizationId);
            return res.status(200).json({ success: true, message: 'Subscription deleted successfully' });
        } else {
            console.log('ℹ️ No subscription found to delete');
            return res.status(200).json({ success: true, message: 'No subscription found to delete' });
        }
    } catch (error) {
        console.error('Reset error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Create Razorpay Order
 * POST /api/subscription/create-order
 */
exports.createSubscriptionOrder = async (req, res) => {
    try {
        const { plan } = req.body;
        const razorpay = getRazorpayInstance();

        // If no Razorpay keys (Sim Mode), tell frontend to skip payment
        if (!razorpay) {
            return res.json({
                success: true,
                simulationMode: true,
                message: 'Simulation Mode: Direct activation enabled'
            });
        }

        const planConfig = {
            '1-month': 15000 * 100, // Amount in paise
            '3-months': 45000 * 100,
            '6-months': 90000 * 100,
        };

        if (!planConfig[plan]) {
            return res.status(400).json({ success: false, message: 'Invalid plan' });
        }

        const options = {
            amount: planConfig[plan],
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`,
            notes: { plan },
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error('Razorpay Create Order Error:', error);
        res.status(500).json({ success: false, message: 'Payment initiation failed' });
    }
};

/**
 * Verify Razorpay Payment & Activate
 * POST /api/subscription/verify-payment
 */
exports.verifySubscriptionPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
        let organizationId = req.user?.organizationId || req.organizationId;

        // Fallback for testing
        if (!organizationId) {
            const User = require('../models/vlite/User');
            const testUser = await User.findOne({ $or: [{ email: 'admin@vlite.com' }, { userRole: 'Admin' }] });
            if (testUser?.organizationId) organizationId = testUser.organizationId;
            else return res.status(400).json({ success: false, message: 'Organization ID not found' });
        }

        // Verify Signature
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }

        // Activate Plan
        const subscription = await activatePlanInternal(organizationId, plan, razorpay_payment_id, 'razorpay');

        res.json({
            success: true,
            message: 'Payment Verified & Plan Activated',
            subscription
        });

    } catch (error) {
        console.error('Payment Verification Error:', error);
        res.status(500).json({ success: false, message: 'Verification failed' });
    }
};
