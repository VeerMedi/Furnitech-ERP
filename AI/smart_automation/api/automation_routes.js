/**
 * Automation Routes
 * Node.js Express routes for Smart Automation Engine
 */

const { Router } = require('express');
const { spawn } = require('child_process');
const path = require('path');

const router = Router();

// Path to Python bridge script
const PYTHON_BRIDGE = path.join(__dirname, 'python_bridge.py');

/**
 * Execute Python command and return result
 */
function executePythonCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [PYTHON_BRIDGE, command, ...args]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python Error:', stderr);
        reject(new Error(stderr || 'Python process failed'));
      } else {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          reject(new Error('Failed to parse Python output: ' + stdout));
        }
      }
    });
  });
}

/**
 * POST /automation/run-test
 * Run full automation test suite
 */
router.post('/run-test', async (req, res) => {
  try {
    const result = await executePythonCommand('run-test');
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /automation/trigger-event
 * Manually trigger an automation event
 * Body: { event_type: string, event_data: object }
 */
router.post('/trigger-event', async (req, res) => {
  try {
    const { event_type, event_data } = req.body;
    
    if (!event_type) {
      return res.status(400).json({
        success: false,
        error: 'event_type is required'
      });
    }
    
    const result = await executePythonCommand('trigger-event', [
      event_type,
      JSON.stringify(event_data || {})
    ]);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /automation/logs
 * Retrieve automation execution logs
 * Query params: limit (default: 100)
 */
router.get('/logs', async (req, res) => {
  try {
    const limit = req.query.limit || '100';
    const result = await executePythonCommand('get-logs', [limit]);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /automation/config
 * Get current automation configuration
 */
router.get('/config', async (req, res) => {
  try {
    const result = await executePythonCommand('get-config');
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /automation/toggle-rule
 * Enable/disable specific automation rule
 * Body: { rule_key: string, enabled: boolean }
 */
router.post('/toggle-rule', async (req, res) => {
  try {
    const { rule_key, enabled } = req.body;
    
    if (!rule_key) {
      return res.status(400).json({
        success: false,
        error: 'rule_key is required'
      });
    }
    
    const result = await executePythonCommand('toggle-rule', [
      rule_key,
      enabled ? 'true' : 'false'
    ]);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
