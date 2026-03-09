/**
 * Recommendation Routes
 * Node.js Express routes for Employee Recommendation System
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
 * POST /recommendation/for-inquiry
 * Get employee recommendation for inquiry
 * Body: { inquiry_id: string }
 */
router.post('/for-inquiry', async (req, res) => {
  try {
    const { inquiry_id } = req.body;
    
    if (!inquiry_id) {
      return res.status(400).json({
        success: false,
        error: 'inquiry_id is required'
      });
    }
    
    const result = await executePythonCommand('recommend', [inquiry_id]);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /recommendation/mock-employees
 * Get all mock employees with their current metrics
 */
router.get('/mock-employees', async (req, res) => {
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

module.exports = router;
