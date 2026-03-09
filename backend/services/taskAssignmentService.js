const Task = require('../models/Task');
const User = require('../models/vlite/User');
const Machine = require('../models/vlite/Machine');
const Order = require('../models/vlite/Order');
const EmailService = require('../utils/emailService');

/**
 * Task Assignment Service
 * Intelligent task assignment based on skills, workload, performance, and availability
 * Implements algorithm similar to employee recommendation system
 */

class TaskAssignmentService {
  /**
   * Assign task to best available user
   */
  async assignTask(taskId, options = {}) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      if (task.assignedTo) {
        return {
          success: false,
          message: 'Task already assigned',
          task
        };
      }

      // Handle specific user assignment (Manual Assignment)
      if (options.specifiedUserId) {
        const user = await User.findById(options.specifiedUserId);
        if (!user) {
          throw new Error('Specified user not found');
        }

        // Force assign to this user
        task.assignToUser(
          user._id,
          options.assignedBy || null,
          options.reason || 'Manually assigned'
        );
        task.assignmentScore = 100; // Manual overrides score
        await task.save();

        // Trigger Email Notification
        try {
          const populatedTask = await Task.findById(task._id).populate({
            path: 'order',
            populate: { path: 'customer', select: 'fullName firstName lastName' }
          });

          if (populatedTask && user.email) {
            EmailService.sendProductionTaskAssignmentEmail(populatedTask, user)
              .then(res => {
                if (res.success) console.log(`✉️ Manual Production assignment email sent to ${user.email}`);
                else console.warn(`⚠️ Failed to send production email: ${res.error}`);
              })
              .catch(err => console.error('⚠️ Production assignment email error:', err.message));
          }
        } catch (emailErr) {
          console.error('⚠️ Failed to prepare production notification:', emailErr.message);
        }

        return {
          success: true,
          message: 'Task assigned successfully',
          task,
          assignedTo: user,
          score: 100,
          reason: options.reason || 'Manually assigned',
          manualAssignment: true
        };
      }

      // Get candidates for this task
      const candidates = await this.findCandidates(task, options);

      if (candidates.length === 0) {
        return {
          success: false,
          message: 'No suitable candidates found',
          task
        };
      }

      // Score and rank candidates
      const scoredCandidates = await this.scoreCandidates(task, candidates);

      // Select best candidate
      const bestCandidate = scoredCandidates[0];

      // Assign task
      task.assignToUser(
        bestCandidate.user._id,
        options.assignedBy || null,
        bestCandidate.reason
      );
      task.assignmentScore = bestCandidate.score;
      await task.save();

      // Trigger Email Notification (Fire and forget, but with logging)
      try {
        // Populate order and customer details for the email template
        const populatedTask = await Task.findById(task._id).populate({
          path: 'order',
          populate: { path: 'customer', select: 'fullName firstName lastName' }
        });

        if (populatedTask && bestCandidate.user.email) {
          EmailService.sendProductionTaskAssignmentEmail(populatedTask, bestCandidate.user)
            .then(res => {
              if (res.success) console.log(`✉️ Production assignment email sent to ${bestCandidate.user.email}`);
              else console.warn(`⚠️ Failed to send production email: ${res.error}`);
            })
            .catch(err => console.error('⚠️ Production assignment email error:', err.message));
        }
      } catch (emailErr) {
        console.error('⚠️ Failed to prepare production notification:', emailErr.message);
      }

      return {
        success: true,
        message: 'Task assigned successfully',
        task,
        assignedTo: bestCandidate.user,
        score: bestCandidate.score,
        reason: bestCandidate.reason,
        alternativeCandidates: scoredCandidates.slice(1, 4) // Top 3 alternatives
      };
    } catch (error) {
      console.error('Error assigning task:', error);
      throw error;
    }
  }

  /**
   * Find candidate users for a task
   */
  async findCandidates(task, options = {}) {
    const query = {
      isActive: true
    };

    // Filter by organization if multi-tenant
    if (task.organization) {
      query.organization = task.organization;
    }

    // Filter by required role
    if (task.assignedRole) {
      query.workflowRole = task.assignedRole;
    }

    // Get users with matching role
    let candidates = await User.find(query).select(
      'firstName lastName email employeeId workflowRole department roles isActive'
    );

    // Additional filtering based on options
    if (options.mustBeAvailable) {
      candidates = await this.filterByAvailability(candidates);
    }

    return candidates;
  }

  /**
   * Score candidates based on multiple factors
   */
  async scoreCandidates(task, candidates) {
    const scoredCandidates = [];

    for (const candidate of candidates) {
      // Calculate component scores
      const performanceScore = await this.calculatePerformanceScore(candidate, task);
      const workloadScore = await this.calculateWorkloadScore(candidate);
      const specializationScore = await this.calculateSpecializationScore(candidate, task);
      const availabilityScore = await this.calculateAvailabilityScore(candidate, task);

      // Weighted final score
      // Performance: 40%, Workload: 30%, Specialization: 20%, Availability: 10%
      const finalScore = (
        (performanceScore * 0.40) +
        (workloadScore * 0.30) +
        (specializationScore * 0.20) +
        (availabilityScore * 0.10)
      );

      // Generate reason
      const reason = this.generateAssignmentReason(
        performanceScore,
        workloadScore,
        specializationScore,
        availabilityScore
      );

      scoredCandidates.push({
        user: candidate,
        score: Math.round(finalScore * 100) / 100,
        performanceScore,
        workloadScore,
        specializationScore,
        availabilityScore,
        reason
      });
    }

    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    return scoredCandidates;
  }

  /**
   * Calculate performance score (0-100)
   * Based on past task completion rate, quality, and timeliness
   */
  async calculatePerformanceScore(user, task) {
    const pastTasks = await Task.find({
      assignedTo: user._id,
      taskType: task.taskType,
      status: 'COMPLETED'
    }).limit(20);

    if (pastTasks.length === 0) {
      return 70; // Default score for new users
    }

    let totalScore = 0;
    let count = 0;

    for (const pastTask of pastTasks) {
      let taskScore = 100;

      // Quality score (based on QC if applicable)
      if (pastTask.requiresQC && pastTask.qcStatus === 'PASSED') {
        taskScore += 10;
      } else if (pastTask.qcStatus === 'FAILED') {
        taskScore -= 30;
      }

      // Timeliness score
      if (pastTask.completedAt && pastTask.dueDate) {
        const onTime = pastTask.completedAt <= pastTask.dueDate;
        if (onTime) {
          taskScore += 10;
        } else {
          const hoursLate = (pastTask.completedAt - pastTask.dueDate) / (1000 * 60 * 60);
          taskScore -= Math.min(hoursLate * 2, 20);
        }
      }

      // Efficiency score (actual vs estimated time)
      if (pastTask.actualDurationMinutes && pastTask.estimatedDurationMinutes) {
        const ratio = pastTask.actualDurationMinutes / pastTask.estimatedDurationMinutes;
        if (ratio <= 1) {
          taskScore += 10; // Completed faster than estimated
        } else if (ratio > 1.5) {
          taskScore -= 10; // Took significantly longer
        }
      }

      totalScore += taskScore;
      count++;
    }

    const avgScore = totalScore / count;
    return Math.max(0, Math.min(100, avgScore)); // Clamp between 0-100
  }

  /**
   * Calculate workload score (0-100)
   * Lower workload = higher score
   */
  async calculateWorkloadScore(user) {
    // Get pending tasks
    const pendingTasks = await Task.countDocuments({
      assignedTo: user._id,
      status: { $in: ['PENDING', 'READY', 'ASSIGNED', 'IN_PROGRESS'] }
    });

    // Get total estimated time remaining
    const activeTasks = await Task.find({
      assignedTo: user._id,
      status: { $in: ['ASSIGNED', 'IN_PROGRESS'] }
    }).select('estimatedDurationMinutes actualDurationMinutes startedAt');

    let totalMinutesRemaining = 0;
    for (const task of activeTasks) {
      if (task.status === 'IN_PROGRESS' && task.startedAt) {
        const elapsed = (Date.now() - task.startedAt) / 60000;
        const remaining = Math.max(0, (task.estimatedDurationMinutes || 60) - elapsed);
        totalMinutesRemaining += remaining;
      } else {
        totalMinutesRemaining += task.estimatedDurationMinutes || 60;
      }
    }

    // Score based on workload
    // 0 tasks = 100, 10+ tasks = 0
    const taskScore = Math.max(0, 100 - (pendingTasks * 10));

    // 0 hours = 100, 40+ hours = 0
    const timeScore = Math.max(0, 100 - (totalMinutesRemaining / 60 * 2.5));

    // Weighted average (tasks: 60%, time: 40%)
    const finalScore = (taskScore * 0.6) + (timeScore * 0.4);

    return Math.round(finalScore);
  }

  /**
   * Calculate specialization score (0-100)
   * Based on task type match and past experience
   */
  async calculateSpecializationScore(user, task) {
    let score = 50; // Base score

    // Role match
    if (user.workflowRole === task.assignedRole) {
      score += 30;
    }

    // Department match
    const taskDepartmentMap = {
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

    if (taskDepartmentMap[task.taskType] === user.department) {
      score += 20;
    }

    // Experience with this task type
    const experienceCount = await Task.countDocuments({
      assignedTo: user._id,
      taskType: task.taskType,
      status: 'COMPLETED'
    });

    if (experienceCount > 0) {
      score += Math.min(experienceCount * 2, 20); // Max 20 points for experience
    }

    // Machine qualification (if task requires machine)
    if (task.requiredMachine) {
      const machine = await Machine.findById(task.requiredMachine);
      if (machine && machine.qualifiedOperators) {
        const isQualified = machine.qualifiedOperators.some(
          op => op.toString() === user._id.toString()
        );
        if (isQualified) {
          score += 10;
        } else {
          score -= 20; // Penalty for not being qualified
        }
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate availability score (0-100)
   */
  async calculateAvailabilityScore(user, task) {
    let score = 100;

    // Check if user has any HIGH or URGENT priority tasks in progress
    const highPriorityTasks = await Task.countDocuments({
      assignedTo: user._id,
      status: 'IN_PROGRESS',
      priority: { $in: ['HIGH', 'URGENT'] }
    });

    if (highPriorityTasks > 0) {
      score -= highPriorityTasks * 20;
    }

    // Check for overdue tasks
    const overdueTasks = await Task.countDocuments({
      assignedTo: user._id,
      status: { $ne: 'COMPLETED' },
      dueDate: { $lt: new Date() }
    });

    if (overdueTasks > 0) {
      score -= overdueTasks * 15;
    }

    // Check machine availability if required
    if (task.requiredMachine) {
      const machine = await Machine.findById(task.requiredMachine);
      if (machine) {
        if (machine.operationalStatus !== 'OPERATIONAL') {
          score -= 50; // Major penalty for non-operational machine
        }

        // Check if machine is scheduled for maintenance soon
        if (machine.maintenanceSchedule && machine.maintenanceSchedule.nextMaintenanceDate) {
          const daysUntilMaintenance = (machine.maintenanceSchedule.nextMaintenanceDate - Date.now()) / (1000 * 60 * 60 * 24);
          if (daysUntilMaintenance < 2) {
            score -= 20; // Penalty if maintenance is imminent
          }
        }
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate human-readable assignment reason
   */
  generateAssignmentReason(performance, workload, specialization, availability) {
    const reasons = [];

    if (performance > 80) reasons.push('excellent track record');
    else if (performance > 60) reasons.push('good performance history');

    if (workload > 70) reasons.push('low current workload');
    else if (workload < 30) reasons.push('high current workload');

    if (specialization > 80) reasons.push('highly specialized for this task');
    else if (specialization > 60) reasons.push('relevant experience');

    if (availability < 50) reasons.push('limited availability');

    if (reasons.length === 0) reasons.push('best available match');

    return `Assigned due to: ${reasons.join(', ')}`;
  }

  /**
   * Filter candidates by availability
   */
  async filterByAvailability(candidates) {
    const available = [];

    for (const candidate of candidates) {
      const urgentTasks = await Task.countDocuments({
        assignedTo: candidate._id,
        status: 'IN_PROGRESS',
        priority: 'URGENT'
      });

      if (urgentTasks === 0) {
        available.push(candidate);
      }
    }

    return available.length > 0 ? available : candidates;
  }

  /**
   * Auto-assign all ready tasks for an order
   */
  async autoAssignOrderTasks(orderId, options = {}) {
    const readyTasks = await Task.find({
      order: orderId,
      status: 'READY',
      assignedTo: null
    }).sort({ sequence: 1 });

    const results = [];

    for (const task of readyTasks) {
      try {
        const result = await this.assignTask(task._id, options);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          task: task,
          error: error.message
        });
      }
    }

    return {
      total: readyTasks.length,
      assigned: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Reassign task to different user
   */
  async reassignTask(taskId, newUserId, reassignedBy, reason) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const oldUser = task.assignedTo;

    task.assignedTo = newUserId;
    task.assignedBy = reassignedBy;
    task.assignedAt = new Date();
    task.statusHistory.push({
      status: 'ASSIGNED',
      changedBy: reassignedBy,
      changedAt: new Date(),
      notes: `Reassigned from user ${oldUser}. Reason: ${reason}`
    });

    await task.save();

    // Trigger Email Notification for Reassignment
    try {
      const newUserObj = await User.findById(newUserId);
      const populatedTask = await Task.findById(task._id).populate({
        path: 'order',
        populate: { path: 'customer', select: 'fullName firstName lastName' }
      });

      if (newUserObj && newUserObj.email && populatedTask) {
        EmailService.sendProductionTaskAssignmentEmail(populatedTask, newUserObj)
          .then(res => {
            if (res.success) console.log(`✉️ Reassignment email sent to ${newUserObj.email}`);
            else console.warn(`⚠️ Failed to send reassignment email: ${res.error}`);
          })
          .catch(err => console.error('⚠️ Reassignment email error:', err.message));
      }
    } catch (emailErr) {
      console.error('⚠️ Failed to send reassignment notification:', emailErr.message);
    }

    return {
      success: true,
      message: 'Task reassigned successfully',
      task,
      oldUser,
      newUser: newUserId
    };
  }

  /**
   * Get assignment recommendations for a task
   */
  async getAssignmentRecommendations(taskId, limit = 5) {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const candidates = await this.findCandidates(task);
    const scoredCandidates = await this.scoreCandidates(task, candidates);

    return scoredCandidates.slice(0, limit);
  }

  /**
   * Get workload statistics for a user
   */
  async getUserWorkload(userId) {
    const tasks = await Task.find({
      assignedTo: userId,
      status: { $in: ['PENDING', 'READY', 'ASSIGNED', 'IN_PROGRESS'] }
    }).select('taskType priority estimatedDurationMinutes status dueDate');

    const stats = {
      totalTasks: tasks.length,
      byPriority: {
        URGENT: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0
      },
      byStatus: {
        PENDING: 0,
        READY: 0,
        ASSIGNED: 0,
        IN_PROGRESS: 0
      },
      estimatedHoursRemaining: 0,
      overdueTasks: 0
    };

    const now = new Date();
    tasks.forEach(task => {
      stats.byPriority[task.priority]++;
      stats.byStatus[task.status]++;
      stats.estimatedHoursRemaining += (task.estimatedDurationMinutes || 60) / 60;
      if (task.dueDate && task.dueDate < now) {
        stats.overdueTasks++;
      }
    });

    stats.estimatedHoursRemaining = Math.round(stats.estimatedHoursRemaining * 10) / 10;

    return stats;
  }

  /**
   * Get team workload distribution
   */
  async getTeamWorkload(department) {
    const users = await User.find({
      department,
      isActive: true
    }).select('firstName lastName employeeId');

    const workloads = [];

    for (const user of users) {
      const workload = await this.getUserWorkload(user._id);
      workloads.push({
        user: {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          employeeId: user.employeeId
        },
        workload
      });
    }

    // Sort by total tasks descending
    workloads.sort((a, b) => b.workload.totalTasks - a.workload.totalTasks);

    return workloads;
  }
}

module.exports = new TaskAssignmentService();
