const mongoose = require('mongoose');
require('dotenv').config();
const Vendor = require('../models/vlite/Vendor');
const RawMaterial = require('../models/vlite/RawMaterial');

async function addSecondVendor() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    const correctOrgId = '6935417d57433de522df0bbe';
    
    // Create second vendor with different materials
    const vendorData = {
      organizationId: new mongoose.Types.ObjectId(correctOrgId),
      vendorId: 'VEN-2025-002',
      vendorName: 'Elite Hardware Solutions',
      contactNumber: '9123456789',
      email: 'sales@elitehardware.com',
      altContactNumber: '9123456790',
      address: '456 Business Park, Phase 2',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      gstNumber: '07BBBCP5678D1Z9',
      status: 'Active',
      isDeleted: false,
      purchaseHistory: [
        {
          purchaseDate: new Date('2025-12-06'),
          itemName: 'Soft Close Hinges',
          brand: 'Hettich',
          finish: 'Nickel Plated',
          thickness: '3mm',
          materialName: 'Cabinet Hinges',
          length: 'N/A',
          width: 'N/A',
          quantity: 200,
          unitPrice: 85,
          totalAmount: 17000,
          amountPaid: 17000,
          balance: 0,
          status: 'Paid'
        },
        {
          purchaseDate: new Date('2025-12-06'),
          itemName: 'Decorative Laminate',
          brand: 'Greenlam',
          finish: 'Textured',
          thickness: '0.8mm',
          materialName: 'Designer Laminate',
          length: '8ft',
          width: '4ft',
          quantity: 80,
          unitPrice: 950,
          totalAmount: 76000,
          amountPaid: 40000,
          balance: 36000,
          status: 'Partial'
        },
        {
          purchaseDate: new Date('2025-12-07'),
          itemName: 'Handle',
          brand: 'Dorset',
          finish: 'Brass',
          thickness: 'N/A',
          materialName: 'Cabinet Handles',
          length: '6inch',
          width: 'N/A',
          quantity: 150,
          unitPrice: 125,
          totalAmount: 18750,
          amountPaid: 0,
          balance: 18750,
          status: 'Pending'
        },
        {
          purchaseDate: new Date('2025-12-07'),
          itemName: 'Plywood',
          brand: 'Greenply',
          finish: 'BWR Grade',
          thickness: '12mm',
          materialName: 'Commercial Plywood',
          length: '8ft',
          width: '4ft',
          quantity: 75,
          unitPrice: 1850,
          totalAmount: 138750,
          amountPaid: 70000,
          balance: 68750,
          status: 'Partial'
        },
        {
          purchaseDate: new Date('2025-12-08'),
          itemName: 'Aluminum Profile',
          brand: 'Jindal',
          finish: 'Anodized',
          thickness: '2mm',
          materialName: 'Kitchen Profile',
          length: '10ft',
          width: '2inch',
          quantity: 100,
          unitPrice: 280,
          totalAmount: 28000,
          amountPaid: 28000,
          balance: 0,
          status: 'Paid'
        },
        {
          purchaseDate: new Date('2025-12-08'),
          itemName: 'Wood Adhesive',
          brand: 'Fevicol',
          finish: 'N/A',
          thickness: 'N/A',
          materialName: 'Fevicol SH',
          length: '1kg',
          width: 'N/A',
          quantity: 50,
          unitPrice: 180,
          totalAmount: 9000,
          amountPaid: 9000,
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
    console.log('   Vendor ID:', vendor.vendorId);
    console.log('   Total: ₹' + totalAmount.toLocaleString());
    console.log('   Paid: ₹' + paidAmount.toLocaleString());
    console.log('   Balance: ₹' + balance.toLocaleString());
    console.log('   Status:', vendor.paymentStatus);
    console.log('   Purchases:', vendor.purchaseHistory.length);
    
    // Create/Update materials in price book
    console.log('\n🔄 Syncing to Price Book...\n');
    
    const materials = [
      { name: 'Cabinet Hinges', category: 'HARDWARE', price: 85, brand: 'Hettich', finish: 'Nickel Plated', thickness: '3mm', length: 'N/A', width: 'N/A', qty: 200 },
      { name: 'Designer Laminate', category: 'LAMINATE', price: 950, brand: 'Greenlam', finish: 'Textured', thickness: '0.8mm', length: '8ft', width: '4ft', qty: 80 },
      { name: 'Cabinet Handles', category: 'HANDLES', price: 125, brand: 'Dorset', finish: 'Brass', thickness: 'N/A', length: '6inch', width: 'N/A', qty: 150 },
      { name: 'Commercial Plywood', category: 'PANEL', price: 1850, brand: 'Greenply', finish: 'BWR Grade', thickness: '12mm', length: '8ft', width: '4ft', qty: 75 },
      { name: 'Kitchen Profile', category: 'ALUMINIUM', price: 280, brand: 'Jindal', finish: 'Anodized', thickness: '2mm', length: '10ft', width: '2inch', qty: 100 },
      { name: 'Fevicol SH', category: 'ADHESIVE', price: 180, brand: 'Fevicol', finish: 'N/A', thickness: 'N/A', length: '1kg', width: 'N/A', qty: 50 }
    ];
    
    for (const mat of materials) {
      // Check if material exists
      const existing = await RawMaterial.findOne({
        organizationId: new mongoose.Types.ObjectId(correctOrgId),
        name: mat.name,
        category: mat.category,
        'specifications.brand': mat.brand,
        isDeleted: false
      });
      
      if (existing) {
        // Update existing
        existing.costPrice = mat.price;
        existing.priceHistory.push({
          date: new Date(),
          price: mat.price,
          vendor: vendor.vendorName,
          vendorContact: vendor.contactNumber,
          quantity: mat.qty,
          notes: 'Updated from vendor purchase'
        });
        await existing.save();
        console.log(`  ✅ Updated: ${mat.name}`);
      } else {
        // Create new
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
            quantity: mat.qty,
            notes: 'Initial purchase from vendor'
          }],
          isDeleted: false
        });
        console.log(`  ✅ Created: ${material.name}`);
      }
    }
    
    console.log('\n✅ Second vendor added successfully!');
    console.log('\n📊 Summary:');
    console.log('   Vendor: ' + vendor.vendorName);
    console.log('   Total Amount: ₹' + totalAmount.toLocaleString());
    console.log('   Materials: 6 items synced to Price Book');
    console.log('\n🔄 Refresh browser to see updated data!');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

addSecondVendor();
