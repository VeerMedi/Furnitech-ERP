const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const { authenticate, tenantContext } = require('../middleware/auth');
const Subscription = require('../models/shared/Subscription');

const { getPythonCommand } = require('../utils/pythonCommand');

// Path to Python bridge
const PYTHON_BRIDGE = path.join(__dirname, '../../AI/customer_insights/api/python_bridge.py');

/**
 * Execute Python bridge command with organization context
 */
function executePythonBridge(command, organizationId) {
    return new Promise((resolve, reject) => {
        // Pass organizationId as argument to Python script
        const python = spawn(getPythonCommand(), [PYTHON_BRIDGE, command, organizationId]);

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        python.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(stderr || `Python process exited with code ${code}`));
            } else {
                try {
                    const result = JSON.parse(stdout);
                    resolve(result);
                } catch (err) {
                    reject(new Error(`Failed to parse JSON: ${stdout}`));
                }
            }
        });
    });
}

/**
 * GET /api/insights/overview
 * Get dashboard KPI metrics
 */
router.get('/overview', authenticate, tenantContext, async (req, res) => {
    try {
        const organizationId = req.headers['x-tenant-id'] || req.organizationId || req.organization?._id;
        if (!organizationId) {
            return res.status(400).json({ error: 'Organization context required' });
        }

        // --- SUBSCRIPTION & TOKEN CHECK ---
        const subscription = await Subscription.findOne({ organizationId });
        if (!subscription) {
            return res.status(403).json({ error: 'No active subscription found.' });
        }

        try {
            await subscription.consumeTokens(
                'aiCustomerInsights',
                1,
                req.user?._id || 'unknown',
                'Dashboard Refresh',
                'Customer Insights Overview'
            );
        } catch (tokenErr) {
            if (tokenErr.message === 'Insufficient tokens') {
                return res.status(402).json({
                    success: false,
                    message: 'You have run out of AI Insights tokens.'
                });
            }
            throw tokenErr;
        }
        // ----------------------------------

        const result = await executePythonBridge('overview', organizationId.toString());
        if (result.success) {
            res.json(result.data);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/insights/buying-patterns
 * Get buying pattern analysis for charts
 */
router.get('/buying-patterns', authenticate, tenantContext, async (req, res) => {
    try {
        const organizationId = req.organizationId || req.organization?._id;
        if (!organizationId) {
            return res.status(400).json({ error: 'Organization context required' });
        }

        const result = await executePythonBridge('buying-patterns', organizationId.toString());
        if (result.success) {
            res.json(result.data);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/insights/clv
 * Get Customer Lifetime Value rankings
 */
router.get('/clv', authenticate, tenantContext, async (req, res) => {
    try {
        const organizationId = req.organizationId || req.organization?._id;
        if (!organizationId) {
            return res.status(400).json({ error: 'Organization context required' });
        }

        const result = await executePythonBridge('clv', organizationId.toString());
        if (result.success) {
            res.json(result.data);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/insights/preferences
 * Get customer preference analysis
 */
router.get('/preferences', authenticate, tenantContext, async (req, res) => {
    try {
        const organizationId = req.organizationId || req.organization?._id;
        if (!organizationId) {
            return res.status(400).json({ error: 'Organization context required' });
        }

        const result = await executePythonBridge('preferences', organizationId.toString());
        if (result.success) {
            res.json(result.data);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/insights/ai
 * Get AI-generated natural language insights
 */
router.get('/ai', authenticate, tenantContext, async (req, res) => {
    try {
        const organizationId = req.organizationId || req.organization?._id;
        if (!organizationId) {
            return res.status(400).json({ error: 'Organization context required' });
        }

        const result = await executePythonBridge('ai-insights', organizationId.toString());
        if (result.success) {
            res.json(result.data);
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
