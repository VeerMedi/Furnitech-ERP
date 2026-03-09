const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

// Path to Python bridge
const PYTHON_BRIDGE = path.join(__dirname, 'python_bridge.py');

/**
 * Execute Python bridge command
 */
function executePythonBridge(command) {
    return new Promise((resolve, reject) => {
        const python = spawn('python3', [PYTHON_BRIDGE, command]);
        
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
router.get('/overview', async (req, res) => {
    try {
        const result = await executePythonBridge('overview');
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
router.get('/buying-patterns', async (req, res) => {
    try {
        const result = await executePythonBridge('buying-patterns');
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
router.get('/clv', async (req, res) => {
    try {
        const result = await executePythonBridge('clv');
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
router.get('/preferences', async (req, res) => {
    try {
        const result = await executePythonBridge('preferences');
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
router.get('/ai', async (req, res) => {
    try {
        const result = await executePythonBridge('ai-insights');
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
