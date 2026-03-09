require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const InventoryStock = require('../models/vlite/InventoryStock');
const PurchaseIndent = require('../models/vlite/PurchaseIndent');
const PurchaseOrder = require('../models/vlite/PurchaseOrder');
const GRN = require('../models/vlite/GRN');
const InventoryTransaction = require('../models/vlite/InventoryTransaction');
const Organization = require('../models/shared/Organization');

// Get organization ID dynamically
let TENANT_ID = null;

const inventoryItems = [
  { itemName: 'Plywood Sheet 8x4', category: 'Wood', sku: 'PLY-001', totalStock: 150, blockedStock: 20, availableStock: 130, upcomingStock: 50, issued: 80, returned: 5, unit: 'PCS', location: 'Warehouse A', organizationId: TENANT_ID },
  { itemName: 'MDF Board 18mm', category: 'Wood', sku: 'MDF-001', totalStock: 200, blockedStock: 30, availableStock: 170, upcomingStock: 100, issued: 120, returned: 10, unit: 'PCS', location: 'Warehouse A', organizationId: TENANT_ID },
  { itemName: 'Laminate Sheet White', category: 'Laminate', sku: 'LAM-001', totalStock: 300, blockedStock: 50, availableStock: 250, upcomingStock: 150, issued: 200, returned: 15, unit: 'PCS', location: 'Warehouse B', organizationId: TENANT_ID },
  { itemName: 'Edge Band PVC', category: 'Hardware', sku: 'EDG-001', totalStock: 500, blockedStock: 100, availableStock: 400, upcomingStock: 200, issued: 350, returned: 25, unit: 'MTR', location: 'Warehouse B', organizationId: TENANT_ID },
  { itemName: 'Door Hinges SS', category: 'Hardware', sku: 'HNG-001', totalStock: 1000, blockedStock: 150, availableStock: 850, upcomingStock: 500, issued: 600, returned: 50, unit: 'PCS', location: 'Warehouse C', organizationId: TENANT_ID },
  { itemName: 'Glass 5mm Clear', category: 'Glass', sku: 'GLS-001', totalStock: 80, blockedStock: 10, availableStock: 70, upcomingStock: 30, issued: 45, returned: 3, unit: 'SQF', location: 'Warehouse D', organizationId: TENANT_ID },
  { itemName: 'Aluminum Profile', category: 'Metal', sku: 'ALU-001', totalStock: 250, blockedStock: 40, availableStock: 210, upcomingStock: 120, issued: 180, returned: 12, unit: 'MTR', location: 'Warehouse C', organizationId: TENANT_ID },
  { itemName: 'Drawer Slides 18"', category: 'Hardware', sku: 'SLD-001', totalStock: 600, blockedStock: 80, availableStock: 520, upcomingStock: 300, issued: 400, returned: 30, unit: 'PAIR', location: 'Warehouse B', organizationId: TENANT_ID }
];

const purchaseIndents = [
  {
    indentNo: 'IND-2025-001',
    customer: 'ABC Furniture Ltd',
    orderName: 'Kitchen Cabinet Order',
    startDate: new Date('2025-01-15'),
    endDate: new Date('2025-02-15'),
    poStatus: 'Approved',
    organizationId: TENANT_ID,
    items: [
      { itemName: 'Plywood Sheet 8x4', quantity: 50, unit: 'PCS', remarks: 'Urgent' },
      { itemName: 'Laminate Sheet White', quantity: 100, unit: 'PCS', remarks: '' }
    ],
    totalAmount: 75000,
    remarks: 'Priority order',
    organizationId: TENANT_ID
  },
  {
    indentNo: 'IND-2025-002',
    customer: 'XYZ Interiors',
    orderName: 'Wardrobe Project',
    startDate: new Date('2025-01-20'),
    endDate: new Date('2025-03-01'),
    poStatus: 'Pending',
    items: [
      { itemName: 'MDF Board 18mm', quantity: 80, unit: 'PCS', remarks: '' },
      { itemName: 'Door Hinges SS', quantity: 200, unit: 'PCS', remarks: 'High quality' }
    ],
    totalAmount: 95000,
    remarks: '',
    organizationId: TENANT_ID
  },
  {
    indentNo: 'IND-2025-003',
    customer: 'Modern Homes Pvt Ltd',
    orderName: 'Complete Interior Package',
    startDate: new Date('2025-01-10'),
    endDate: new Date('2025-02-28'),
    poStatus: 'In Progress',
    items: [
      { itemName: 'Glass 5mm Clear', quantity: 30, unit: 'SQF', remarks: '' },
      { itemName: 'Aluminum Profile', quantity: 120, unit: 'MTR', remarks: '' },
      { itemName: 'Edge Band PVC', quantity: 200, unit: 'MTR', remarks: '' }
    ],
    totalAmount: 125000,
    remarks: 'Phased delivery',
    organizationId: TENANT_ID
  }
];

const grns = [
  {
    grnNo: 'GRN-2025-001',
    poNumber: 'PO-2025-001',
    supplier: 'TimberMart Suppliers',
    receivedDate: new Date('2025-01-18'),
    organizationId: TENANT_ID,
    items: [
      { itemName: 'Plywood Sheet 8x4', orderedQty: 50, receivedQty: 50, acceptedQty: 48, rejectedQty: 2, unit: 'PCS', remarks: 'Minor damage on 2 pieces' }
    ],
    status: 'Completed',
    totalAmount: 35000,
    organizationId: TENANT_ID
  },
  {
    grnNo: 'GRN-2025-002',
    poNumber: 'PO-2025-002',
    supplier: 'Hardware Hub',
    receivedDate: new Date('2025-01-22'),
    items: [
      { itemName: 'Door Hinges SS', orderedQty: 200, receivedQty: 200, acceptedQty: 200, rejectedQty: 0, unit: 'PCS', remarks: 'All good' }
    ],
    status: 'Completed',
    totalAmount: 18000,
    organizationId: TENANT_ID
  }
];

const transactions = [
  { transactionType: 'Purchase', itemName: 'Plywood Sheet 8x4', sku: 'PLY-001', quantity: 50, unit: 'PCS', referenceNo: 'PO-2025-001', transactionDate: new Date('2025-01-18'), remarks: 'From TimberMart', organizationId: TENANT_ID },
  { transactionType: 'Issue', itemName: 'Plywood Sheet 8x4', sku: 'PLY-001', quantity: 30, unit: 'PCS', referenceNo: 'WO-001', transactionDate: new Date('2025-01-20'), remarks: 'For Kitchen Project', organizationId: TENANT_ID },
  { transactionType: 'Purchase', itemName: 'Door Hinges SS', sku: 'HNG-001', quantity: 200, unit: 'PCS', referenceNo: 'PO-2025-002', transactionDate: new Date('2025-01-22'), remarks: 'From Hardware Hub', organizationId: TENANT_ID },
  { transactionType: 'Issue', itemName: 'Laminate Sheet White', sku: 'LAM-001', quantity: 80, unit: 'PCS', referenceNo: 'WO-002', transactionDate: new Date('2025-01-25'), remarks: 'For Wardrobe Project', organizationId: TENANT_ID },
  { transactionType: 'Return', itemName: 'MDF Board 18mm', sku: 'MDF-001', quantity: 5, unit: 'PCS', referenceNo: 'WO-001', transactionDate: new Date('2025-01-28'), remarks: 'Excess material', organizationId: TENANT_ID }
];

async function seedInventory() {
  try {
    await connectDB();
    console.log('🌱 Starting inventory seeding...');

    // Clear existing data
    await InventoryStock.deleteMany({ organizationId: TENANT_ID });
    await PurchaseIndent.deleteMany({ organizationId: TENANT_ID });
    await GRN.deleteMany({ organizationId: TENANT_ID });
    await InventoryTransaction.deleteMany({ organizationId: TENANT_ID });

    // Seed inventory items
    await InventoryStock.insertMany(inventoryItems);
    console.log(`✅ Seeded ${inventoryItems.length} inventory items`);

    // Seed purchase indents
    await PurchaseIndent.insertMany(purchaseIndents);
    console.log(`✅ Seeded ${purchaseIndents.length} purchase indents`);

    // Seed GRNs
    await GRN.insertMany(grns);
    console.log(`✅ Seeded ${grns.length} GRNs`);

    // Seed transactions
    await InventoryTransaction.insertMany(transactions);
    console.log(`✅ Seeded ${transactions.length} transactions`);

    console.log('🎉 Inventory seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding inventory:', error);
    process.exit(1);
  }
}

seedInventory();
