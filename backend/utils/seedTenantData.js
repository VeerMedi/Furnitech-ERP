const bcrypt = require('bcryptjs');
const logger = require('./logger');
const { initializeTenantModels, getTenantConnection } = require('./tenantDatabase');
const Organization = require('../models/shared/Organization');

/**
 * Seed initial data for a new tenant organization
 * @param {string} dbName - Database name for the tenant
 * @param {string} organizationId - Organization ID
 * @param {Object} options - Seeding options
 * @param {string} options.templateOrgId - ID of organization to copy data from
 * @param {boolean} options.copyData - Whether to copy from template org
 * @returns {Object} - Seed result with created records
 */
const seedTenantData = async (dbName, organizationId, options = {}) => {
  try {
    logger.info(`Starting data seeding for tenant: ${dbName}`);
    
    const { models } = await initializeTenantModels(dbName, organizationId);
    
    // If template organization provided, copy its data
    if (options.copyData && options.templateOrgId) {
      return await copyFromTemplateOrg(dbName, organizationId, options.templateOrgId, models);
    }
    
    // Otherwise, seed default data
    // 1. Create default roles
    const roles = await seedRoles(models.Role, organizationId);
    logger.info(`Created ${roles.length} roles`);
    
    // 2. Create sample raw materials
    const rawMaterials = await seedRawMaterials(models.RawMaterial, organizationId);
    logger.info(`Created ${rawMaterials.length} raw materials`);
    
    // 3. Create sample machines
    const machines = await seedMachines(models.Machine, organizationId);
    logger.info(`Created ${machines.length} machines`);
    
    // 4. Initialize inventory items
    const inventoryItems = await seedInventoryItems(models.InventoryItem, rawMaterials, organizationId);
    logger.info(`Created ${inventoryItems.length} inventory items`);
    
    // Verify database was created by checking collection count
    const connection = await getTenantConnection(dbName);
    const collections = await connection.db.listCollections().toArray();
    logger.info(`✓ Database ${dbName} created with ${collections.length} collections: ${collections.map(c => c.name).join(', ')}`);
    
    logger.info(`Successfully seeded data for tenant: ${dbName}`);
    
    return {
      success: true,
      data: {
        roles: roles.length,
        rawMaterials: rawMaterials.length,
        machines: machines.length,
        inventoryItems: inventoryItems.length,
        collections: collections.length,
      },
    };
  } catch (error) {
    logger.error(`Error seeding tenant data for ${dbName}: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    throw error;
  }
};

/**
 * Copy all data from a template organization to new organization
 * @param {string} newDbName - New organization database name
 * @param {string} newOrgId - New organization ID
 * @param {string} templateOrgId - Template organization ID to copy from
 * @param {Object} newModels - New organization models
 * @returns {Object} - Copy result
 */
const copyFromTemplateOrg = async (newDbName, newOrgId, templateOrgId, newModels) => {
  try {
    logger.info(`Copying data from template org ${templateOrgId} to ${newDbName}`);
    
    // Get template organization
    const templateOrg = await Organization.findById(templateOrgId);
    if (!templateOrg || !templateOrg.database || !templateOrg.database.name) {
      throw new Error('Template organization not found or has no database');
    }
    
    // Connect to template organization database
    const templateDbName = templateOrg.database.name;
    const { models: templateModels } = await initializeTenantModels(templateDbName, templateOrgId);
    
    const copiedData = {};
    
    // 1. Copy Roles
    const templateRoles = await templateModels.Role.find({ isDeleted: { $ne: true } }).lean();
    if (templateRoles.length > 0) {
      const newRoles = templateRoles.map(role => ({
        ...role,
        _id: undefined,
        organizationId: newOrgId,
        createdAt: undefined,
        updatedAt: undefined,
      }));
      const roles = await newModels.Role.insertMany(newRoles);
      copiedData.roles = roles.length;
      logger.info(`Copied ${roles.length} roles`);
    }
    
    // 2. Copy Raw Materials
    const templateMaterials = await templateModels.RawMaterial.find({ isDeleted: { $ne: true } }).lean();
    if (templateMaterials.length > 0) {
      const newMaterials = templateMaterials.map(material => ({
        ...material,
        _id: undefined,
        organizationId: newOrgId,
        createdAt: undefined,
        updatedAt: undefined,
      }));
      const materials = await newModels.RawMaterial.insertMany(newMaterials);
      copiedData.rawMaterials = materials.length;
      logger.info(`Copied ${materials.length} raw materials`);
    }
    
    // 3. Copy Machines
    const templateMachines = await templateModels.Machine.find({ isDeleted: { $ne: true } }).lean();
    if (templateMachines.length > 0) {
      const newMachines = templateMachines.map(machine => ({
        ...machine,
        _id: undefined,
        organizationId: newOrgId,
        createdAt: undefined,
        updatedAt: undefined,
        qualifiedOperators: [], // Don't copy user references
        maintenanceHistory: [], // Start fresh
      }));
      const machines = await newModels.Machine.insertMany(newMachines);
      copiedData.machines = machines.length;
      logger.info(`Copied ${machines.length} machines`);
    }
    
    // 4. Copy Inventory Items
    const templateInventory = await templateModels.InventoryItem.find({ isDeleted: { $ne: true } }).lean();
    if (templateInventory.length > 0) {
      const newInventory = templateInventory.map(item => ({
        ...item,
        _id: undefined,
        organizationId: newOrgId,
        createdAt: undefined,
        updatedAt: undefined,
      }));
      const inventory = await newModels.InventoryItem.insertMany(newInventory);
      copiedData.inventoryItems = inventory.length;
      logger.info(`Copied ${inventory.length} inventory items`);
    }
    
    // 5. Copy Products (if any)
    const templateProducts = await templateModels.Product.find({ isDeleted: { $ne: true } }).lean();
    if (templateProducts.length > 0) {
      const newProducts = templateProducts.map(product => ({
        ...product,
        _id: undefined,
        organizationId: newOrgId,
        createdAt: undefined,
        updatedAt: undefined,
      }));
      const products = await newModels.Product.insertMany(newProducts);
      copiedData.products = products.length;
      logger.info(`Copied ${products.length} products`);
    }
    
    // 6. Copy Vendors (without transaction history)
    const templateVendors = await templateModels.Vendor.find({ isDeleted: { $ne: true } }).lean();
    if (templateVendors.length > 0) {
      const newVendors = templateVendors.map(vendor => ({
        ...vendor,
        _id: undefined,
        organizationId: newOrgId,
        createdAt: undefined,
        updatedAt: undefined,
      }));
      const vendors = await newModels.Vendor.insertMany(newVendors);
      copiedData.vendors = vendors.length;
      logger.info(`Copied ${vendors.length} vendors`);
    }
    
    logger.info(`Successfully copied data from template org to ${newDbName}`);
    
    return {
      success: true,
      data: copiedData,
    };
  } catch (error) {
    logger.error(`Error copying from template org: ${error.message}`);
    throw error;
  }
};

/**
 * Seed default roles
 */
const seedRoles = async (RoleModel, organizationId) => {
  const roles = [
    {
      name: 'Admin',
      code: 'ADMIN',
      description: 'Full system administrator with all permissions',
      permissions: [
        { module: 'ALL', subModule: 'ALL', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT'] }
      ],
      level: 10,
      organizationId,
      isActive: true,
    },
    {
      name: 'Inquiry Manager',
      code: 'INQUIRY_MANAGER',
      description: 'Manages customer inquiries and leads',
      permissions: [
        { module: 'CRM', subModule: 'INQUIRY', actions: ['CREATE', 'READ', 'UPDATE'] },
        { module: 'CRM', subModule: 'LEAD', actions: ['CREATE', 'READ', 'UPDATE'] },
        { module: 'CRM', subModule: 'CUSTOMER', actions: ['READ', 'UPDATE'] }
      ],
      level: 5,
      organizationId,
      isActive: true,
    },
    {
      name: 'Sales Manager',
      code: 'SALES_MANAGER',
      description: 'Manages sales operations and quotations',
      permissions: [
        { module: 'CRM', subModule: 'QUOTATION', actions: ['CREATE', 'READ', 'UPDATE', 'APPROVE'] },
        { module: 'CRM', subModule: 'ORDER', actions: ['CREATE', 'READ', 'UPDATE'] },
        { module: 'CRM', subModule: 'CUSTOMER', actions: ['CREATE', 'READ', 'UPDATE'] }
      ],
      level: 7,
      organizationId,
      isActive: true,
    },
    {
      name: 'Head of Sales (HOD)',
      code: 'HEAD_OF_SALES',
      description: 'Head of Sales Department with full sales team oversight',
      permissions: [
        { module: 'CRM', subModule: 'INQUIRY', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'] },
        { module: 'CRM', subModule: 'LEAD', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'] },
        { module: 'CRM', subModule: 'QUOTATION', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'] },
        { module: 'CRM', subModule: 'ORDER', actions: ['CREATE', 'READ', 'UPDATE', 'APPROVE'] },
        { module: 'CRM', subModule: 'CUSTOMER', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] }
      ],
      level: 8,
      organizationId,
      isActive: true,
    },
    {
      name: 'Production Manager',
      code: 'PRODUCTION_MANAGER',
      description: 'Manages production operations',
      permissions: [
        { module: 'PRODUCTION', subModule: 'PRODUCTION_ORDER', actions: ['CREATE', 'READ', 'UPDATE', 'APPROVE'] },
        { module: 'PRODUCTION', subModule: 'MACHINE', actions: ['READ', 'UPDATE'] },
        { module: 'INVENTORY', subModule: 'RAW_MATERIAL', actions: ['READ'] }
      ],
      level: 8,
      organizationId,
      isActive: true,
    },
    {
      name: 'Inventory Manager',
      code: 'INVENTORY_MANAGER',
      description: 'Manages inventory and stock',
      permissions: [
        { module: 'INVENTORY', subModule: 'RAW_MATERIAL', actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'] },
        { module: 'INVENTORY', subModule: 'STOCK', actions: ['CREATE', 'READ', 'UPDATE'] },
        { module: 'INVENTORY', subModule: 'TRANSACTION', actions: ['CREATE', 'READ'] }
      ],
      level: 6,
      organizationId,
      isActive: true,
    },
    {
      name: 'Purchase Manager',
      code: 'PURCHASE_MANAGER',
      description: 'Manages purchase operations',
      permissions: [
        { module: 'PURCHASE', subModule: 'PURCHASE_INDENT', actions: ['CREATE', 'READ', 'UPDATE', 'APPROVE'] },
        { module: 'PURCHASE', subModule: 'PURCHASE_ORDER', actions: ['CREATE', 'READ', 'UPDATE', 'APPROVE'] },
        { module: 'PURCHASE', subModule: 'VENDOR', actions: ['CREATE', 'READ', 'UPDATE'] }
      ],
      level: 7,
      organizationId,
      isActive: true,
    },
  ];

  return await RoleModel.insertMany(roles);
};

/**
 * Seed sample raw materials
 */
const seedRawMaterials = async (RawMaterialModel, organizationId) => {
  const rawMaterials = [
    // Panels
    {
      materialCode: 'PLY-18-8X4',
      name: 'Plywood 18mm 8x4',
      category: 'PANEL',
      type: 'PLYWOOD',
      specifications: { thickness: 18, length: 2440, width: 1220, unit: 'mm' },
      unit: 'SHEET',
      reorderLevel: 20,
      reorderQuantity: 50,
      organizationId,
      isActive: true,
    },
    {
      materialCode: 'MDF-18-8X4',
      name: 'MDF Board 18mm 8x4',
      category: 'PANEL',
      type: 'MDF',
      specifications: { thickness: 18, length: 2440, width: 1220, unit: 'mm' },
      unit: 'SHEET',
      reorderLevel: 30,
      reorderQuantity: 100,
      organizationId,
      isActive: true,
    },
    // Hardware
    {
      materialCode: 'HINGE-SOFT-CLOSE',
      name: 'Soft Close Hinge',
      category: 'HARDWARE',
      type: 'HINGE',
      unit: 'PIECE',
      reorderLevel: 100,
      reorderQuantity: 500,
      organizationId,
      isActive: true,
    },
    {
      materialCode: 'SLIDE-DRAWER-18',
      name: 'Drawer Slide 18 inch',
      category: 'HARDWARE',
      type: 'SLIDE',
      specifications: { length: 18, unit: 'inch' },
      unit: 'PAIR',
      reorderLevel: 50,
      reorderQuantity: 200,
      organizationId,
      isActive: true,
    },
    // Edge Bands
    {
      materialCode: 'EDGE-PVC-1MM-WHITE',
      name: 'PVC Edge Band 1mm White',
      category: 'EDGE_BAND',
      type: 'PVC',
      specifications: { thickness: 1, color: 'White', unit: 'mm' },
      unit: 'METER',
      reorderLevel: 500,
      reorderQuantity: 2000,
      organizationId,
      isActive: true,
    },
    // Adhesives
    {
      materialCode: 'GLUE-WOOD-5KG',
      name: 'Wood Glue 5kg',
      category: 'ADHESIVE',
      type: 'WOOD_GLUE',
      specifications: { weight: 5, unit: 'kg' },
      unit: 'CONTAINER',
      reorderLevel: 10,
      reorderQuantity: 50,
      organizationId,
      isActive: true,
    },
  ];

  return await RawMaterialModel.insertMany(rawMaterials);
};

/**
 * Seed sample machines
 */
const seedMachines = async (MachineModel, organizationId) => {
  const machines = [
    {
      machineCode: 'CNC-01',
      name: 'CNC Router Machine 1',
      type: 'CNC_MACHINE',
      specifications: {
        manufacturer: 'Generic',
        capacity: '2440x1220mm',
        powerRating: '7.5 KW',
      },
      status: 'OPERATIONAL',
      organizationId,
      isActive: true,
    },
    {
      machineCode: 'EDGE-01',
      name: 'Edge Banding Machine 1',
      type: 'EDGEBANDING_MACHINE',
      specifications: {
        manufacturer: 'Generic',
        capacity: 'Auto',
        powerRating: '3 KW',
      },
      status: 'OPERATIONAL',
      organizationId,
      isActive: true,
    },
    {
      machineCode: 'PANEL-SAW-01',
      name: 'Panel Saw Machine 1',
      type: 'PANEL_SAW',
      specifications: {
        manufacturer: 'Generic',
        capacity: '3200mm',
        powerRating: '5 KW',
      },
      status: 'OPERATIONAL',
      organizationId,
      isActive: true,
    },
  ];

  return await MachineModel.insertMany(machines);
};

/**
 * Seed inventory items based on raw materials
 */
const seedInventoryItems = async (InventoryItemModel, rawMaterials, organizationId) => {
  const inventoryItems = rawMaterials.map(rm => ({
    itemCode: rm.materialCode,
    name: rm.name,
    category: rm.category,
    type: rm.type,
    unit: rm.unit,
    rawMaterialId: rm._id,
    organizationId,
    isActive: true,
  }));

  return await InventoryItemModel.insertMany(inventoryItems);
};

module.exports = {
  seedTenantData,
};
