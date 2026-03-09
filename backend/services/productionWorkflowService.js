const Task = require('../models/Task');
const Order = require('../models/vlite/Order');
const WorkflowStep = require('../models/vlite/WorkflowStep');
const Machine = require('../models/vlite/Machine');

/**
 * Production Workflow Service
 * Manages workflow definitions and automatic task generation for production orders
 */

// Workflow Templates
const WORKFLOW_TEMPLATES = {
  WOOD: {
    name: 'Wood Production Workflow',
    stages: [
      {
        sequence: 1,
        name: 'Beam Saw Operation',
        taskType: 'PRODUCTION_BEAM_SAW',
        assignedRole: 'BEAMSAW_OPERATOR',
        workflowStage: 'PRODUCTION',
        estimatedMinutes: 60,
        requiresQC: false,
        machineType: 'PANEL_SAW',
        description: 'Cut panels to required dimensions using beam saw'
      },
      {
        sequence: 2,
        name: 'Edge Banding',
        taskType: 'PRODUCTION_EDGE_BANDING',
        assignedRole: 'EDGEBANDING_OPERATOR',
        workflowStage: 'PRODUCTION',
        estimatedMinutes: 45,
        requiresQC: false,
        machineType: 'EDGEBANDING_MACHINE',
        description: 'Apply edge banding to cut panels'
      },
      {
        sequence: 3,
        name: 'Boring Operation',
        taskType: 'PRODUCTION_BORING',
        assignedRole: 'BORING_OPERATOR',
        workflowStage: 'PRODUCTION',
        estimatedMinutes: 30,
        requiresQC: false,
        machineType: 'DRILLING_MACHINE',
        description: 'Drill holes as per specifications'
      },
      {
        sequence: 4,
        name: 'Finishing',
        taskType: 'PRODUCTION_FINISHING',
        assignedRole: 'FINISHING_OPERATOR',
        workflowStage: 'PRODUCTION',
        estimatedMinutes: 90,
        requiresQC: true,
        machineType: 'SPRAY_BOOTH',
        description: 'Apply surface finish and polish'
      },
      {
        sequence: 5,
        name: 'Quality Check',
        taskType: 'QUALITY_CHECK',
        assignedRole: 'QC_INSPECTOR',
        workflowStage: 'QUALITY_ASSURANCE',
        estimatedMinutes: 20,
        requiresQC: false,
        description: 'Inspect finished product for quality standards'
      },
      {
        sequence: 6,
        name: 'Packaging',
        taskType: 'PRODUCTION_PACKAGING',
        assignedRole: 'PRODUCTION_MANAGER',
        workflowStage: 'POST_PRODUCTION',
        estimatedMinutes: 30,
        requiresQC: false,
        description: 'Package finished product for dispatch'
      }
    ]
  },
  
  STEEL: {
    name: 'Steel Production Workflow',
    stages: [
      {
        sequence: 1,
        name: 'Steel Cutting',
        taskType: 'PRODUCTION_STEEL_CUTTING',
        assignedRole: 'CNC_OPERATOR',
        workflowStage: 'PRODUCTION',
        estimatedMinutes: 45,
        requiresQC: false,
        machineType: 'PANEL_SAW',
        description: 'Cut steel sheets to required dimensions'
      },
      {
        sequence: 2,
        name: 'CNC Cutting',
        taskType: 'PRODUCTION_CNC_CUTTING',
        assignedRole: 'CNC_OPERATOR',
        workflowStage: 'PRODUCTION',
        estimatedMinutes: 90,
        requiresQC: false,
        machineType: 'CNC_MACHINE',
        description: 'Precision cutting using CNC machine'
      },
      {
        sequence: 3,
        name: 'Bending Operation',
        taskType: 'PRODUCTION_BENDING',
        assignedRole: 'CNC_OPERATOR',
        workflowStage: 'PRODUCTION',
        estimatedMinutes: 60,
        requiresQC: false,
        description: 'Bend steel components as per design'
      },
      {
        sequence: 4,
        name: 'Welding',
        taskType: 'PRODUCTION_WELDING',
        assignedRole: 'WELDING_OPERATOR',
        workflowStage: 'PRODUCTION',
        estimatedMinutes: 120,
        requiresQC: true,
        description: 'Weld components together'
      },
      {
        sequence: 5,
        name: 'Finishing & Coating',
        taskType: 'PRODUCTION_FINISHING',
        assignedRole: 'FINISHING_OPERATOR',
        workflowStage: 'PRODUCTION',
        estimatedMinutes: 90,
        requiresQC: true,
        machineType: 'SPRAY_BOOTH',
        description: 'Apply surface treatment and coating'
      },
      {
        sequence: 6,
        name: 'Quality Check',
        taskType: 'QUALITY_CHECK',
        assignedRole: 'QC_INSPECTOR',
        workflowStage: 'QUALITY_ASSURANCE',
        estimatedMinutes: 25,
        requiresQC: false,
        description: 'Inspect welded and finished product'
      },
      {
        sequence: 7,
        name: 'Packaging',
        taskType: 'PRODUCTION_PACKAGING',
        assignedRole: 'PRODUCTION_MANAGER',
        workflowStage: 'POST_PRODUCTION',
        estimatedMinutes: 40,
        requiresQC: false,
        description: 'Package steel product for dispatch'
      }
    ]
  }
};

// Pre-production tasks (common for both workflows)
const PRE_PRODUCTION_TASKS = [
  {
    sequence: -2,
    name: 'Design Approval',
    taskType: 'DESIGN_CREATION',
    assignedRole: 'DESIGN_LEAD',
    workflowStage: 'PRE_PRODUCTION',
    estimatedMinutes: 120,
    requiresQC: false,
    priority: 'HIGH',
    description: 'Review and approve design drawings'
  },
  {
    sequence: -1,
    name: 'Material Allocation',
    taskType: 'MATERIAL_ALLOCATION',
    assignedRole: 'INVENTORY_MANAGER',
    workflowStage: 'PRE_PRODUCTION',
    estimatedMinutes: 30,
    requiresQC: false,
    priority: 'HIGH',
    description: 'Allocate and reserve required materials from inventory'
  }
];

// Post-production tasks
const POST_PRODUCTION_TASKS = [
  {
    sequence: 100,
    name: 'Dispatch Preparation',
    taskType: 'DISPATCH_PREPARATION',
    assignedRole: 'LOGISTICS_HEAD',
    workflowStage: 'DISPATCH',
    estimatedMinutes: 45,
    requiresQC: false,
    description: 'Prepare dispatch documentation and arrange logistics'
  }
];

class ProductionWorkflowService {
  /**
   * Generate tasks for an order based on product type
   */
  async generateWorkflowTasks(order, options = {}) {
    try {
      const {
        includePreProduction = true,
        includePostProduction = true,
        priority = 'MEDIUM',
        autoAssign = true
      } = options;

      const tasks = [];
      const productType = order.productType || 'Wood';
      const workflow = WORKFLOW_TEMPLATES[productType.toUpperCase()] || WORKFLOW_TEMPLATES.WOOD;

      // Pre-production tasks
      if (includePreProduction) {
        for (const taskTemplate of PRE_PRODUCTION_TASKS) {
          const task = await this.createTaskFromTemplate(order, taskTemplate, {
            priority: taskTemplate.priority || priority,
            autoAssign
          });
          tasks.push(task);
        }
      }

      // Main production workflow tasks
      let previousTask = null;
      for (const stageTemplate of workflow.stages) {
        const task = await this.createTaskFromTemplate(order, stageTemplate, {
          priority,
          autoAssign,
          dependsOn: previousTask ? [previousTask._id] : []
        });
        tasks.push(task);
        previousTask = task;
      }

      // Post-production tasks
      if (includePostProduction) {
        for (const taskTemplate of POST_PRODUCTION_TASKS) {
          const task = await this.createTaskFromTemplate(order, taskTemplate, {
            priority: taskTemplate.priority || priority,
            autoAssign,
            dependsOn: previousTask ? [previousTask._id] : []
          });
          tasks.push(task);
        }
      }

      // Update order with task references
      order.tasks = tasks.map(t => t._id);
      await order.save();

      return {
        success: true,
        workflow: workflow.name,
        tasksCreated: tasks.length,
        tasks
      };
    } catch (error) {
      console.error('Error generating workflow tasks:', error);
      throw error;
    }
  }

  /**
   * Create a task from template
   */
  async createTaskFromTemplate(order, template, options = {}) {
    const {
      priority = 'MEDIUM',
      autoAssign = true,
      dependsOn = []
    } = options;

    // Calculate due date based on estimated duration and current progress
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + Math.ceil(template.estimatedMinutes / 60));

    // Generate task number
    const year = new Date().getFullYear();
    const count = await Task.countDocuments({
      taskNumber: new RegExp(`^TSK-${year}-`)
    });
    const taskNumber = `TSK-${year}-${String(count + 1).padStart(4, '0')}`;

    const taskData = {
      taskNumber,
      title: template.name,
      description: template.description,
      taskType: template.taskType,
      order: order._id,
      quotation: order.quotation,
      workflowStage: template.workflowStage,
      sequence: template.sequence,
      assignedRole: template.assignedRole,
      dependsOn,
      status: dependsOn.length > 0 ? 'PENDING' : 'READY',
      priority,
      estimatedDurationMinutes: template.estimatedMinutes,
      dueDate,
      requiresQC: template.requiresQC,
      qcStatus: template.requiresQC ? 'PENDING' : 'NOT_REQUIRED',
      autoGenerated: true,
      generatedBy: 'PRODUCTION_ORDER',
      organization: order.organization
    };

    // Find and assign machine if specified
    if (template.machineType) {
      const machine = await Machine.findOne({
        machineType: template.machineType,
        operationalStatus: 'OPERATIONAL',
        organization: order.organization
      }).sort({ 'performanceMetrics.utilizationRate': 1 }); // Prefer less utilized machines

      if (machine) {
        taskData.requiredMachine = machine._id;
      }
    }

    const task = new Task(taskData);
    await task.save();

    // Auto-assign if enabled (will be done by assignment service)
    if (autoAssign) {
      // Mark for auto-assignment (will be picked up by task assignment service)
      task.status = 'READY';
      await task.save();
    }

    return task;
  }

  /**
   * Get workflow template for product type
   */
  getWorkflowTemplate(productType) {
    return WORKFLOW_TEMPLATES[productType.toUpperCase()] || WORKFLOW_TEMPLATES.WOOD;
  }

  /**
   * Get next task in workflow
   */
  async getNextTask(currentTask) {
    const nextTask = await Task.findOne({
      order: currentTask.order,
      sequence: { $gt: currentTask.sequence }
    }).sort({ sequence: 1 });

    return nextTask;
  }

  /**
   * Get all tasks for an order grouped by stage
   */
  async getOrderTasksByStage(orderId) {
    const tasks = await Task.find({ order: orderId })
      .populate('assignedTo requiredMachine')
      .sort({ sequence: 1 });

    const tasksByStage = {
      PRE_PRODUCTION: [],
      PRODUCTION: [],
      POST_PRODUCTION: [],
      QUALITY_ASSURANCE: [],
      DISPATCH: [],
      SUPPORT: []
    };

    tasks.forEach(task => {
      if (tasksByStage[task.workflowStage]) {
        tasksByStage[task.workflowStage].push(task);
      }
    });

    return tasksByStage;
  }

  /**
   * Check if task dependencies are satisfied
   */
  async areDependenciesSatisfied(taskId) {
    const task = await Task.findById(taskId).populate('dependsOn');
    
    if (!task || !task.dependsOn || task.dependsOn.length === 0) {
      return true;
    }

    return task.dependsOn.every(dep => dep.status === 'COMPLETED');
  }

  /**
   * Mark task as ready if dependencies are satisfied
   */
  async checkAndUpdateTaskStatus(taskId) {
    const satisfied = await this.areDependenciesSatisfied(taskId);
    
    if (satisfied) {
      const task = await Task.findById(taskId);
      if (task && task.status === 'PENDING') {
        task.status = 'READY';
        await task.save();
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get workflow progress for an order
   */
  async getWorkflowProgress(orderId) {
    const tasks = await Task.find({ order: orderId });
    
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const pending = tasks.filter(t => t.status === 'PENDING').length;
    const ready = tasks.filter(t => t.status === 'READY').length;
    
    const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate stage progress
    const stageProgress = {};
    const stages = ['PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION', 'QUALITY_ASSURANCE', 'DISPATCH'];
    
    for (const stage of stages) {
      const stageTasks = tasks.filter(t => t.workflowStage === stage);
      const stageCompleted = stageTasks.filter(t => t.status === 'COMPLETED').length;
      stageProgress[stage] = {
        total: stageTasks.length,
        completed: stageCompleted,
        percentage: stageTasks.length > 0 ? Math.round((stageCompleted / stageTasks.length) * 100) : 0
      };
    }

    return {
      total,
      completed,
      inProgress,
      pending,
      ready,
      progressPercentage,
      stageProgress,
      currentStage: this.determineCurrentStage(tasks)
    };
  }

  /**
   * Determine current workflow stage
   */
  determineCurrentStage(tasks) {
    const stages = ['PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION', 'QUALITY_ASSURANCE', 'DISPATCH'];
    
    for (const stage of stages) {
      const stageTasks = tasks.filter(t => t.workflowStage === stage);
      const hasIncomplete = stageTasks.some(t => t.status !== 'COMPLETED');
      
      if (hasIncomplete) {
        return stage;
      }
    }
    
    return 'COMPLETED';
  }

  /**
   * Update dependent tasks when a task is completed
   */
  async updateDependentTasks(completedTaskId) {
    const dependentTasks = await Task.find({
      dependsOn: completedTaskId,
      status: 'PENDING'
    });

    const updatedTasks = [];
    for (const task of dependentTasks) {
      const canStart = await this.areDependenciesSatisfied(task._id);
      if (canStart) {
        task.status = 'READY';
        await task.save();
        updatedTasks.push(task);
      }
    }

    return updatedTasks;
  }

  /**
   * Get available workflows
   */
  getAvailableWorkflows() {
    return Object.keys(WORKFLOW_TEMPLATES).map(key => ({
      type: key,
      name: WORKFLOW_TEMPLATES[key].name,
      stages: WORKFLOW_TEMPLATES[key].stages.length,
      estimatedTime: WORKFLOW_TEMPLATES[key].stages.reduce((sum, stage) => sum + stage.estimatedMinutes, 0)
    }));
  }

  /**
   * Validate workflow template
   */
  validateWorkflowTemplate(template) {
    if (!template.stages || !Array.isArray(template.stages)) {
      return { valid: false, error: 'Workflow must have stages array' };
    }

    if (template.stages.length === 0) {
      return { valid: false, error: 'Workflow must have at least one stage' };
    }

    for (const stage of template.stages) {
      if (!stage.taskType || !stage.assignedRole) {
        return { valid: false, error: 'Each stage must have taskType and assignedRole' };
      }
    }

    return { valid: true };
  }
}

module.exports = new ProductionWorkflowService();
