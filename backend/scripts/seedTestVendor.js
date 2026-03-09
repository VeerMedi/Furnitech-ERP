require('dotenv').config();
const mongoose = require('mongoose');
const Vendor = require('../models/vlite/Vendor');
const RawMaterial = require('../models/vlite/RawMaterial');

const organizationId = '6935417d57433de522df0bbe';

const testVendor = {
  organizationId,
  vendorId: 'VEN-TEST-001',
  vendorName: 'Test Suppliers Pvt Ltd',
  contactNumber: '9876543210',
  email: 'test@suppliers.com',
  altContactNumber: '9876543211',
  address: 'Plot No 45, Industrial Area',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  gstNumber: '27AABCT1234A1Z5',
  status: 'Active',
  paymentStatus: 'Half',
  totalAmount: 15000,
  paidAmount: 8000,
  balance: 7000,
  purchaseHistory: [
    {
      purchaseDate: new Date('2024-12-01'),
      itemName: 'Panel',
      brand: 'Greenply',
      finish: 'Matte',
      thickness: '18mm',
      materialName: 'Panel',
      quantity: 10,
      unitPrice: 2500,
      totalAmount: 25000,
      amountPaid: 15000,
      balance: 10000,
      status: 'Partial'
    },
    {
      purchaseDate: new Date('2024-11-25'),
      itemName: 'Laminate',
      brand: 'Merino',
      finish: 'Glossy',
      thickness: '1mm',
      materialName: 'Laminate',
      quantity: 50,
      unitPrice: 450,
      totalAmount: 22500,
      amountPaid: 22500,
      balance: 0,
      status: 'Paid'
    },
    {
      purchaseDate: new Date('2024-11-20'),
      itemName: 'Hardware',
      brand: 'Hettich',
      finish: 'Chrome',
      thickness: 'N/A',
      materialName: 'Hardware',
      quantity: 100,
      unitPrice: 85,
      totalAmount: 8500,
      amountPaid: 5000,
      balance: 3500,
      status: 'Partial'
    },
    {
      purchaseDate: new Date('2024-11-15'),
      itemName: 'Glass',
      brand: 'Saint-Gobain',
      finish: 'Clear',
      thickness: '5mm',
      materialName: 'Glass',
      quantity: 20,
      unitPrice: 650,
      totalAmount: 13000,
      amountPaid: 13000,
      balance: 0,
      status: 'Paid'
    }
  ]
};

// Sync function (same as controller)
const syncToPriceBook = async (organizationId, vendorName, vendorContact, purchase) => {
  try {
    const categoryMap = {
      'panel': 'PANEL',
      'laminate': 'LAMINATE',
      'edgeband': 'EDGEBAND',
      'hardware': 'HARDWARE',
      'glass': 'GLASS',
      'fabric': 'FABRIC',
      'aluminium': 'ALUMINIUM',
      'aluminum': 'ALUMINIUM',
      'processed panel': 'PROCESSED_PANEL',
      'handles': 'HANDLES',
      'hinges': 'HINGES',
      'slides': 'SLIDES'
    };

    const searchTerm = (purchase.materialName || purchase.itemName || '').toLowerCase();
    let category = 'OTHER';
    
    for (const [key, value] of Object.entries(categoryMap)) {
      if (searchTerm.includes(key)) {
        category = value;
        break;
      }
    }

    const materialQuery = {
      organizationId,
      name: purchase.itemName,
      category
    };

    if (purchase.brand) {
      materialQuery['specifications.brand'] = purchase.brand;
    }

    let material = await RawMaterial.findOne(materialQuery);

    if (material) {
      material.priceHistory.push({
        date: purchase.purchaseDate || new Date(),
        price: purchase.unitPrice,
        vendor: vendorName,
        vendorContact: vendorContact || 'N/A',
        quantity: purchase.quantity,
        notes: `Test data - auto-synced from vendor`
      });

      material.costPrice = purchase.unitPrice;
      if (purchase.finish) material.specifications.finish = purchase.finish;
      if (purchase.thickness) material.specifications.thickness = purchase.thickness;
      if (purchase.brand) material.specifications.brand = purchase.brand;

      await material.save();
      console.log(`✅ Updated existing material: ${material.name}`);
    } else {
      const newMaterial = new RawMaterial({
        organizationId,
        name: purchase.itemName,
        category,
        materialCode: `TEST-${Date.now()}`,
        specifications: {
          brand: purchase.brand || 'N/A',
          finish: purchase.finish || 'N/A',
          thickness: purchase.thickness || 'N/A'
        },
        uom: 'PCS',
        costPrice: purchase.unitPrice,
        currency: 'INR',
        currentStock: 0,
        priceHistory: [{
          date: purchase.purchaseDate || new Date(),
          price: purchase.unitPrice,
          vendor: vendorName,
          vendorContact: vendorContact || 'N/A',
          quantity: purchase.quantity,
          notes: `Test data - auto-synced from vendor`
        }],
        status: 'ACTIVE'
      });

      await newMaterial.save();
      console.log(`✅ Created new material: ${newMaterial.name} in ${category} category`);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error syncing to Price Book:', error);
    return { success: false, error: error.message };
  }
};

async function seedTestVendor() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({ 
      organizationId, 
      vendorId: testVendor.vendorId 
    });

    if (existingVendor) {
      console.log('⚠️  Test vendor already exists. Deleting old one...');
      await Vendor.deleteOne({ _id: existingVendor._id });
    }

    // Create vendor
    console.log('\n📝 Creating test vendor...');
    const vendor = new Vendor(testVendor);
    await vendor.save();
    console.log(`✅ Vendor created: ${vendor.vendorName} (${vendor.vendorId})`);

    // Note: Price Book sync will happen automatically via backend controller
    // when vendor is accessed through API, so no manual sync needed here

    console.log('\n✅ Test data seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Vendor: ${vendor.vendorName}`);
    console.log(`   Total Purchases: ${vendor.purchaseHistory.length}`);
    console.log(`   Total Amount: ₹${vendor.totalAmount}`);
    console.log(`   Paid Amount: ₹${vendor.paidAmount}`);
    console.log(`   Balance: ₹${vendor.balance}`);
    console.log(`   Payment Status: ${vendor.paymentStatus}`);

    console.log('\n🎯 Test vendor ready! Check:');
    console.log('   - Vendors page for vendor details');
    console.log('   - Price Book sync will happen via API when you create/update vendor through frontend');

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error seeding test vendor:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

seedTestVendor();
