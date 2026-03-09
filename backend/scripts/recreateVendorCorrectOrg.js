const mongoose = require('mongoose');
require('dotenv').config();
const Vendor = require('../models/vlite/Vendor');
const RawMaterial = require('../models/vlite/RawMaterial');

async function deleteAndRecreate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    const correctOrgId = '6935417d57433de522df0bbe';
    
    // Delete all vendors for this org
    const deleted = await Vendor.deleteMany({ organizationId: correctOrgId });
    console.log(`🗑️  Deleted ${deleted.deletedCount} vendors\n`);
    
    // Delete all materials for this org
    const deletedMat = await RawMaterial.deleteMany({ organizationId: correctOrgId });
    console.log(`🗑️  Deleted ${deletedMat.deletedCount} materials\n`);
    
    // Create new vendor with 5 purchases
    const vendorData = {
      organizationId: new mongoose.Types.ObjectId(correctOrgId),
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
      isDeleted: false,
      purchaseHistory: [
        {
          purchaseDate: new Date('2025-12-01'),
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
          purchaseDate: new Date('2025-12-02'),
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
          purchaseDate: new Date('2025-12-03'),
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
          purchaseDate: new Date('2025-12-04'),
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
          purchaseDate: new Date('2025-12-05'),
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
    let totalAmount = 0, paidAmount = 0, balance = 0;
    vendorData.purchaseHistory.forEach(p => {
      totalAmount += p.totalAmount;
      paidAmount += p.amountPaid;
      balance += p.balance;
    });
    
    vendorData.totalAmount = totalAmount;
    vendorData.paidAmount = paidAmount;
    vendorData.balance = balance;
    vendorData.paymentStatus = balance === 0 ? 'Done' : (paidAmount > 0 ? 'Half' : 'Pending');
    
    const vendor = await Vendor.create(vendorData);
    console.log('✅ Vendor created:', vendor.vendorName);
    console.log('   ID:', vendor._id);
    console.log('   OrgId:', vendor.organizationId);
    console.log('   Total: ₹' + totalAmount);
    console.log('   Purchases:', vendor.purchaseHistory.length);
    
    // Create materials in price book
    console.log('\n🔄 Creating materials in Price Book...\n');
    
    const materials = [
      { name: 'Marine Plywood', category: 'PANEL', price: 2500, brand: 'Century Ply', finish: 'Marine Grade', thickness: '18mm', length: '8ft', width: '4ft' },
      { name: 'High Gloss Laminate', category: 'LAMINATE', price: 850, brand: 'Merino', finish: 'Glossy', thickness: '1mm', length: '8ft', width: '4ft' },
      { name: 'PVC Edge Band', category: 'EDGEBAND', price: 450, brand: 'Rehau', finish: 'Matt', thickness: '2mm', length: '50m', width: '22mm' },
      { name: 'Drawer Slides', category: 'HARDWARE', price: 350, brand: 'Hafele', finish: 'Chrome', thickness: 'N/A', length: '18inch', width: 'N/A' },
      { name: 'Toughened Glass', category: 'GLASS', price: 3200, brand: 'Saint Gobain', finish: 'Clear', thickness: '5mm', length: '6ft', width: '4ft' }
    ];
    
    for (const mat of materials) {
      const material = await RawMaterial.create({
        organizationId: new mongoose.Types.ObjectId(correctOrgId),
        name: mat.name,
        materialCode: `${mat.category}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        category: mat.category,
        uom: 'PCS',
        costPrice: mat.price,
        sellingPrice: mat.price * 1.2,
        specifications: {
          brand: mat.brand,
          finish: mat.finish,
          thickness: mat.thickness,
          length: mat.length,
          width: mat.width
        },
        priceHistory: [{
          date: new Date(),
          price: mat.price,
          vendor: vendor.vendorName,
          vendorContact: vendor.contactNumber,
          notes: 'Initial purchase'
        }],
        isDeleted: false
      });
      console.log(`  ✅ ${material.name}`);
    }
    
    console.log('\n✅ All done! Refresh browser now!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

deleteAndRecreate();
