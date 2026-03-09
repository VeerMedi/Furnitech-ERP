const mongoose = require('mongoose');

/**
 * Subscription Model
 * Manages organization subscriptions with AI token allocation
 */
const subscriptionSchema = new mongoose.Schema({
    // Organization reference
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        unique: true,
    },

    // Subscription Details
    plan: {
        type: String,
        enum: ['1-month', '3-months', '6-months'],
        required: true,
    },
    planPrice: {
        type: Number,
        required: true,
        enum: [15000, 45000, 90000],
    },
    startDate: {
        type: Date,
        required: true,
        default: Date.now,
    },
    endDate: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'cancelled'],
        default: 'active',
    },

    // Free Tokens (from subscription plan)
    freeTokens: {
        aiReports: {
            total: { type: Number, default: 0 },
            used: { type: Number, default: 0 },
            remaining: { type: Number, default: 0 },
        },
        aiDemandForecasting: {
            total: { type: Number, default: 0 },
            used: { type: Number, default: 0 },
            remaining: { type: Number, default: 0 },
        },
        aiCustomerInsights: {
            total: { type: Number, default: 0 },
            used: { type: Number, default: 0 },
            remaining: { type: Number, default: 0 },
        },
    },

    // Purchased Tokens (separately bought for ₹499)
    purchasedTokens: {
        aiReports: {
            total: { type: Number, default: 0 },
            used: { type: Number, default: 0 },
            remaining: { type: Number, default: 0 },
        },
        aiDemandForecasting: {
            total: { type: Number, default: 0 },
            used: { type: Number, default: 0 },
            remaining: { type: Number, default: 0 },
        },
        aiCustomerInsights: {
            total: { type: Number, default: 0 },
            used: { type: Number, default: 0 },
            remaining: { type: Number, default: 0 },
        },
        purchaseHistory: [{
            amount: { type: Number, required: true },
            tokensAdded: { type: Number, required: true }, // 1000 per feature
            purchaseDate: { type: Date, default: Date.now },
            transactionId: String,
            paymentMethod: String,
        }],
    },

    // Token Usage History
    tokenUsageHistory: [{
        feature: {
            type: String,
            enum: ['aiReports', 'aiDemandForecasting', 'aiCustomerInsights'],
            required: true,
        },
        tokenType: {
            type: String,
            enum: ['purchased', 'free'],
            required: true,
        },
        tokensUsed: { type: Number, required: true, default: 1 },
        timestamp: { type: Date, default: Date.now },
        // Changed to String to support 'hardcoded-admin-system' and real Type.ObjectId
        userId: { type: String },
        description: String,
        messageContent: String, // Store what message was sent
    }],

    // Payment History
    paymentHistory: [{
        amount: { type: Number, required: true },
        plan: String,
        type: {
            type: String,
            enum: ['subscription', 'tokens'],
            required: true,
        },
        paymentDate: { type: Date, default: Date.now },
        transactionId: String,
        paymentMethod: String,
        paymentStatus: {
            type: String,
            enum: ['success', 'pending', 'failed'],
            default: 'success',
        },
    }],

    // Auto-renewal settings
    autoRenew: {
        type: Boolean,
        default: false,
    },

    // Notifications
    expiryNotificationSent: {
        sevenDays: { type: Boolean, default: false },
        threeDays: { type: Boolean, default: false },
        oneDay: { type: Boolean, default: false },
    },

}, {
    timestamps: true,
});

// Indexes
// subscriptionSchema.index({ organizationId: 1 }); // Redundant: 'unique: true' above creates this index automatically
subscriptionSchema.index({ status: 1, endDate: 1 });

// Method to check if subscription is active
subscriptionSchema.methods.isActive = function () {
    return this.status === 'active' && new Date() < this.endDate;
};

// Method to check if has sufficient tokens for a feature
subscriptionSchema.methods.hasTokens = function (feature) {
    const purchased = this.purchasedTokens[feature]?.remaining || 0;
    const free = this.freeTokens[feature]?.remaining || 0;
    return (purchased + free) > 0;
};

// Method to get total available tokens for a feature
subscriptionSchema.methods.getTotalTokens = function (feature) {
    const purchased = this.purchasedTokens[feature]?.remaining || 0;
    const free = this.freeTokens[feature]?.remaining || 0;
    return purchased + free;
};

// Method to consume tokens (priority: purchased first, then free)
subscriptionSchema.methods.consumeTokens = async function (feature, amount = 1, userId, description, messageContent) {
    const purchased = this.purchasedTokens[feature];
    const free = this.freeTokens[feature];

    let tokenType = '';

    // Use purchased tokens first
    if (purchased.remaining >= amount) {
        purchased.used += amount;
        purchased.remaining -= amount;
        tokenType = 'purchased';
    }
    // Then use free tokens
    else if (free.remaining >= amount) {
        free.used += amount;
        free.remaining -= amount;
        tokenType = 'free';
    }
    // Not enough tokens in either
    else {
        throw new Error('Insufficient tokens');
    }

    // Log usage
    this.tokenUsageHistory.push({
        feature,
        tokenType,
        tokensUsed: amount,
        timestamp: new Date(),
        userId,
        description,
        messageContent,
    });

    await this.save();
    return { success: true, tokenType, remaining: this.getTotalTokens(feature) };
};

// Method to add purchased tokens
subscriptionSchema.methods.addPurchasedTokens = async function (amount, transactionId, paymentMethod, specificFeature = null) {
    const tokensPerFeature = 1000;

    if (specificFeature) {
        // Add only to specific feature
        if (!this.purchasedTokens[specificFeature]) {
            throw new Error('Invalid feature specified for token purchase');
        }
        this.purchasedTokens[specificFeature].total += tokensPerFeature;
        this.purchasedTokens[specificFeature].remaining += tokensPerFeature;
    } else {
        // Add to all three features (Bundle)
        ['aiReports', 'aiDemandForecasting', 'aiCustomerInsights'].forEach(feature => {
            this.purchasedTokens[feature].total += tokensPerFeature;
            this.purchasedTokens[feature].remaining += tokensPerFeature;
        });
    }

    // Record purchase
    this.purchasedTokens.purchaseHistory.push({
        amount,
        tokensAdded: tokensPerFeature,
        purchaseDate: new Date(),
        transactionId,
        paymentMethod,
        description: specificFeature ? `Boost: ${specificFeature}` : 'Bundle: All AI Features'
    });

    // Add to payment history
    this.paymentHistory.push({
        amount,
        type: 'tokens',
        paymentDate: new Date(),
        transactionId,
        paymentMethod,
        paymentStatus: 'success',
        description: specificFeature ? `Token Boost (${specificFeature})` : 'Token Bundle (All)'
    });

    await this.save();
    return true;
};

// Static method to create subscription from plan
subscriptionSchema.statics.createFromPlan = async function (organizationId, plan, transactionId, paymentMethod) {
    const planConfig = {
        '1-month': { price: 15000, tokens: 1000, months: 1 },
        '3-months': { price: 45000, tokens: 3000, months: 3 },
        '6-months': { price: 90000, tokens: 6000, months: 6 },
    };

    const config = planConfig[plan];
    if (!config) throw new Error('Invalid plan');

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + config.months);

    const subscription = new this({
        organizationId,
        plan,
        planPrice: config.price,
        startDate,
        endDate,
        status: 'active',
        freeTokens: {
            aiReports: { total: config.tokens, used: 0, remaining: config.tokens },
            aiDemandForecasting: { total: config.tokens, used: 0, remaining: config.tokens },
            aiCustomerInsights: { total: config.tokens, used: 0, remaining: config.tokens },
        },
        purchasedTokens: {
            aiReports: { total: 0, used: 0, remaining: 0 },
            aiDemandForecasting: { total: 0, used: 0, remaining: 0 },
            aiCustomerInsights: { total: 0, used: 0, remaining: 0 },
            purchaseHistory: [],
        },
        paymentHistory: [{
            amount: config.price,
            plan,
            type: 'subscription',
            paymentDate: new Date(),
            transactionId,
            paymentMethod,
            paymentStatus: 'success',
        }],
    });

    await subscription.save();
    return subscription;
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
