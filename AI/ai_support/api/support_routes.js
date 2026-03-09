/**
 * AI Support API Routes
 * Handles support queries and consulting requests
 */

const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

// Python bridge for AI support
const pythonBridge = path.join(__dirname, '../support_bridge.py');

/**
 * POST /api/ai/support/query
 * Main chat endpoint
 */
router.post('/query', async (req, res) => {
  try {
    const { user_id, role, message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required'
      });
    }

    const python = spawn('python3', [
      pythonBridge,
      'process_query',
      JSON.stringify({ user_id, role, message })
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
          error: 'Failed to process query'
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

    const python = spawn('python3', [
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
router.get('/consulting', async (req, res) => {
  try {
    const { role, priority } = req.query;

    const python = spawn('python3', [
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

    const python = spawn('python3', [
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
