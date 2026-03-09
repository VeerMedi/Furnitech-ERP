/**
 * New Automation Routes for Suggestion-Based Workflow
 * Replaces automatic execution with user-confirmed suggestions
 */

const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');

// Python bridge for automation logic
const pythonBridge = path.join(__dirname, 'python_bridge_new.py');

/**
 * POST /automation/trigger
 * Trigger an automation event (generates suggestions, does NOT auto-execute)
 */
router.post('/trigger', async (req, res) => {
  try {
    const { event_type, entity_id, entity_data } = req.body;
    
    if (!event_type || !entity_id) {
      return res.status(400).json({
        success: false,
        error: 'event_type and entity_id are required'
      });
    }

    // Call Python to generate suggestion
    const python = spawn('python3', [
      pythonBridge,
      'trigger_event',
      JSON.stringify({ event_type, entity_id, entity_data })
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
          error: 'Failed to trigger automation event'
        });
      }

      try {
        const response = JSON.parse(result);
        res.json(response);
      } catch (e) {
        res.status(500).json({ success: false,  error: 'Invalid response from automation engine' });
      }
    });

  } catch (error) {
    console.error('Trigger error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /automation/suggestions
 * Get all pending suggestions for user
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { role } = req.query;

    const python = spawn('python3', [
      pythonBridge,
      'get_suggestions',
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
          error: 'Failed to fetch suggestions'
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
    console.error('Get suggestions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /automation/confirm
 * Confirm or dismiss a suggestion (execute or reject)
 */
router.post('/confirm', async (req, res) => {
  try {
    const { suggestion_id, confirmed } = req.body;

    if (!suggestion_id || confirmed === undefined) {
      return res.status(400).json({
        success: false,
        error: 'suggestion_id and confirmed are required'
      });
    }

    const python = spawn('python3', [
      pythonBridge,
      'confirm_suggestion',
      JSON.stringify({ suggestion_id, confirmed })
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
          error: 'Failed to process confirmation'
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
    console.error('Confirm error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /automation/tasks/:role
 * Get tasks assigned to a specific role
 */
router.get('/tasks/:role', async (req, res) => {
  try {
    const { role } = req.params;
    const { status } = req.query;

    const python = spawn('python3', [
      pythonBridge,
      'get_tasks_by_role',
      JSON.stringify({ role, status })
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
          error: 'Failed to fetch tasks'
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
    console.error('Get tasks error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /automation/tasks/complete
 * Mark a task as completed
 */
router.post('/tasks/complete', async (req, res) => {
  try {
    const { task_id, completion_notes } = req.body;

    if (!task_id) {
      return res.status(400).json({
        success: false,
        error: 'task_id is required'
      });
    }

    const python = spawn('python3', [
      pythonBridge,
      'complete_task',
      JSON.stringify({ task_id, completion_notes })
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
          error: 'Failed to complete task'
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
    console.error('Complete task error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /automation/dashboard/:role
 * Get dashboard summary for a  role (tasks + notifications + suggestions)
 */
router.get('/dashboard/:role', async (req, res) => {
  try {
    const { role } = req.params;

    const python = spawn('python3', [
      pythonBridge,
      'get_role_dashboard',
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
          error: 'Failed to fetch dashboard data'
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
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
