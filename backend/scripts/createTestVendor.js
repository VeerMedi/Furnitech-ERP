const mongoose = require('mongoose');
require('dotenv').config();
const Vendor = require('../models/vlite/Vendor');
const vendorController = require('../controllers/vendorController');

async function createTestVendor() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to database\n');
  try {
    console.log('🚀 Creating test vendor with complete data...\n');

    const vendorData = {
      vendorId: 'VEN-2025-001',
      vendorName: 'Premium Wood Suppliers',
      contactNumber: '9876543210',
      email: 'contact@premiumwood.com',
      altContactNumber: '9876543211',
      address: '123 Industrial Area, Sector 5',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      gstNumber: '27AAACP1234C1Z5',
      status: 'Active',
      paymentStatus: 'Pending',
      purchaseHistory: [
        {
          purchaseDate: '2025-12-01',
          itemName: 'Plywood Panel',
          brand: 'Century Ply',
          finish: 'Marine Grade',
          thickness: '18mm',
          materialName: 'Marine Plywood',
          length: '8ft',
          width: '4ft',
          quantity: 50,
          unitPrice: 2500,
          totalAmount: 125000,
          amountPaid: 60000,
          balance: 65000,
          status: 'Partial'
        },
        {
          purchaseDate: '2025-12-02',
          itemName: 'Laminate Sheet',
          brand: 'Merino',
          finish: 'Glossy',
          thickness: '1mm',
          materialName: 'High Gloss Laminate',
          length: '8ft',
          width: '4ft',
          quantity: 100,
          unitPrice: 850,
          totalAmount: 85000,
          amountPaid: 85000,
          balance: 0,
          status: 'Paid'
        },
        {
          purchaseDate: '2025-12-03',
          itemName: 'Edge Band',
          brand: 'Rehau',
          finish: 'Matt',
          thickness: '2mm',
          materialName: 'PVC Edge Band',
          length: '50m',
          width: '22mm',
          quantity: 20,
          unitPrice: 450,
          totalAmount: 9000,
          amountPaid: 0,
          balance: 9000,
          status: 'Pending'
        },
        {
          purchaseDate: '2025-12-04',
          itemName: 'Hardware',
          brand: 'Hafele',
          finish: 'Chrome',
          thickness: 'N/A',
          materialName: 'Drawer Slides',
          length: '18inch',
          width: 'N/A',
          quantity: 30,
          unitPrice: 350,
          totalAmount: 10500,
          amountPaid: 5000,
          balance: 5500,
          status: 'Partial'
        },
        {
          purchaseDate: '2025-12-05',
          itemName: 'Glass',
          brand: 'Saint Gobain',
          finish: 'Clear',
          thickness: '5mm',
          materialName: 'Toughened Glass',
          length: '6ft',
          width: '4ft',
          quantity: 15,
          unitPrice: 3200,
          totalAmount: 48000,
          amountPaid: 48000,
          balance: 0,
          status: 'Paid'
        }
      ]
    };

    // Calculate totals
    let totalAmount = 0;
    let paidAmount = 0;
    let balance = 0;

    vendorData.purchaseHistory.forEach(purchase => {
      totalAmount += purchase.totalAmount;
      paidAmount += purchase.amountPaid;
      balance += purchase.balance;
    });

    vendorData.totalAmount = totalAmount;
    vendorData.paidAmount = paidAmount;
    vendorData.balance = balance;

    if (balance === 0) {
      vendorData.paymentStatus = 'Done';
    } else if (paidAmount > 0) {
      vendorData.paymentStatus = 'Half';
    } else {
      vendorData.paymentStatus = 'Pending';
    }

    console.log('📦 Vendor Data:');
    console.log(`  Name: ${vendorData.vendorName}`);
    console.log(`  ID: ${vendorData.vendorId}`);
    console.log(`  Contact: ${vendorData.contactNumber}`);
    console.log(`  Total Amount: ₹${totalAmount.toLocaleString()}`);
    console.log(`  Paid Amount: ₹${paidAmount.toLocaleString()}`);
    console.log(`  Balance: ₹${balance.toLocaleString()}`);
    console.log(`  Purchase Items: ${vendorData.purchaseHistory.length}`);
    console.log('');

    // Create vendor directly in database
    const organizationId = '6939417d674230652200d0be'; // Correct tenantId from localStorage
    vendorData.organizationId = organizationId;
    vendorData.isDeleted = false;

    const vendor = await Vendor.create(vendorData);

    console.log('✅ Vendor created successfully!');
    console.log('Vendor ID:', vendor._id);
    console.log('');
    
    // Sync each purchase to price book
    console.log('🔄 Syncing purchases to Price Book...\n');
    
    for (const purchase of vendor.purchaseHistory) {
      try {
        await syncToPriceBook(
          organizationId,
          vendor.vendorName,
          vendor.contactNumber,
          purchase
        );
        console.log(`  ✅ Synced: ${purchase.materialName || purchase.itemName}`);
      } catch (err) {
        console.log(`  ⚠️  Failed to sync: ${purchase.materialName || purchase.itemName} - ${err.message}`);
      }
    }

    console.log('');
    console.log('🔍 Check the following:');
    console.log('  1. Vendor Details page - should show 1 vendor');
    console.log('  2. Vendor Payments page - should show 5 purchase entries');
    console.log('  3. Price Book - should show 5 materials synced');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error creating vendor:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Sync function (copied from vendorController)
async function syncToPriceBook(organizationId, vendorName, vendorContact, purchase) {
  const RawMaterial = require('../models/vlite/RawMaterial');
  
  const materialName = purchase.materialName || purchase.itemName || 'Unknown Material';
  const brand = purchase.brand || '';
  const finish = purchase.finish || '';
  const thickness = purchase.thickness || '';
  const length = purchase.length || '';
  const width = purchase.width || '';
  
  // Map item name to category
  let category = 'PANEL';
  const itemLower = materialName.toLowerCase();
  if (itemLower.includes('laminate')) category = 'LAMINATE';
  else if (itemLower.includes('edge') || itemLower.includes('band')) category = 'EDGEBAND';
  else if (itemLower.includes('hardware') || itemLower.includes('slide') || itemLower.includes('hinge')) category = 'HARDWARE';
  else if (itemLower.includes('glass')) category = 'GLASS';
  else if (itemLower.includes('fabric')) category = 'FABRIC';
  else if (itemLower.includes('aluminium') || itemLower.includes('aluminum')) category = 'ALUMINIUM';
  
  // Check if material already exists with same vendor
  const existingMaterial = await RawMaterial.findOne({
    organizationId,
    name: materialName,
    category,
    'specifications.brand': brand,
    isDeleted: false
  });

  if (existingMaterial) {
    // Update existing material
    existingMaterial.costPrice = purchase.unitPrice;
    
    if (!existingMaterial.priceHistory) {
      existingMaterial.priceHistory = [];
    }
    
    existingMaterial.priceHistory.push({
      date: purchase.purchaseDate || new Date(),
      price: purchase.unitPrice,
      vendor: vendorName,
      vendorContact: vendorContact || '',
      quantity: purchase.quantity,
      notes: `Updated from vendor purchase`
    });
    
    existingMaterial.specifications = {
      ...existingMaterial.specifications,
      finish,
      thickness,
      length,
      width,
      brand
    };
    
    await existingMaterial.save();
  } else {
    // Create new material
    const materialCode = `${category}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const newMaterial = await RawMaterial.create({
      organizationId,
      name: materialName,
      materialCode,
      category,
      uom: 'PCS',
      costPrice: purchase.unitPrice,
      sellingPrice: purchase.unitPrice * 1.2,
      specifications: {
        brand,
        finish,
        thickness,
        length,
        width
      },
      priceHistory: [{
        date: purchase.purchaseDate || new Date(),
        price: purchase.unitPrice,
        vendor: vendorName,
        vendorContact: vendorContact || '',
        quantity: purchase.quantity,
        notes: 'Initial purchase from vendor'
      }],
      isDeleted: false
    });
  }
}

createTestVendor();
