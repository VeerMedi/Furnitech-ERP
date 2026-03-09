/**
 * Smart Automation API Index
 * Main router configuration for all automation endpoints
 */

const express = require('express');
const automationRoutes = require('./automation_routes');
const recommendationRoutes = require('./recommendation_routes');
const mockDataRoutes = require('./mock_data_routes');

const router = express.Router();

// Mount sub-routers
router.use('/automation', automationRoutes);
router.use('/recommendation', recommendationRoutes);
router.use('/mock', mockDataRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Automation Engine is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
