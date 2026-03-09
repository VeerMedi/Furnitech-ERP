const Task = require('../models/Task');
const taskAssignmentService = require('../services/taskAssignmentService');
const taskProgressionService = require('../services/taskProgressionService');
const productionWorkflowService = require('../services/productionWorkflowService');
const orderAutomationService = require('../services/orderAutomationService');
const EmailService = require('../utils/emailService');
const User = require('../models/vlite/User');

/**
 * Task Controller
 * Handles all task-related operations and API endpoints
 */

// Get all tasks with filters
exports.getAllTasks = async (req, res) => {
  try {
    const {
      status,
      priority,
      assignedTo,
      assignedRole,
      taskType,
      order,
      workflowStage,
      search,
      page = 1,
      limit = 50,
      sortBy = 'sequence',
      sortOrder = 'asc'
    } = req.query;

    // Build query
    const query = {};

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (assignedRole) query.assignedRole = assignedRole;
    if (taskType) query.taskType = taskType;
    if (order) query.order = order;
    if (workflowStage) query.workflowStage = workflowStage;

    // Add organization filter if multi-tenant
    if (req.user?.organization) {
      query.organization = req.user.organization;
    }

    // Search in title and description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { taskNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const tasks = await Task.find(query)
      .populate('assignedTo', 'firstName lastName email employeeId')
      .populate('assignedBy', 'firstName lastName')
      .populate('order', 'orderNumber orderStatus customer')
      .populate('quotation', 'quotationNumber')
      .populate('requiredMachine', 'machineName machineType operationalStatus')
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sort);

    const total = await Task.countDocuments(query);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
      error: error.message
    });
  }
};

// Get task by ID
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email employeeId workflowRole department')
      .populate('assignedBy', 'firstName lastName')
      .populate('order', 'orderNumber orderStatus customer productType')
      .populate('quotation', 'quotationNumber')
      .populate('requiredMachine', 'machineName machineType operationalStatus')
      .populate('dependsOn', 'taskNumber title status')
      .populate('blockedBy', 'taskNumber title status')
      .populate('statusHistory.changedBy', 'firstName lastName')
      .populate('comments.user', 'firstName lastName');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task',
      error: error.message
    });
  }
};

// Get my tasks (tasks assigned to logged-in user)
exports.getMyTasks = async (req, res) => {
  try {
    const { status, priority } = req.query;

    const tasks = await Task.getTasksByUser(req.user._id, status)
      .populate('order', 'orderNumber orderStatus customer')
      .populate('quotation', 'quotationNumber')
      .populate('requiredMachine', 'machineName machineType');

    // Filter by priority if specified
    let filteredTasks = tasks;
    if (priority) {
      filteredTasks = tasks.filter(t => t.priority === priority);
    }

    res.json({
      success: true,
      data: filteredTasks,
      count: filteredTasks.length
    });
  } catch (error) {
    console.error('Error fetching my tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
      error: error.message
    });
  }
};

// Get tasks by role
exports.getTasksByRole = async (req, res) => {
  try {
    const { role, status } = req.query;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role parameter is required'
      });
    }

    const tasks = await Task.getTasksByRole(role, status)
      .populate('assignedTo', 'firstName lastName')
      .populate('order', 'orderNumber orderStatus')
      .populate('quotation', 'quotationNumber');

    res.json({
      success: true,
      data: tasks,
      count: tasks.length
    });
  } catch (error) {
    console.error('Error fetching tasks by role:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
      error: error.message
    });
  }
};

// Get tasks for an order
exports.getOrderTasks = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { groupByStage } = req.query;

    if (groupByStage === 'true') {
      const tasksByStage = await productionWorkflowService.getOrderTasksByStage(orderId);
      return res.json({
        success: true,
        data: tasksByStage
      });
    }

    const tasks = await Task.getTasksByOrder(orderId);

    res.json({
      success: true,
      data: tasks,
      count: tasks.length
    });
  } catch (error) {
    console.error('Error fetching order tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order tasks',
      error: error.message
    });
  }
};

// Create task manually
exports.createTask = async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      organization: req.user?.organization,
      generatedBy: 'MANUAL'
    };

    const task = new Task(taskData);
    await task.save();

    // Trigger email if assignedTo is present
    if (task.assignedTo) {
      try {
        const user = await User.findById(task.assignedTo);
        const populatedTask = await Task.findById(task._id).populate({
          path: 'order',
          populate: { path: 'customer', select: 'fullName firstName lastName' }
        });

        if (user && user.email && populatedTask) {
          EmailService.sendProductionTaskAssignmentEmail(populatedTask, user)
            .then(res => {
              if (res.success) console.log(`✉️ Manual Task Assignment email sent to ${user.email}`);
              else console.warn(`⚠️ Failed to send manual task assignment email: ${res.error}`);
            })
            .catch(err => console.error('⚠️ Manual task assignment email error:', err.message));
        }
      } catch (err) {
        console.error('⚠️ Failed to process manual task assignment email:', err.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating task',
      error: error.message
    });
  }
};

// Update task
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating certain fields directly
    delete updates.taskNumber;
    delete updates.autoGenerated;
    delete updates.statusHistory;

    const originalTask = await Task.findById(id); // Fetch original to check if assignedTo changed

    const task = await Task.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    // Trigger email if assignedTo CHANGED
    if (updates.assignedTo && originalTask && originalTask.assignedTo?.toString() !== updates.assignedTo) {
      try {
        const user = await User.findById(updates.assignedTo);
        const populatedTask = await Task.findById(task._id).populate({
          path: 'order',
          populate: { path: 'customer', select: 'fullName firstName lastName' }
        });

        if (user && user.email && populatedTask) {
          EmailService.sendProductionTaskAssignmentEmail(populatedTask, user)
            .then(res => {
              if (res.success) console.log(`✉️ Task Update Assignment email sent to ${user.email}`);
              else console.warn(`⚠️ Failed to send task update assignment email: ${res.error}`);
            })
            .catch(err => console.error('⚠️ Task update assignment email error:', err.message));
        }
      } catch (err) {
        console.error('⚠️ Failed to process task update assignment email:', err.message);
      }
    }

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating task',
      error: error.message
    });
  }
};

// Assign task to user
exports.assignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, reason } = req.body;

    console.log(`🛠️ [assignTask] Request received for Task ID: ${id}`);
    console.log(`   User ID to assign: ${userId}`);
    console.log(`   Assigned By: ${req.user._id}`);

    const result = await taskAssignmentService.assignTask(id, {
      assignedBy: req.user._id,
      specifiedUserId: userId,
      reason: reason
    });

    console.log('   Assign Task Result:', JSON.stringify(result));

    res.json(result);
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning task',
      error: error.message
    });
  }
};

// Reassign task
exports.reassignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, reason } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const result = await taskAssignmentService.reassignTask(
      id,
      userId,
      req.user._id,
      reason || 'Reassigned by user'
    );

    res.json(result);
  } catch (error) {
    console.error('Error reassigning task:', error);
    res.status(500).json({
      success: false,
      message: 'Error reassigning task',
      error: error.message
    });
  }
};

// Get assignment recommendations
exports.getAssignmentRecommendations = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 5 } = req.query;

    const recommendations = await taskAssignmentService.getAssignmentRecommendations(
      id,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error getting assignment recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting recommendations',
      error: error.message
    });
  }
};

// Start task
exports.startTask = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await taskProgressionService.startTask(id, req.user._id);

    res.json(result);
  } catch (error) {
    console.error('Error starting task:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting task',
      error: error.message
    });
  }
};

// Update task progress
exports.updateTaskProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { progressPercentage } = req.body;

    if (progressPercentage === undefined) {
      return res.status(400).json({
        success: false,
        message: 'progressPercentage is required'
      });
    }

    const result = await taskProgressionService.updateTaskProgress(
      id,
      progressPercentage,
      req.user._id
    );

    res.json(result);
  } catch (error) {
    console.error('Error updating task progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating progress',
      error: error.message
    });
  }
};

// Complete task
exports.completeTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const result = await taskProgressionService.completeTask(id, req.user._id, { notes });

    res.json(result);
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing task',
      error: error.message
    });
  }
};

// Hold task
exports.holdTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required to hold a task'
      });
    }

    const result = await taskProgressionService.holdTask(id, req.user._id, reason);

    res.json(result);
  } catch (error) {
    console.error('Error holding task:', error);
    res.status(500).json({
      success: false,
      message: 'Error holding task',
      error: error.message
    });
  }
};

// Resume task
exports.resumeTask = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await taskProgressionService.resumeTask(id, req.user._id);

    res.json(result);
  } catch (error) {
    console.error('Error resuming task:', error);
    res.status(500).json({
      success: false,
      message: 'Error resuming task',
      error: error.message
    });
  }
};

// Fail task
exports.failTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required to fail a task'
      });
    }

    const result = await taskProgressionService.failTask(id, req.user._id, reason);

    res.json(result);
  } catch (error) {
    console.error('Error failing task:', error);
    res.status(500).json({
      success: false,
      message: 'Error failing task',
      error: error.message
    });
  }
};

// Add comment to task
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({
        success: false,
        message: 'Comment is required'
      });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    task.comments.push({
      user: req.user._id,
      comment,
      createdAt: new Date()
    });

    await task.save();

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: task
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment',
      error: error.message
    });
  }
};

// Get user workload
exports.getUserWorkload = async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUserId = userId || req.user._id;

    const workload = await taskAssignmentService.getUserWorkload(targetUserId);

    res.json({
      success: true,
      data: workload
    });
  } catch (error) {
    console.error('Error getting user workload:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting workload',
      error: error.message
    });
  }
};

// Get team workload
exports.getTeamWorkload = async (req, res) => {
  try {
    const { department } = req.query;

    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Department parameter is required'
      });
    }

    const workloads = await taskAssignmentService.getTeamWorkload(department);

    res.json({
      success: true,
      data: workloads
    });
  } catch (error) {
    console.error('Error getting team workload:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting team workload',
      error: error.message
    });
  }
};

// Get workflow progress for order
exports.getOrderWorkflowProgress = async (req, res) => {
  try {
    const { orderId } = req.params;

    const progress = await productionWorkflowService.getWorkflowProgress(orderId);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error getting workflow progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting workflow progress',
      error: error.message
    });
  }
};

// Get order task timeline
exports.getOrderTaskTimeline = async (req, res) => {
  try {
    const { orderId } = req.params;

    const timeline = await taskProgressionService.getOrderTaskTimeline(orderId);

    res.json({
      success: true,
      data: timeline
    });
  } catch (error) {
    console.error('Error getting task timeline:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting timeline',
      error: error.message
    });
  }
};

// Get task statistics
exports.getTaskStatistics = async (req, res) => {
  try {
    const { startDate, endDate, department, userId } = req.query;

    const query = {};

    if (req.user?.organization) {
      query.organization = req.user.organization;
    }

    if (userId) {
      query.assignedTo = userId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const [
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      tasksByStatus,
      tasksByPriority,
      avgCompletionTime
    ] = await Promise.all([
      Task.countDocuments(query),
      Task.countDocuments({ ...query, status: 'COMPLETED' }),
      Task.countDocuments({ ...query, status: 'IN_PROGRESS' }),
      Task.countDocuments({ ...query, dueDate: { $lt: new Date() }, status: { $ne: 'COMPLETED' } }),
      Task.aggregate([
        { $match: query },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Task.aggregate([
        { $match: query },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      Task.aggregate([
        { $match: { ...query, status: 'COMPLETED', actualDurationMinutes: { $exists: true } } },
        { $group: { _id: null, avg: { $avg: '$actualDurationMinutes' } } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          total: totalTasks,
          completed: completedTasks,
          inProgress: inProgressTasks,
          overdue: overdueTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        },
        byStatus: tasksByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byPriority: tasksByPriority.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        avgCompletionTime: avgCompletionTime[0]?.avg || 0
      }
    });
  } catch (error) {
    console.error('Error getting task statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting statistics',
      error: error.message
    });
  }
};

// Delete task
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByIdAndDelete(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting task',
      error: error.message
    });
  }
};

module.exports = exports;
