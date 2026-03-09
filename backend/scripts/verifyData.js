const mongoose = require('mongoose');
require('dotenv').config();
const Vendor = require('../models/vlite/Vendor');
const RawMaterial = require('../models/vlite/RawMaterial');

async function verifyData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    const orgId = '674b0b7a22c3b9c5e9f6d4e8';

    // Check vendors
    const vendors = await Vendor.find({ organizationId: orgId, isDeleted: false });
    console.log('📦 VENDORS:', vendors.length);
    vendors.forEach(v => {
      console.log(`  - ${v.vendorName} (${v.vendorId})`);
      console.log(`    Total: ₹${v.totalAmount}, Paid: ₹${v.paidAmount}, Balance: ₹${v.balance}`);
      console.log(`    Purchase History: ${v.purchaseHistory?.length || 0} items`);
    });

    // Check price book
    const materials = await RawMaterial.find({ organizationId: orgId, isDeleted: false });
    console.log('\n📚 PRICE BOOK:', materials.length);
    materials.forEach(m => {
      console.log(`  - ${m.name} (${m.category}) - ₹${m.costPrice}`);
    });

    // Test API endpoint simulation
    console.log('\n🔍 Testing data retrieval...');
    const vendorForAPI = await Vendor.findOne({ organizationId: orgId, isDeleted: false })
      .select('-__v')
      .lean();
    
    if (vendorForAPI) {
      console.log('✅ Vendor API data structure looks good');
      console.log('  Fields:', Object.keys(vendorForAPI).join(', '));
    }

    await mongoose.disconnect();
    console.log('\n✅ Verification complete');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

verifyData();
