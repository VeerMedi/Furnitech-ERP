const mongoose = require('mongoose');
require('dotenv').config();
const Vendor = require('../models/vlite/Vendor');
const RawMaterial = require('../models/vlite/RawMaterial');

async function verifyCorrectOrgId() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    const correctOrgId = '6939417d674230652200d0be';
    console.log(`🔍 Checking data for organizationId: ${correctOrgId}\n`);

    // Check vendors
    const vendors = await Vendor.find({ organizationId: correctOrgId });
    console.log(`📦 VENDORS: ${vendors.length}`);
    if (vendors.length > 0) {
      vendors.forEach(v => {
        console.log(`  ✅ ${v.vendorName} (${v.vendorId})`);
        console.log(`     Total: ₹${v.totalAmount}, Balance: ₹${v.balance}`);
        console.log(`     Purchase History: ${v.purchaseHistory?.length || 0} items`);
      });
    } else {
      console.log('  ❌ No vendors found!');
    }

    // Check price book
    const materials = await RawMaterial.find({ organizationId: correctOrgId });
    console.log(`\n📚 PRICE BOOK: ${materials.length}`);
    if (materials.length > 0) {
      materials.forEach(m => {
        console.log(`  ✅ ${m.name} (${m.category}) - ₹${m.costPrice}`);
      });
    } else {
      console.log('  ❌ No materials found!');
    }

    // Check all vendors regardless of orgId
    console.log('\n🔍 ALL VENDORS IN DATABASE:');
    const allVendors = await Vendor.find({});
    console.log(`Total: ${allVendors.length}`);
    allVendors.forEach(v => {
      console.log(`  - ${v.vendorName} | OrgId: ${v.organizationId}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Verification complete');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

verifyCorrectOrgId();
