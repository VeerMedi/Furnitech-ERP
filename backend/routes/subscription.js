const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { checkSubscription } = require('../middleware/subscriptionCheck');
const { authenticate, tenantContext } = require('../middleware/auth');

// Public routes (no auth required to view plans)
router.get('/plans', subscriptionController.getPricingPlans);

// Protected routes (require authentication)
// Note: Don't use checkSubscription middleware on these routes
// as we need to allow access even when subscription is expired

/**
 * @route   GET /api/subscription/status
 * @desc    Get current subscription status and token balances
 * @access  Private
 */
router.get('/status', authenticate, tenantContext, subscriptionController.getSubscriptionStatus);

/**
 * @route   POST /api/subscription/purchase
 * @desc    Purchase a new subscription plan
 * @access  Private (Admin only)
 */
router.post('/purchase', authenticate, tenantContext, subscriptionController.purchaseSubscription);

/**
 * @route   POST /api/subscription/purchase-tokens
 * @desc    Purchase additional AI tokens
 * @access  Private (Admin only)
 */
// Razorpay Order Creation
router.post('/create-order', authenticate, tenantContext, subscriptionController.createSubscriptionOrder);

// Razorpay Payment Verification
router.post('/verify-payment', authenticate, tenantContext, subscriptionController.verifySubscriptionPayment);

router.post('/create-token-order', authenticate, tenantContext, subscriptionController.createTokenOrder);
router.post('/verify-token-payment', authenticate, tenantContext, subscriptionController.verifyTokenPayment);

/**
 * @route   GET /api/subscription/token-usage
 * @desc    Get token usage history
 * @access  Private
 */
router.get('/token-usage', authenticate, subscriptionController.getTokenUsage);

/**
 * @route   GET /api/subscription/payment-history
 * @desc    Get payment history
 * @access  Private
 */
router.get('/payment-history', authenticate, subscriptionController.getPaymentHistory);

/**
 * @route   DELETE /api/subscription/reset
 * @desc    Reset subscription for testing
 * @access  Public (Test Only)
 */
router.delete('/reset', subscriptionController.resetSubscription);

module.exports = router;
