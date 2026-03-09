/**
 * EXAMPLE: Updated Controller Pattern for Multi-Tenant Database Isolation
 * 
 * This example shows how to update existing controllers to use the new
 * tenant database middleware for proper data isolation.
 * 
 * Key Changes:
 * 1. Use req.tenantModels instead of importing models directly
 * 2. Add tenantDatabase middleware to routes
 * 3. organizationId is automatically available via req.organizationId
 */

const logger = require('../utils/logger');

/**
 * OLD PATTERN (Single Database with organizationId filter):
 * 
 * const Machine = require('../models/vlite/Machine');
 * 
 * exports.getAllMachines = async (req, res) => {
 *   const organizationId = req.headers['x-tenant-id'];
 *   const machines = await Machine.find({ organizationId });
 *   // ...
 * };
 */

/**
 * NEW PATTERN (Isolated Database per Tenant):
 * 
 * No direct model import needed - use req.tenantModels
 */
exports.getAllMachines = async (req, res) => {
  try {
    // Models are automatically scoped to tenant database via middleware
    const { Machine } = req.tenantModels;
    const { type, status, search } = req.query;

    const filter = {};
    
    if (type) filter.type = type;
    if (status) filter.operationalStatus = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { machineCode: { $regex: search, $options: 'i' } }
      ];
    }

    // Query automatically uses tenant's database - no organizationId filter needed!
    const machines = await Machine.find(filter)
      .populate('qualifiedOperators', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: machines.length,
      data: machines
    });
  } catch (error) {
    logger.error('Error fetching machines:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching machines',
      error: error.message
    });
  }
};

/**
 * Creating records in tenant database
 */
exports.createMachine = async (req, res) => {
  try {
    const { Machine } = req.tenantModels;
    
    // organizationId is automatically set by the model if needed
    const machineData = {
      ...req.body,
      organizationId: req.organizationId, // Available from middleware
    };

    const machine = await Machine.create(machineData);
    
    res.status(201).json({
      success: true,
      message: 'Machine created successfully',
      data: machine
    });
  } catch (error) {
    logger.error('Error creating machine:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating machine',
      error: error.message
    });
  }
};

/**
 * ROUTE CONFIGURATION:
 * 
 * Add tenantDatabase middleware to routes that need tenant-specific data
 * 
 * const { authenticate, tenantContext, tenantDatabase } = require('../middleware/auth');
 * 
 * // For tenant-specific routes:
 * router.get('/', 
 *   authenticate,           // Verify user
 *   tenantContext,          // Set organization context
 *   tenantDatabase,         // Connect to tenant database
 *   machineController.getAllMachines
 * );
 * 
 * // For super admin routes (no tenant context needed):
 * router.get('/admin/all',
 *   authenticate,
 *   authorizeSuperAdmin,
 *   adminController.getAllOrganizationMachines
 * );
 */

/**
 * MIGRATION STEPS FOR EXISTING CONTROLLERS:
 * 
 * 1. Remove direct model imports:
 *    - Remove: const Machine = require('../models/vlite/Machine');
 * 
 * 2. Update controller methods:
 *    - Replace: const organizationId = req.headers['x-tenant-id'];
 *    - With: const { Machine } = req.tenantModels;
 *    - Remove: filter.organizationId = organizationId;
 * 
 * 3. Update routes to include middleware:
 *    - Add tenantContext and tenantDatabase middleware
 *    - Example: router.get('/', authenticate, tenantContext, tenantDatabase, controller.method);
 * 
 * 4. Test thoroughly:
 *    - Verify data isolation between organizations
 *    - Test with multiple organizations
 *    - Ensure no cross-tenant data leaks
 */

/**
 * AVAILABLE TENANT MODELS (via req.tenantModels):
 * 
 * - User
 * - Role
 * - Customer
 * - Vendor
 * - Product
 * - RawMaterial
 * - Machine
 * - InventoryItem
 * - InventoryStock
 * - InventoryTransaction
 * - Inquiry
 * - Lead
 * - Quotation
 * - Order
 * - ProductionOrder
 * - PurchaseIndent
 * - PurchaseOrder
 * - Dispatch
 * - Drawing
 * - GRN
 * - Ledger
 * - WorkflowStep
 */

module.exports = {
  getAllMachines,
  createMachine,
};
