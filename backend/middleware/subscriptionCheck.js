const Subscription = require('../models/shared/Subscription');

/**
 * Middleware to check if organization has an active subscription
 * Blocks all dashboard access if subscription is expired
 */
const checkSubscription = async (req, res, next) => {
    try {
        // Bypass subscription check for admin accounts
        const isAdminAccount = req.user?.email === 'admin@vlite.com' ||
            req.user?.email === 'jasleen@vlite.com' ||
            req.user?.email?.toLowerCase().includes('jasleen') ||
            req.user?.userRole === 'Admin';

        if (isAdminAccount) {
            console.log('✅ Admin account - bypassing subscription check');
            return next();
        }

        // Get organizationId from user or request
        const organizationId = req.user?.organizationId || req.organizationId;

        if (!organizationId) {
            return res.status(403).json({
                success: false,
                message: 'Organization not found',
                subscriptionRequired: true,
            });
        }

        // Find subscription
        const subscription = await Subscription.findOne({ organizationId });

        // No subscription found
        if (!subscription) {
            return res.status(403).json({
                success: false,
                message: 'No active subscription found. Please subscribe to continue.',
                subscriptionRequired: true,
                subscriptionStatus: 'none',
            });
        }

        // Check if expired
        const now = new Date();
        if (subscription.status === 'expired' || now > subscription.endDate) {
            // Update status to expired
            if (subscription.status !== 'expired') {
                subscription.status = 'expired';
                await subscription.save();
            }

            return res.status(403).json({
                success: false,
                message: 'Your subscription has expired. Please renew to continue.',
                subscriptionRequired: true,
                subscriptionStatus: 'expired',
                expiryDate: subscription.endDate,
            });
        }

        // Check if cancelled
        if (subscription.status === 'cancelled') {
            return res.status(403).json({
                success: false,
                message: 'Your subscription has been cancelled. Please contact support.',
                subscriptionRequired: true,
                subscriptionStatus: 'cancelled',
            });
        }

        // Subscription is active - attach to request
        req.subscription = subscription;
        next();

    } catch (error) {
        console.error('Subscription check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking subscription status',
            error: error.message,
        });
    }
};

/**
 * Middleware to check if sufficient AI tokens are available
 * Only checks, doesn't consume
 */
const checkAITokens = (feature) => {
    return async (req, res, next) => {
        try {
            const subscription = req.subscription;

            if (!subscription) {
                return res.status(403).json({
                    success: false,
                    message: 'No subscription found',
                    tokensRequired: true,
                });
            }

            // Check if has tokens
            if (!subscription.hasTokens(feature)) {
                const totalTokens = subscription.getTotalTokens(feature);

                return res.status(403).json({
                    success: false,
                    message: `Insufficient AI tokens for ${feature}`,
                    tokensRequired: true,
                    feature,
                    availableTokens: totalTokens,
                    purchasedTokens: subscription.purchasedTokens[feature]?.remaining || 0,
                    freeTokens: subscription.freeTokens[feature]?.remaining || 0,
                });
            }

            // Has tokens - proceed
            next();

        } catch (error) {
            console.error('Token check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error checking token availability',
                error: error.message,
            });
        }
    };
};

/**
 * Middleware to consume AI tokens
 * Use this in AI endpoint routes
 */
const consumeAITokens = (feature, amount = 1) => {
    return async (req, res, next) => {
        try {
            const subscription = req.subscription;
            const userId = req.user?._id;
            const messageContent = req.body?.message || req.body?.query || '';

            if (!subscription) {
                return res.status(403).json({
                    success: false,
                    message: 'No subscription found',
                });
            }

            // Consume tokens
            const result = await subscription.consumeTokens(
                feature,
                amount,
                userId,
                `AI ${feature} request`,
                messageContent
            );

            // Attach result to request
            req.tokenConsumption = result;

            next();

        } catch (error) {
            if (error.message === 'Insufficient tokens') {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient tokens. Please purchase more tokens to continue.',
                    tokensRequired: true,
                    feature,
                });
            }

            console.error('Token consumption error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error consuming tokens',
                error: error.message,
            });
        }
    };
};

module.exports = {
    checkSubscription,
    checkAITokens,
    consumeAITokens,
};
