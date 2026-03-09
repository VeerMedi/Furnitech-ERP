const express = require('express');
const router = express.Router();
const { getDashboardStats, getAllDashboards, getCardHistory } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { checkSubscription } = require('../middleware/subscriptionCheck');

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private (Requires active subscription)
router.get('/stats', authenticate, checkSubscription, getDashboardStats);

// @route   GET /api/dashboard/list
// @desc    Get all dashboards
// @access  Private
router.get('/list', authenticate, getAllDashboards);

// @route   GET /api/dashboard/card-history/:cardType
// @desc    Get 12-month historical data for a card
// @access  Private
router.get('/card-history/:cardType', authenticate, getCardHistory);

module.exports = router;
