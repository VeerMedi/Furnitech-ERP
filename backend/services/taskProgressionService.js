const Task = require('../models/Task');
const Order = require('../models/vlite/Order');
const User = require('../models/vlite/User');
const productionWorkflowService = require('./productionWorkflowService');
const orderAutomationService = require('./orderAutomationService');

/**
 * Task Progression Service
 * Handles task status transitions, notifications, and workflow progression
 */

class TaskProgressionService {
  /**
   * Complete a task and progress workflow
   */
  async completeTask(taskId, userId, options = {}) {
    try {
      const task = await Task.findById(taskId)
        .populate('assignedTo')
        .populate('order');

      if (!task) {
        throw new Error('Task not found');
      }

      if (task.status === 'COMPLETED') {
        return {
          success: false,
          message: 'Task already completed',
          task
        };
      }

      // Mark task as completed
      task.markCompleted(userId, options.notes);
      await task.save();

      // Update dependent tasks
      const updatedTasks = await productionWorkflowService.updateDependentTasks(taskId);

      // Update order workflow status
      if (task.order) {
        await orderAutomationService.updateOrderWorkflowStatus(task.order._id, task.taskType);
      }

      // Send notifications
      await this.sendTaskCompletionNotifications(task, updatedTasks);

      // Check if entire workflow is complete
      const workflowComplete = await this.checkWorkflowCompletion(task.order._id);

      // Publish event
      await this.publishTaskCompletedEvent(task);

      return {
        success: true,
        message: 'Task completed successfully',
        task,
        updatedDependentTasks: updatedTasks.length,
        workflowComplete,
        nextTasks: updatedTasks
      };
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  }

  /**
   * Start a task (mark as in progress)
   */
  async startTask(taskId, userId) {
    try {
      const task = await Task.findById(taskId);
      
      if (!task) {
        throw new Error('Task not found');
      }

      if (task.status === 'IN_PROGRESS') {
        return {
          success: false,
          message: 'Task already in progress',
          task
        };
      }

      if (task.status === 'COMPLETED') {
        return {
          success: false,
          message: 'Task already completed',
          task
        };
      }

      // Check if dependencies are satisfied
      const canStart = await task.canStart();
      if (!canStart) {
        return {
          success: false,
          message: 'Task dependencies not yet satisfied',
          task
        };
      }

      // Mark task as in progress
      task.markInProgress(userId);
      await task.save();

      // Send notifications
      await this.sendTaskStartedNotifications(task);

      return {
        success: true,
        message: 'Task started successfully',
        task
      };
    } catch (error) {
      console.error('Error starting task:', error);
      throw error;
    }
  }

  /**
   * Update task progress
   */
  async updateTaskProgress(taskId, progressPercentage, userId) {
    const task = await Task.findById(taskId);
    
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status === 'COMPLETED') {
      return {
        success: false,
        message: 'Cannot update progress of completed task',
        task
      };
    }

    task.progressPercentage = Math.min(100, Math.max(0, progressPercentage));
    
    if (task.status === 'ASSIGNED' || task.status === 'READY') {
      task.markInProgress(userId);
    }

    task.statusHistory.push({
      status: task.status,
      changedBy: userId,
      changedAt: new Date(),
      notes: `Progress updated to ${progressPercentage}%`
    });

    await task.save();

    return {
      success: true,
      message: 'Task progress updated',
      task
    };
  }

  /**
   * Hold/pause a task
   */
  async holdTask(taskId, userId, reason) {
    const task = await Task.findById(taskId);
    
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status === 'COMPLETED') {
      return {
        success: false,
        message: 'Cannot hold completed task',
        task
      };
    }

    task.status = 'ON_HOLD';
    task.statusHistory.push({
      status: 'ON_HOLD',
      changedBy: userId,
      changedAt: new Date(),
      notes: `Task put on hold. Reason: ${reason}`
    });

    await task.save();

    // Notify relevant users
    await this.sendTaskHoldNotifications(task, reason);

    return {
      success: true,
      message: 'Task put on hold',
      task
    };
  }

  /**
   * Resume a held task
   */
  async resumeTask(taskId, userId) {
    const task = await Task.findById(taskId);
    
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status !== 'ON_HOLD') {
      return {
        success: false,
        message: 'Task is not on hold',
        task
      };
    }

    // Determine appropriate status
    const newStatus = task.startedAt ? 'IN_PROGRESS' : 'READY';
    task.status = newStatus;
    task.statusHistory.push({
      status: newStatus,
      changedBy: userId,
      changedAt: new Date(),
      notes: 'Task resumed'
    });

    await task.save();

    await this.sendTaskResumedNotifications(task);

    return {
      success: true,
      message: 'Task resumed',
      task
    };
  }

  /**
   * Fail a task (quality check failure, technical issues, etc.)
   */
  async failTask(taskId, userId, reason) {
    const task = await Task.findById(taskId);
    
    if (!task) {
      throw new Error('Task not found');
    }

    task.status = 'FAILED';
    task.qcStatus = 'FAILED';
    task.qcCheckedBy = userId;
    task.qcNotes = reason;
    task.statusHistory.push({
      status: 'FAILED',
      changedBy: userId,
      changedAt: new Date(),
      notes: `Task failed. Reason: ${reason}`
    });

    await task.save();

    // Create rework task if applicable
    const reworkTask = await this.createReworkTask(task, reason);

    // Escalate to supervisor
    await this.escalateFailedTask(task, reason);

    return {
      success: true,
      message: 'Task marked as failed',
      task,
      reworkTask
    };
  }

  /**
   * Create rework task for failed task
   */
  async createReworkTask(originalTask, failureReason) {
    const reworkTask = new Task({
      title: `Rework: ${originalTask.title}`,
      description: `Rework required due to failure of task ${originalTask.taskNumber}.\n\nFailure Reason: ${failureReason}`,
      taskType: originalTask.taskType,
      order: originalTask.order,
      quotation: originalTask.quotation,
      workflowStage: originalTask.workflowStage,
      sequence: originalTask.sequence + 0.5, // Insert between original sequence
      assignedRole: originalTask.assignedRole,
      requiredMachine: originalTask.requiredMachine,
      status: 'READY',
      priority: 'HIGH', // Rework is high priority
      estimatedDurationMinutes: originalTask.estimatedDurationMinutes,
      requiresQC: true,
      autoGenerated: true,
      generatedBy: 'MANUAL',
      organization: originalTask.organization
    });

    await reworkTask.save();
    return reworkTask;
  }

  /**
   * Check if workflow is complete for an order
   */
  async checkWorkflowCompletion(orderId) {
    if (!orderId) return false;

    const tasks = await Task.find({ order: orderId });
    const allComplete = tasks.every(t => t.status === 'COMPLETED');

    if (allComplete) {
      // Update order status
      const order = await Order.findById(orderId);
      if (order && order.orderStatus !== 'COMPLETED') {
        order.orderStatus = 'COMPLETED';
        order.statusHistory.push({
          status: 'COMPLETED',
          changedAt: new Date(),
          notes: 'All production tasks completed'
        });
        await order.save();

        // Send completion notifications
        await this.sendOrderCompletionNotifications(order);
      }
    }

    return allComplete;
  }

  /**
   * Send task completion notifications
   */
  async sendTaskCompletionNotifications(task, dependentTasks) {
    try {
      // Notify task owner
      if (task.assignedBy) {
        await this.createNotification({
          user: task.assignedBy,
          title: 'Task Completed',
          message: `Task "${task.title}" has been completed by ${task.assignedTo?.firstName || 'user'}`,
          type: 'TASK_COMPLETED',
          link: `/tasks/${task._id}`
        });
      }

      // Notify next task assignees
      for (const depTask of dependentTasks) {
        if (depTask.assignedTo) {
          await this.createNotification({
            user: depTask.assignedTo,
            title: 'Task Ready',
            message: `Task "${depTask.title}" is now ready to start`,
            type: 'TASK_READY',
            link: `/tasks/${depTask._id}`
          });
        }
      }

      // Mark notification as sent
      task.notificationSent = true;
      await task.save();
    } catch (error) {
      console.error('Error sending task completion notifications:', error);
    }
  }

  /**
   * Send task started notifications
   */
  async sendTaskStartedNotifications(task) {
    try {
      if (task.assignedBy) {
        await this.createNotification({
          user: task.assignedBy,
          title: 'Task Started',
          message: `Task "${task.title}" has been started`,
          type: 'TASK_STARTED',
          link: `/tasks/${task._id}`
        });
      }
    } catch (error) {
      console.error('Error sending task started notifications:', error);
    }
  }

  /**
   * Send task hold notifications
   */
  async sendTaskHoldNotifications(task, reason) {
    try {
      if (task.assignedBy) {
        await this.createNotification({
          user: task.assignedBy,
          title: 'Task On Hold',
          message: `Task "${task.title}" has been put on hold. Reason: ${reason}`,
          type: 'TASK_ON_HOLD',
          link: `/tasks/${task._id}`,
          priority: 'HIGH'
        });
      }
    } catch (error) {
      console.error('Error sending task hold notifications:', error);
    }
  }

  /**
   * Send task resumed notifications
   */
  async sendTaskResumedNotifications(task) {
    try {
      if (task.assignedTo) {
        await this.createNotification({
          user: task.assignedTo,
          title: 'Task Resumed',
          message: `Task "${task.title}" has been resumed`,
          type: 'TASK_RESUMED',
          link: `/tasks/${task._id}`
        });
      }
    } catch (error) {
      console.error('Error sending task resumed notifications:', error);
    }
  }

  /**
   * Send order completion notifications
   */
  async sendOrderCompletionNotifications(order) {
    try {
      // This would integrate with existing notification system
      console.log(`Order ${order.orderNumber} completed - all tasks finished`);
      
      // TODO: Send email/SMS notifications to customer
      // TODO: Create dispatch task
      // TODO: Update inventory
    } catch (error) {
      console.error('Error sending order completion notifications:', error);
    }
  }

  /**
   * Escalate failed task
   */
  async escalateFailedTask(task, reason) {
    try {
      // Find supervisor based on department
      const supervisor = await User.findOne({
        department: this.getDepartmentForTaskType(task.taskType),
        workflowRole: { $in: ['PRODUCTION_MANAGER', 'DESIGN_LEAD', 'QC_INSPECTOR'] },
        isActive: true
      });

      if (supervisor) {
        task.escalated = true;
        task.escalatedTo = supervisor._id;
        await task.save();

        await this.createNotification({
          user: supervisor._id,
          title: 'Task Failed - Escalation',
          message: `Task "${task.title}" has failed and requires your attention. Reason: ${reason}`,
          type: 'TASK_ESCALATED',
          link: `/tasks/${task._id}`,
          priority: 'URGENT'
        });
      }
    } catch (error) {
      console.error('Error escalating failed task:', error);
    }
  }

  /**
   * Get department for task type
   */
  getDepartmentForTaskType(taskType) {
    const departmentMap = {
      'PRODUCTION_BEAM_SAW': 'PRODUCTION',
      'PRODUCTION_EDGE_BANDING': 'PRODUCTION',
      'PRODUCTION_BORING': 'PRODUCTION',
      'PRODUCTION_FINISHING': 'PRODUCTION',
      'PRODUCTION_STEEL_CUTTING': 'PRODUCTION',
      'PRODUCTION_CNC_CUTTING': 'PRODUCTION',
      'PRODUCTION_BENDING': 'PRODUCTION',
      'PRODUCTION_WELDING': 'PRODUCTION',
      'PRODUCTION_PACKAGING': 'PRODUCTION',
      'QUALITY_CHECK': 'QUALITY',
      'DESIGN_CREATION': 'DESIGN',
      'MATERIAL_ALLOCATION': 'INVENTORY',
      'DISPATCH_PREPARATION': 'LOGISTICS'
    };

    return departmentMap[taskType] || 'PRODUCTION';
  }

  /**
   * Create notification (placeholder - integrate with existing notification system)
   */
  async createNotification(notificationData) {
    // TODO: Integrate with existing notification system
    // For now, just log
    console.log('Notification:', notificationData);
    
    // This would typically:
    // 1. Create a notification document in database
    // 2. Send real-time notification via WebSocket
    // 3. Send email if configured
    // 4. Send push notification if mobile app exists
  }

  /**
   * Publish task completed event to smart automation
   */
  async publishTaskCompletedEvent(task) {
    const event = {
      eventType: 'task.completed',
      timestamp: new Date().toISOString(),
      data: {
        taskId: task._id,
        taskNumber: task.taskNumber,
        taskType: task.taskType,
        orderId: task.order,
        assignedTo: task.assignedTo,
        completedAt: task.completedAt,
        actualDuration: task.actualDurationMinutes
      }
    };

    console.log('Task Completed Event:', event);
    
    // TODO: Integrate with AI/smart_automation/engine/event_bus.py
    return event;
  }

  /**
   * Get overdue tasks and send reminders
   */
  async processOverdueTasks() {
    const overdueTasks = await Task.find({
      status: { $in: ['ASSIGNED', 'IN_PROGRESS'] },
      dueDate: { $lt: new Date() },
      reminderSent: false
    }).populate('assignedTo assignedBy');

    for (const task of overdueTasks) {
      await this.sendOverdueReminder(task);
      task.reminderSent = true;
      await task.save();
    }

    return {
      processed: overdueTasks.length,
      tasks: overdueTasks
    };
  }

  /**
   * Send overdue reminder
   */
  async sendOverdueReminder(task) {
    if (task.assignedTo) {
      await this.createNotification({
        user: task.assignedTo._id,
        title: 'Task Overdue',
        message: `Task "${task.title}" is overdue. Due date was ${task.dueDate.toLocaleDateString()}`,
        type: 'TASK_OVERDUE',
        link: `/tasks/${task._id}`,
        priority: 'URGENT'
      });
    }

    // Also notify supervisor
    if (task.assignedBy) {
      await this.createNotification({
        user: task.assignedBy,
        title: 'Task Overdue',
        message: `Task "${task.title}" assigned to ${task.assignedTo?.firstName || 'user'} is overdue`,
        type: 'TASK_OVERDUE',
        link: `/tasks/${task._id}`,
        priority: 'HIGH'
      });
    }
  }

  /**
   * Get task timeline for an order
   */
  async getOrderTaskTimeline(orderId) {
    const tasks = await Task.find({ order: orderId })
      .populate('assignedTo')
      .sort({ sequence: 1 });

    const timeline = tasks.map(task => ({
      taskNumber: task.taskNumber,
      title: task.title,
      status: task.status,
      assignedTo: task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : 'Unassigned',
      estimatedMinutes: task.estimatedDurationMinutes,
      actualMinutes: task.actualDurationMinutes,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      dueDate: task.dueDate,
      isOverdue: task.isOverdue(),
      progressPercentage: task.progressPercentage
    }));

    return timeline;
  }

  /**
   * Bulk update task statuses (for testing or admin operations)
   */
  async bulkUpdateTaskStatus(taskIds, status, userId, notes) {
    const results = [];

    for (const taskId of taskIds) {
      try {
        const task = await Task.findById(taskId);
        if (task) {
          task.status = status;
          task.statusHistory.push({
            status,
            changedBy: userId,
            changedAt: new Date(),
            notes: notes || 'Bulk status update'
          });
          await task.save();
          results.push({ success: true, taskId, task });
        }
      } catch (error) {
        results.push({ success: false, taskId, error: error.message });
      }
    }

    return {
      total: taskIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }
}

module.exports = new TaskProgressionService();
