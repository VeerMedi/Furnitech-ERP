/**
 * Mock Data Routes
 * Node.js Express routes for accessing mock data
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
 * GET /mock/inquiries
 * Get all mock inquiries
 */
router.get('/inquiries', async (req, res) => {
  try {
    const result = await executePythonCommand('get-inquiries');
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /mock/employees
 * Get all mock employees
 */
router.get('/employees', async (req, res) => {
  try {
    const result = await executePythonCommand('get-employees');
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /mock/reset
 * Reset mock data to defaults
 */
router.post('/reset', async (req, res) => {
  try {
    const result = await executePythonCommand('reset-data');
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
