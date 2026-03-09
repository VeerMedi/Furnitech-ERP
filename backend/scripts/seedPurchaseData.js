const mongoose = require('mongoose');
const PurchaseIndent = require('../models/vlite/PurchaseIndent');
const InventoryTransaction = require('../models/vlite/InventoryTransaction');
require('dotenv').config();

const samplePurchases = [
  {
    customer: 'ABC Interiors Pvt Ltd',
    orderName: 'Modular Kitchen Project - Phase 1',
    indentNo: `IND-2025-${Date.now()}-001`,
    indentDate: new Date('2025-01-15'),
    startDate: new Date('2025-01-15'),
    endDate: new Date('2025-02-15'),
    requirementDate: new Date('2025-02-15'),
    poDate: new Date('2025-01-18'),
    expectedDeliveryDate: new Date('2025-02-10'),
    poStatus: 'Approved',
    items: [
      { itemName: 'Plywood Sheet 8x4', category: 'Panel', quantity: 50, unit: 'SHEET', rate: 1850 },
      { itemName: 'Laminate Sheet White', category: 'Laminate', quantity: 100, unit: 'SHEET', rate: 450 },
      { itemName: 'Soft Close Hinges', category: 'Hardware', quantity: 200, unit: 'PCS', rate: 85 },
      { itemName: 'Glass Tempered 8mm', category: 'Glass', quantity: 15, unit: 'SQ.FT', rate: 320 }
    ],
    totalAmount: 0
  },
  {
    customer: 'XYZ Furniture Solutions',
    orderName: 'Office Workstation - Batch A',
    indentNo: `IND-2025-${Date.now()}-002`,
    indentDate: new Date('2025-01-20'),
    startDate: new Date('2025-01-20'),
    endDate: new Date('2025-02-28'),
    requirementDate: new Date('2025-02-28'),
    poDate: new Date('2025-01-22'),
    expectedDeliveryDate: new Date('2025-02-25'),
    poStatus: 'Approved',
    items: [
      { itemName: 'HBD Board 18mm', category: 'HBD', quantity: 80, unit: 'SHEET', rate: 890 },
      { itemName: 'Edge Band PVC', category: 'Hardware', quantity: 500, unit: 'MTR', rate: 12 },
      { itemName: 'Aluminum Profile 25mm', category: 'Aluminum', quantity: 100, unit: 'MTR', rate: 145 },
      { itemName: 'Drawer Channel 450mm', category: 'Hardware', quantity: 150, unit: 'PCS', rate: 195 }
    ],
    totalAmount: 0
  },
  {
    customer: 'Premium Homes Builder',
    orderName: 'Villa Interior - Master Bedroom',
    indentNo: `IND-2025-${Date.now()}-003`,
    indentDate: new Date('2025-02-01'),
    startDate: new Date('2025-02-01'),
    endDate: new Date('2025-03-15'),
    requirementDate: new Date('2025-03-15'),
    poStatus: 'Pending',
    items: [
      { itemName: 'Laminate Sheet Walnut', category: 'Laminate', quantity: 120, unit: 'SHEET', rate: 550 },
      { itemName: 'Fabric Cushion Material', category: 'Fabric', quantity: 50, unit: 'MTR', rate: 280 },
      { itemName: 'LED Profile Aluminum', category: 'Aluminum', quantity: 40, unit: 'MTR', rate: 165 },
      { itemName: 'Door Handles Premium', category: 'Handles', quantity: 25, unit: 'PCS', rate: 850 }
    ],
    totalAmount: 0
  },
  {
    customer: 'Smart Living Pvt Ltd',
    orderName: 'Wardrobe Set - Luxury Collection',
    indentNo: `IND-2025-${Date.now()}-004`,
    indentDate: new Date('2025-01-10'),
    startDate: new Date('2025-01-10'),
    endDate: new Date('2025-02-05'),
    requirementDate: new Date('2025-02-05'),
    poDate: new Date('2025-01-12'),
    expectedDeliveryDate: new Date('2025-02-03'),
    poStatus: 'Completed',
    items: [
      { itemName: 'Processed Panel Laminated 18mm', category: 'Processed Panel', quantity: 60, unit: 'SHEET', rate: 2450 },
      { itemName: 'Glass Mirror 5mm', category: 'Glass', quantity: 30, unit: 'SQ.FT', rate: 180 },
      { itemName: 'Soft Close Drawer System', category: 'Hardware', quantity: 80, unit: 'PCS', rate: 450 },
      { itemName: 'Wardrobe Handles Brass', category: 'Handles', quantity: 40, unit: 'PCS', rate: 320 }
    ],
    totalAmount: 0
  }
];

// Calculate total amounts
samplePurchases.forEach(purchase => {
  purchase.totalAmount = purchase.items.reduce((sum, item) => {
    return sum + (item.quantity * item.rate);
  }, 0);
});

const seedPurchaseData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await PurchaseIndent.deleteMany({});
    // console.log('Cleared existing purchase indents');

    // Get the first organization ID from your database
    const org = await mongoose.connection.db.collection('organizations').findOne({});
    if (!org) {
      console.error('No organization found. Please create an organization first.');
      process.exit(1);
    }

    const organizationId = org._id;
    console.log('Using organization:', organizationId);

    // Add organizationId to all purchases
    const purchasesWithOrg = samplePurchases.map(p => ({
      ...p,
      organizationId: organizationId
    }));

    // Insert purchases
    const insertedPurchases = await PurchaseIndent.insertMany(purchasesWithOrg);
    console.log(`✅ Inserted ${insertedPurchases.length} purchase indents`);

    // Create inventory transactions for approved/completed purchases
    const transactions = [];
    insertedPurchases.forEach(purchase => {
      if (purchase.poStatus === 'Approved' || purchase.poStatus === 'Completed') {
        purchase.items.forEach((item, idx) => {
          transactions.push({
            organizationId: organizationId,
            itemName: item.itemName,
            sku: `SKU-${item.category}-${idx + 1}`,
            category: item.category,
            transactionType: 'Purchase',
            quantity: item.quantity,
            unit: item.unit,
            rate: item.rate,
            cost: item.rate,
            transactionDate: purchase.poDate || purchase.indentDate,
            referenceNo: purchase.indentNo,
            remarks: `Purchase from ${purchase.customer}`
          });
        });
      }
    });

    if (transactions.length > 0) {
      await InventoryTransaction.insertMany(transactions);
      console.log(`✅ Inserted ${transactions.length} inventory transactions`);
    }

    console.log('\n🎉 Sample purchase data seeded successfully!');
    console.log(`\nSummary:`);
    console.log(`- Total Purchases: ${insertedPurchases.length}`);
    console.log(`- Total Transactions: ${transactions.length}`);
    console.log(`- Total Value: ₹${samplePurchases.reduce((sum, p) => sum + p.totalAmount, 0).toLocaleString()}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedPurchaseData();
