const Order = require('../models/vlite/Order');
const Quotation = require('../models/vlite/Quotation');
const Task = require('../models/Task');
const RawMaterial = require('../models/vlite/RawMaterial');
const productionWorkflowService = require('./productionWorkflowService');
const taskAssignmentService = require('./taskAssignmentService');

/**
 * Order Automation Service
 * Handles automatic conversion of approved quotations to production orders
 * with BOM generation, material allocation, and task creation
 */

class OrderAutomationService {
  /**
   * Convert approved quotation to production order with full automation
   */
  async convertQuotationToOrder(quotationId, options = {}) {
    try {
      const quotation = await Quotation.findById(quotationId)
        .populate('customer')
        .populate('items.product');

      if (!quotation) {
        throw new Error('Quotation not found');
      }

      if (quotation.approvalStatus !== 'APPROVED') {
        throw new Error('Quotation must be approved before conversion');
      }

      if (quotation.convertedToOrder) {
        throw new Error('Quotation already converted to order');
      }

      // Step 1: Create production order
      const order = await this.createProductionOrder(quotation, options);

      // Step 2: Generate BOM for order items
      await this.generateBOMForOrder(order, quotation);

      // Step 3: Check and allocate materials
      const materialAllocation = await this.checkMaterialAvailability(order);

      // Step 4: Generate workflow tasks
      const workflowResult = await productionWorkflowService.generateWorkflowTasks(order, {
        includePreProduction: true,
        includePostProduction: true,
        priority: options.priority || this.calculateOrderPriority(quotation),
        autoAssign: options.autoAssign !== false
      });

      // Step 5: Auto-assign tasks
      const assignmentResult = await taskAssignmentService.autoAssignOrderTasks(order._id, {
        assignedBy: options.createdBy
      });

      // Step 6: Update quotation
      quotation.convertedToOrder = true;
      quotation.order = order._id;
      await quotation.save();

      // Step 7: Publish event for smart automation
      await this.publishOrderCreatedEvent(order, quotation);

      return {
        success: true,
        order,
        workflowResult,
        assignmentResult,
        materialAllocation,
        message: 'Order created successfully with automated workflow'
      };
    } catch (error) {
      console.error('Error converting quotation to order:', error);
      throw error;
    }
  }

  /**
   * Create production order from quotation
   */
  async createProductionOrder(quotation, options = {}) {
    // Generate order number
    const year = new Date().getFullYear();
    const count = await Order.countDocuments({
      orderNumber: new RegExp(`^ORD-${year}-`)
    });
    const orderNumber = `ORD-${year}-${String(count + 1).padStart(4, '0')}`;

    // Map quotation items to order items
    const orderItems = quotation.items.map(item => ({
      product: item.product,
      description: item.description || item.product?.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      taxPerUnit: item.taxPerUnit || 0,
      amount: item.amount,
      productionStatus: 'PENDING',
      bom: [], // Will be populated in next step
      assignedMachines: [],
      assignedWorkers: []
    }));

    // Calculate totals
    const subtotal = quotation.subtotal || orderItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = quotation.taxAmount || 0;
    const total = quotation.total || subtotal + taxAmount;

    // Determine product type from quotation or items
    const productType = quotation.productType || this.determineProductType(quotation.items);

    // Create order
    const order = new Order({
      orderNumber,
      orderDate: new Date(),
      customer: quotation.customer,
      quotation: quotation._id,
      inquiry: quotation.inquiry,
      items: orderItems,
      orderStatus: 'CONFIRMED',
      productType,
      subtotal,
      taxAmount,
      total,
      paymentTerms: quotation.paymentTerms || {},
      deliveryTerms: quotation.deliveryTerms || {},
      createdBy: options.createdBy,
      organization: quotation.organization,
      
      // Initialize workflow status
      woodWorkflowStatus: productType === 'Wood' ? {
        beamSaw: false,
        edgeBending: false,
        boringMachine: false,
        finish: false,
        packaging: false
      } : undefined,
      
      steelWorkflowStatus: productType === 'Steel' ? {
        steelCutting: false,
        cncCutting: false,
        bending: false,
        welding: false,
        finishing: false,
        packaging: false
      } : undefined,
      
      statusHistory: [{
        status: 'CONFIRMED',
        changedBy: options.createdBy,
        changedAt: new Date(),
        notes: 'Order created from approved quotation'
      }]
    });

    await order.save();
    return order;
  }

  /**
   * Generate Bill of Materials (BOM) for order items
   */
  async generateBOMForOrder(order, quotation) {
    // This is a simplified BOM generation
    // In a real system, this would be based on product specifications and recipes
    
    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const bom = [];

      // Generate BOM based on product type and specifications
      if (order.productType === 'Wood') {
        bom.push(
          {
            material: 'Plywood Sheet',
            requiredQuantity: item.quantity * 2,
            unit: 'sheets',
            allocatedQuantity: 0,
            allocated: false
          },
          {
            material: 'Edge Banding Tape',
            requiredQuantity: item.quantity * 10,
            unit: 'meters',
            allocatedQuantity: 0,
            allocated: false
          },
          {
            material: 'Wood Screws',
            requiredQuantity: item.quantity * 20,
            unit: 'pieces',
            allocatedQuantity: 0,
            allocated: false
          },
          {
            material: 'Wood Finish',
            requiredQuantity: item.quantity * 0.5,
            unit: 'liters',
            allocatedQuantity: 0,
            allocated: false
          }
        );
      } else if (order.productType === 'Steel') {
        bom.push(
          {
            material: 'Steel Sheet',
            requiredQuantity: item.quantity * 1.5,
            unit: 'sheets',
            allocatedQuantity: 0,
            allocated: false
          },
          {
            material: 'Welding Rods',
            requiredQuantity: item.quantity * 5,
            unit: 'pieces',
            allocatedQuantity: 0,
            allocated: false
          },
          {
            material: 'Steel Bolts',
            requiredQuantity: item.quantity * 15,
            unit: 'pieces',
            allocatedQuantity: 0,
            allocated: false
          },
          {
            material: 'Metal Paint',
            requiredQuantity: item.quantity * 0.3,
            unit: 'liters',
            allocatedQuantity: 0,
            allocated: false
          }
        );
      }

      order.items[i].bom = bom;
    }

    await order.save();
    return order;
  }

  /**
   * Check material availability and create allocation tasks
   */
  async checkMaterialAvailability(order) {
    const allMaterials = [];
    const lowStockMaterials = [];
    const unavailableMaterials = [];

    // Collect all materials from BOM
    for (const item of order.items) {
      if (item.bom) {
        for (const bomItem of item.bom) {
          allMaterials.push({
            material: bomItem.material,
            required: bomItem.requiredQuantity,
            unit: bomItem.unit
          });
        }
      }
    }

    // Check inventory for each material
    for (const material of allMaterials) {
      try {
        const inventory = await RawMaterial.findOne({
          name: new RegExp(material.material, 'i'),
          organization: order.organization
        });

        if (!inventory) {
          unavailableMaterials.push({
            ...material,
            status: 'NOT_IN_INVENTORY',
            available: 0
          });
        } else if (inventory.currentStock < material.required) {
          lowStockMaterials.push({
            ...material,
            status: 'LOW_STOCK',
            available: inventory.currentStock,
            shortage: material.required - inventory.currentStock
          });
        }
      } catch (error) {
        console.error(`Error checking material ${material.material}:`, error);
      }
    }

    // Create purchase request task if materials are low or unavailable
    if (lowStockMaterials.length > 0 || unavailableMaterials.length > 0) {
      await this.createMaterialPurchaseTask(order, [...lowStockMaterials, ...unavailableMaterials]);
    }

    return {
      totalMaterials: allMaterials.length,
      lowStock: lowStockMaterials.length,
      unavailable: unavailableMaterials.length,
      allAvailable: lowStockMaterials.length === 0 && unavailableMaterials.length === 0,
      details: {
        lowStockMaterials,
        unavailableMaterials
      }
    };
  }

  /**
   * Create material purchase task
   */
  async createMaterialPurchaseTask(order, materials) {
    const materialList = materials.map(m => 
      `${m.material}: ${m.shortage || m.required} ${m.unit} (${m.status})`
    ).join('\n');

    const task = new Task({
      title: 'Material Purchase Required',
      description: `Materials needed for Order ${order.orderNumber}:\n\n${materialList}`,
      taskType: 'INVENTORY_PURCHASE',
      order: order._id,
      quotation: order.quotation,
      workflowStage: 'PRE_PRODUCTION',
      sequence: -3, // Before design and material allocation
      assignedRole: 'INVENTORY_MANAGER',
      status: 'READY',
      priority: 'HIGH',
      estimatedDurationMinutes: 120,
      autoGenerated: true,
      generatedBy: 'PRODUCTION_ORDER',
      organization: order.organization,
      resultData: { materials }
    });

    await task.save();
    return task;
  }

  /**
   * Determine product type from items
   */
  determineProductType(items) {
    // Logic to determine if order is primarily Wood or Steel
    // This is simplified - you would check product categories/types
    return 'Wood'; // Default to Wood
  }

  /**
   * Calculate order priority based on quotation data
   */
  calculateOrderPriority(quotation) {
    // Priority logic:
    // - HIGH: Total > 100000 or delivery < 7 days
    // - URGENT: Total > 500000 or delivery < 3 days
    // - MEDIUM: Default
    // - LOW: Total < 20000 and delivery > 30 days

    const total = quotation.total || 0;
    const deliveryDays = quotation.deliveryTerms?.estimatedDays || 30;

    if (total > 500000 || deliveryDays < 3) {
      return 'URGENT';
    } else if (total > 100000 || deliveryDays < 7) {
      return 'HIGH';
    } else if (total < 20000 && deliveryDays > 30) {
      return 'LOW';
    }

    return 'MEDIUM';
  }

  /**
   * Publish order created event to smart automation system
   */
  async publishOrderCreatedEvent(order, quotation) {
    // This would integrate with the Python-based smart automation event bus
    // For now, we'll log the event
    
    const event = {
      eventType: 'production.order_created',
      timestamp: new Date().toISOString(),
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        quotationId: quotation._id,
        quotationNumber: quotation.quotationNumber,
        customerId: order.customer,
        total: order.total,
        productType: order.productType,
        priority: order.priority || 'MEDIUM'
      }
    };

    console.log('Order Created Event:', event);

    // TODO: Integrate with AI/smart_automation/engine/event_bus.py
    // This would call the Python bridge to publish the event

    return event;
  }

  /**
   * Update order workflow status based on task completion
   */
  async updateOrderWorkflowStatus(orderId, taskType) {
    const order = await Order.findById(orderId);
    if (!order) return;

    // Map task types to workflow status fields
    const workflowMap = {
      // Wood workflow
      'PRODUCTION_BEAM_SAW': { type: 'Wood', field: 'woodWorkflowStatus.beamSaw' },
      'PRODUCTION_EDGE_BANDING': { type: 'Wood', field: 'woodWorkflowStatus.edgeBending' },
      'PRODUCTION_BORING': { type: 'Wood', field: 'woodWorkflowStatus.boringMachine' },
      'PRODUCTION_FINISHING': { type: 'Wood', field: 'woodWorkflowStatus.finish' },
      'PRODUCTION_PACKAGING': { type: 'Wood', field: 'woodWorkflowStatus.packaging' },
      
      // Steel workflow
      'PRODUCTION_STEEL_CUTTING': { type: 'Steel', field: 'steelWorkflowStatus.steelCutting' },
      'PRODUCTION_CNC_CUTTING': { type: 'Steel', field: 'steelWorkflowStatus.cncCutting' },
      'PRODUCTION_BENDING': { type: 'Steel', field: 'steelWorkflowStatus.bending' },
      'PRODUCTION_WELDING': { type: 'Steel', field: 'steelWorkflowStatus.welding' }
    };

    const mapping = workflowMap[taskType];
    if (mapping && order.productType === mapping.type) {
      const fieldParts = mapping.field.split('.');
      if (fieldParts.length === 2) {
        order[fieldParts[0]][fieldParts[1]] = true;
      }
      
      // Check if all workflow steps are complete
      const workflowStatus = order.productType === 'Wood' ? order.woodWorkflowStatus : order.steelWorkflowStatus;
      const allComplete = Object.values(workflowStatus).every(status => status === true);
      
      if (allComplete && order.orderStatus === 'IN_PRODUCTION') {
        order.orderStatus = 'COMPLETED';
        order.statusHistory.push({
          status: 'COMPLETED',
          changedAt: new Date(),
          notes: 'All production workflow steps completed'
        });
      } else if (order.orderStatus === 'CONFIRMED') {
        order.orderStatus = 'IN_PRODUCTION';
        order.statusHistory.push({
          status: 'IN_PRODUCTION',
          changedAt: new Date(),
          notes: 'Production workflow started'
        });
      }

      await order.save();
    }

    return order;
  }

  /**
   * Get order automation status
   */
  async getOrderAutomationStatus(orderId) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const tasks = await Task.find({ order: orderId }).sort({ sequence: 1 });
    const workflowProgress = await productionWorkflowService.getWorkflowProgress(orderId);

    const assignedTasks = tasks.filter(t => t.assignedTo).length;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;

    return {
      order: {
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        productType: order.productType
      },
      workflow: workflowProgress,
      tasks: {
        total: tasks.length,
        assigned: assignedTasks,
        completed: completedTasks,
        assignmentPercentage: tasks.length > 0 ? Math.round((assignedTasks / tasks.length) * 100) : 0
      },
      automation: {
        isFullyAutomated: assignedTasks === tasks.length,
        isComplete: completedTasks === tasks.length
      }
    };
  }

  /**
   * Retry failed automation for an order
   */
  async retryOrderAutomation(orderId) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Check for unassigned tasks
    const unassignedTasks = await Task.find({
      order: orderId,
      status: 'READY',
      assignedTo: null
    });

    const results = [];

    for (const task of unassignedTasks) {
      try {
        const result = await taskAssignmentService.assignTask(task._id);
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
      retriedTasks: unassignedTasks.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }
}

module.exports = new OrderAutomationService();
