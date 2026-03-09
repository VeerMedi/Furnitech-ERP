const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticate);

// Task CRUD operations
router.get('/', taskController.getAllTasks);
router.get('/my-tasks', taskController.getMyTasks);
router.get('/by-role', taskController.getTasksByRole);
router.get('/statistics', taskController.getTaskStatistics);
router.get('/:id', taskController.getTaskById);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// Task assignment
router.post('/:id/assign', taskController.assignTask);
router.post('/:id/reassign', taskController.reassignTask);
router.get('/:id/recommendations', taskController.getAssignmentRecommendations);

// Task progression
router.post('/:id/start', taskController.startTask);
router.post('/:id/complete', taskController.completeTask);
router.post('/:id/hold', taskController.holdTask);
router.post('/:id/resume', taskController.resumeTask);
router.post('/:id/fail', taskController.failTask);
router.put('/:id/progress', taskController.updateTaskProgress);

// Task comments
router.post('/:id/comments', taskController.addComment);

// Order-related task operations
router.get('/order/:orderId', taskController.getOrderTasks);
router.get('/order/:orderId/workflow-progress', taskController.getOrderWorkflowProgress);
router.get('/order/:orderId/timeline', taskController.getOrderTaskTimeline);

// Workload management
router.get('/workload/user/:userId?', taskController.getUserWorkload);
router.get('/workload/team', taskController.getTeamWorkload);

module.exports = router;
