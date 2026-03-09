const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Tenant Database Management Utility
 * Handles creation and management of separate databases for each organization
 */

// Cache for tenant connections
const tenantConnections = new Map();

/**
 * Get or create a connection for a specific tenant database
 * @param {string} dbName - Database name for the tenant
 * @returns {mongoose.Connection} - Mongoose connection for the tenant
 */
const getTenantConnection = async (dbName) => {
  // Return cached connection if exists
  if (tenantConnections.has(dbName)) {
    return tenantConnections.get(dbName);
  }

  try {
    // Get base URI without database name
    const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    
    // Build tenant database URI properly
    let tenantUri;
    if (baseUri.includes('?')) {
      // Atlas URI with query parameters: mongodb+srv://user:pass@cluster.mongodb.net/defaultDb?params
      tenantUri = baseUri.replace(/\/[^/?]+(\?)/, `/${dbName}$1`);
    } else if (baseUri.includes('mongodb+srv://')) {
      // Atlas URI without query params: mongodb+srv://user:pass@cluster.mongodb.net/defaultDb
      tenantUri = baseUri.replace(/\/[^/]*$/, `/${dbName}`);
    } else {
      // Standard URI: mongodb://localhost:27017/dbname
      tenantUri = baseUri.replace(/\/[^/]*$/, `/${dbName}`);
    }
    
    logger.info(`Creating tenant database connection: ${dbName}`);
    logger.info(`Tenant URI: ${tenantUri.replace(/\/\/[^@]+@/, '//***:***@')}`); // Log with masked credentials
    
    // Create new connection for this tenant
    const connection = await mongoose.createConnection(tenantUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
      bufferCommands: false,
      maxPoolSize: 10,
      heartbeatFrequencyMS: 10000,
    });

    logger.info(`✓ Connected to tenant database: ${dbName}`);
    
    // Cache the connection
    tenantConnections.set(dbName, connection);
    
    return connection;
  } catch (error) {
    logger.error(`Error creating tenant connection for ${dbName}: ${error.message}`);
    throw error;
  }
};

/**
 * Get tenant model from connection
 * @param {mongoose.Connection} connection - Tenant database connection
 * @param {string} modelName - Name of the model
 * @param {mongoose.Schema} schema - Schema for the model
 * @returns {mongoose.Model} - Model bound to tenant connection
 */
const getTenantModel = (connection, modelName, schema) => {
  // Return existing model if already registered
  if (connection.models[modelName]) {
    return connection.models[modelName];
  }
  
  // Create and return new model
  return connection.model(modelName, schema);
};

/**
 * Initialize all models for a new tenant database
 * @param {string} dbName - Database name for the tenant
 * @param {string} organizationId - Organization ID
 * @returns {Object} - Object containing all initialized models
 */
const initializeTenantModels = async (dbName, organizationId) => {
  try {
    const connection = await getTenantConnection(dbName);
    
    // Import all compiled models (they contain the schema)
    const UserModel = require('../models/vlite/User');
    const RoleModel = require('../models/vlite/Role');
    const CustomerModel = require('../models/vlite/Customer');
    const VendorModel = require('../models/vlite/Vendor');
    const ProductModel = require('../models/vlite/Product');
    const RawMaterialModel = require('../models/vlite/RawMaterial');
    const MachineModel = require('../models/vlite/Machine');
    const InventoryItemModel = require('../models/vlite/InventoryItem');
    const InventoryStockModel = require('../models/vlite/InventoryStock');
    const InventoryTransactionModel = require('../models/vlite/InventoryTransaction');
    const InquiryModel = require('../models/vlite/Inquiry');
    const LeadModel = require('../models/vlite/Lead');
    const QuotationModel = require('../models/vlite/Quotation');
    const OrderModel = require('../models/vlite/Order');
    const ProductionOrderModel = require('../models/vlite/ProductionOrder');
    const PurchaseIndentModel = require('../models/vlite/PurchaseIndent');
    const PurchaseOrderModel = require('../models/vlite/PurchaseOrder');
    const DispatchModel = require('../models/vlite/Dispatch');
    const DrawingModel = require('../models/vlite/Drawing');
    const GRNModel = require('../models/vlite/GRN');
    const LedgerModel = require('../models/vlite/Ledger');
    const WorkflowStepModel = require('../models/vlite/WorkflowStep');

    // Get models for this tenant connection using the schema from compiled models
    const models = {
      User: getTenantModel(connection, 'User', UserModel.schema),
      Role: getTenantModel(connection, 'Role', RoleModel.schema),
      Customer: getTenantModel(connection, 'Customer', CustomerModel.schema),
      Vendor: getTenantModel(connection, 'Vendor', VendorModel.schema),
      Product: getTenantModel(connection, 'Product', ProductModel.schema),
      RawMaterial: getTenantModel(connection, 'RawMaterial', RawMaterialModel.schema),
      Machine: getTenantModel(connection, 'Machine', MachineModel.schema),
      InventoryItem: getTenantModel(connection, 'InventoryItem', InventoryItemModel.schema),
      InventoryStock: getTenantModel(connection, 'InventoryStock', InventoryStockModel.schema),
      InventoryTransaction: getTenantModel(connection, 'InventoryTransaction', InventoryTransactionModel.schema),
      Inquiry: getTenantModel(connection, 'Inquiry', InquiryModel.schema),
      Lead: getTenantModel(connection, 'Lead', LeadModel.schema),
      Quotation: getTenantModel(connection, 'Quotation', QuotationModel.schema),
      Order: getTenantModel(connection, 'Order', OrderModel.schema),
      ProductionOrder: getTenantModel(connection, 'ProductionOrder', ProductionOrderModel.schema),
      PurchaseIndent: getTenantModel(connection, 'PurchaseIndent', PurchaseIndentModel.schema),
      PurchaseOrder: getTenantModel(connection, 'PurchaseOrder', PurchaseOrderModel.schema),
      Dispatch: getTenantModel(connection, 'Dispatch', DispatchModel.schema),
      Drawing: getTenantModel(connection, 'Drawing', DrawingModel.schema),
      GRN: getTenantModel(connection, 'GRN', GRNModel.schema),
      Ledger: getTenantModel(connection, 'Ledger', LedgerModel.schema),
      WorkflowStep: getTenantModel(connection, 'WorkflowStep', WorkflowStepModel.schema),
    };

    logger.info(`Initialized models for tenant database: ${dbName}`);
    return { connection, models };
  } catch (error) {
    logger.error(`Error initializing tenant models for ${dbName}: ${error.message}`);
    throw error;
  }
};

/**
 * Close a tenant database connection
 * @param {string} dbName - Database name
 */
const closeTenantConnection = async (dbName) => {
  if (tenantConnections.has(dbName)) {
    const connection = tenantConnections.get(dbName);
    await connection.close();
    tenantConnections.delete(dbName);
    logger.info(`Closed tenant database connection: ${dbName}`);
  }
};

/**
 * Close all tenant connections
 */
const closeAllTenantConnections = async () => {
  for (const [dbName, connection] of tenantConnections) {
    await connection.close();
    logger.info(`Closed tenant database connection: ${dbName}`);
  }
  tenantConnections.clear();
};

module.exports = {
  getTenantConnection,
  getTenantModel,
  initializeTenantModels,
  closeTenantConnection,
  closeAllTenantConnections,
};
