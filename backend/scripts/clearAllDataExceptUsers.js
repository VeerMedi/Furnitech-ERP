require('dotenv').config();
const mongoose = require('mongoose');

// Import all models
const Customer = require('../models/vlite/Customer');
const Order = require('../models/vlite/Order');
const Quotation = require('../models/vlite/Quotation');
const Product = require('../models/vlite/Product');
const RawMaterial = require('../models/vlite/RawMaterial');
const Vendor = require('../models/vlite/Vendor');
const Staff = require('../models/vlite/Staff');
const Machine = require('../models/vlite/Machine');
const Inquiry = require('../models/vlite/Inquiry');
const Lead = require('../models/vlite/Lead');
const Drawing = require('../models/vlite/Drawing');
const Transport = require('../models/vlite/Transport');
const Dispatch = require('../models/vlite/Dispatch');
const InventoryItem = require('../models/vlite/InventoryItem');
const InventoryStock = require('../models/vlite/InventoryStock');
const InventoryTransaction = require('../models/vlite/InventoryTransaction');
const ProductionOrder = require('../models/vlite/ProductionOrder');
const PurchaseOrder = require('../models/vlite/PurchaseOrder');
const PurchaseIndent = require('../models/vlite/PurchaseIndent');
const GRN = require('../models/vlite/GRN');
const AdvancePayment = require('../models/vlite/AdvancePayment');
const Ledger = require('../models/vlite/Ledger');
const WorkflowStep = require('../models/vlite/WorkflowStep');

async function clearAllData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vlite';
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4,
    });
    console.log('✅ Connected to MongoDB\n');

    console.log('🗑️  Starting to clear all data except user credentials...\n');

    // Define all models to clear (excluding User models)
    const modelsToClean = [
      { name: 'Customers', model: Customer },
      { name: 'Orders', model: Order },
      { name: 'Quotations', model: Quotation },
      { name: 'Products', model: Product },
      { name: 'RawMaterials', model: RawMaterial },
      { name: 'Vendors', model: Vendor },
      { name: 'Staff', model: Staff },
      { name: 'Machines', model: Machine },
      { name: 'Inquiries', model: Inquiry },
      { name: 'Leads', model: Lead },
      { name: 'Drawings', model: Drawing },
      { name: 'Transports', model: Transport },
      { name: 'Dispatches', model: Dispatch },
      { name: 'InventoryItems', model: InventoryItem },
      { name: 'InventoryStocks', model: InventoryStock },
      { name: 'InventoryTransactions', model: InventoryTransaction },
      { name: 'ProductionOrders', model: ProductionOrder },
      { name: 'PurchaseOrders', model: PurchaseOrder },
      { name: 'PurchaseIndents', model: PurchaseIndent },
      { name: 'GRNs', model: GRN },
      { name: 'AdvancePayments', model: AdvancePayment },
      { name: 'Ledgers', model: Ledger },
      { name: 'WorkflowSteps', model: WorkflowStep },
    ];

    // Delete data from each model
    for (const { name, model } of modelsToClean) {
      try {
        const count = await model.countDocuments();
        if (count > 0) {
          const result = await model.deleteMany({});
          console.log(`✅ Deleted ${result.deletedCount} records from ${name}`);
        } else {
          console.log(`⚪ ${name} - already empty`);
        }
      } catch (error) {
        console.error(`❌ Error deleting from ${name}:`, error.message);
      }
    }

    console.log('\n✅ Database cleanup completed successfully!');
    console.log('👤 User credentials have been preserved.');
    
    // Show remaining user count
    const User = require('../models/shared/User');
    const userCount = await User.countDocuments();
    console.log(`\n📊 Remaining users in database: ${userCount}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the cleanup
clearAllData();
