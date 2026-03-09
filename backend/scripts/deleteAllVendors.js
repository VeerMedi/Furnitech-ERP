const mongoose = require('mongoose');
require('dotenv').config();
const RawMaterial = require('../models/vlite/RawMaterial');
const Vendor = require('../models/vlite/Vendor');

async function deleteAllData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    const orgId = '674b0b7a22c3b9c5e9f6d4e8';

    console.log('🗑️  Deleting all vendor and price book data...\n');

    // Delete all vendors
    const vendorResult = await Vendor.deleteMany({ organizationId: orgId });
    console.log(`✅ Deleted ${vendorResult.deletedCount} vendors`);

    // Delete all price book materials
    const materialResult = await RawMaterial.deleteMany({ organizationId: orgId });
    console.log(`✅ Deleted ${materialResult.deletedCount} price book materials`);

    // Verify
    const remainingVendors = await Vendor.countDocuments({ organizationId: orgId });
    const remainingMaterials = await RawMaterial.countDocuments({ organizationId: orgId });

    console.log('\n📊 Final counts:');
    console.log(`  Vendors: ${remainingVendors}`);
    console.log(`  Materials: ${remainingMaterials}`);

    if (remainingVendors === 0 && remainingMaterials === 0) {
      console.log('\n✅ All data successfully deleted!');
    } else {
      console.log('\n⚠️  Some data still remains');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteAllData();
