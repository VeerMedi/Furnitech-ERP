/**
 * AI Support API Routes
 * Handles support queries and consulting requests
 */

const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const { getPythonCommand } = require('../utils/pythonCommand');

const { authenticate, tenantContext } = require('../middleware/auth');
const Subscription = require('../models/shared/Subscription');

// Python bridge for AI support
const pythonBridge = path.join(__dirname, '../../AI/ai_support/support_bridge.py');

/**
 * POST /api/ai/support/query
 * Main chat endpoint
 */
router.post('/query', authenticate, tenantContext, async (req, res) => {
  try {
    console.log('📨 AI Support Query received:', JSON.stringify(req.body));
    const { user_id, role, message, question } = req.body;

    // Accept both 'message' and 'question' for compatibility
    const userMessage = message || question;

    if (!userMessage) {
      console.log('❌ Message is missing or empty');
      return res.status(400).json({
        success: false,
        error: 'message or question is required'
      });
    }

    // --- SUBSCRIPTION & TOKEN CHECK ---
    // Match logic from inventoryController.js: Use Header OR Middleware
    let organizationId = req.headers['x-tenant-id'] || req.organizationId || req.organization?._id;

    if (!organizationId) {
      console.log('❌ [AI Support] Org Context Missing');
      return res.status(400).json({ error: 'Organization context missing' });
    }

    console.log(`[AI Support] Checking tokens for Org: ${organizationId}`);

    const subscription = await Subscription.findOne({ organizationId });
    if (!subscription) {
      console.log('❌ [AI Support] No Subscription Found for Org:', organizationId);
      return res.status(403).json({ error: 'No active subscription found.' });
    }

    if (!subscription.isActive()) {
      console.log('❌ [AI Support] Subscription Expired');
      return res.status(403).json({ error: 'Subscription is expired. Please renew.' });
    }

    // Calculate Token Cost based on input length
    const tokenCost = userMessage.length > 200 ? 3 : 1;
    console.log(`[AI Support] Consuming ${tokenCost} tokens from 'aiCustomerInsights'`);

    // Consume Token (Using 'aiCustomerInsights' bucket for Support/Consulting)
    try {
      await subscription.consumeTokens(
        'aiCustomerInsights',
        tokenCost,
        req.user?._id,
        `AI Support Query (${tokenCost} tokens)`,
        userMessage
      );
      console.log('[AI Support] Tokens deducted successfully.');
    } catch (tokenError) {
      console.error('[AI Support] Token consumption failed:', tokenError.message);
      return res.status(403).json({
        error: 'Insufficient AI Tokens',
        message: 'You have run out of AI Insights tokens. Please purchase more tokens.',
        isTokenError: true
      });
    }
    // ----------------------------------

    const python = spawn(getPythonCommand(), [
      pythonBridge,
      'process_query',
      JSON.stringify({ user_id, role, message: userMessage })
    ]);

    let result = '';
    let error = '';

    python.stdout.on('data', (data) => { result += data.toString(); });
    python.stderr.on('data', (data) => { error += data.toString(); });

    python.on('close', (code) => {
      console.log('🐍 Python exit code:', code);
      console.log('📤 Python stdout:', result);
      console.log('❌ Python stderr:', error);

      if (code !== 0) {
        console.error('Python error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to process query'
        });
      }

      try {
        const response = JSON.parse(result);
        console.log('✅ Parsed response:', response);
        res.json(response);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        console.error('Raw output was:', result);
        res.status(500).json({ success: false, error: 'Invalid response' });
      }
    });

  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ai/support/welcome
 * Get welcome message and quick actions for role
 */
router.get('/welcome', async (req, res) => {
  try {
    const { role } = req.query;

    const python = spawn(getPythonCommand(), [
      pythonBridge,
      'get_welcome_data',
      JSON.stringify({ role })
    ]);

    let result = '';
    let error = '';

    python.stdout.on('data', (data) => { result += data.toString(); });
    python.stderr.on('data', (data) => { error += data.toString(); });

    python.on('close', (code) => {
      if (code !== 0) {
        console.error('Python error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch welcome data'
        });
      }

      try {
        const response = JSON.parse(result);
        res.json(response);
      } catch (e) {
        res.status(500).json({ success: false, error: 'Invalid response' });
      }
    });

  } catch (error) {
    console.error('Welcome error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ai/support/consulting
 * Get consulting insights for role
 */
router.get('/consulting', authenticate, tenantContext, async (req, res) => {
  try {
    const { role, priority } = req.query;

    // --- SUBSCRIPTION & TOKEN CHECK ---
    const organizationId = req.headers['x-tenant-id'] || req.organizationId || req.organization?._id;
    if (organizationId) { // Only check if org context exists (it should via middleware)
      const subscription = await Subscription.findOne({ organizationId });
      // We only block if subscription exists but has no tokens. 
      // If strictly required, we can block if no subscription too.
      if (subscription && subscription.isActive()) {
        try {
          await subscription.consumeTokens(
            'aiCustomerInsights',
            1,
            req.user?._id,
            'AI Consulting Request',
            `Consulting for role: ${role}`
          );
        } catch (tokenError) {
          return res.status(403).json({
            error: 'Insufficient AI Tokens',
            message: 'You have run out of AI Insights tokens.',
            isTokenError: true
          });
        }
      }
    }
    // ----------------------------------

    const python = spawn(getPythonCommand(), [
      pythonBridge,
      'get_consulting',
      JSON.stringify({ role, priority })
    ]);

    let result = '';
    let error = '';

    python.stdout.on('data', (data) => { result += data.toString(); });
    python.stderr.on('data', (data) => { error += data.toString(); });

    python.on('close', (code) => {
      if (code !== 0) {
        console.error('Python error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch consulting tips'
        });
      }

      try {
        const response = JSON.parse(result);
        res.json(response);
      } catch (e) {
        res.status(500).json({ success: false, error: 'Invalid response' });
      }
    });

  } catch (error) {
    console.error('Consulting error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ai/support/categories
 * Get FAQ categories
 */
router.get('/categories', async (req, res) => {
  try {
    const { role } = req.query;

    const python = spawn(getPythonCommand(), [
      pythonBridge,
      'get_categories',
      JSON.stringify({ role })
    ]);

    let result = '';
    let error = '';

    python.stdout.on('data', (data) => { result += data.toString(); });
    python.stderr.on('data', (data) => { error += data.toString(); });

    python.on('close', (code) => {
      if (code !== 0) {
        console.error('Python error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch categories'
        });
      }

      try {
        const response = JSON.parse(result);
        res.json(response);
      } catch (e) {
        res.status(500).json({ success: false, error: 'Invalid response' });
      }
    });

  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
