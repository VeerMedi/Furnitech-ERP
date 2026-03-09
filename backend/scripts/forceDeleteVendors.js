const mongoose = require('mongoose');
require('dotenv').config();
const Vendor = require('../models/vlite/Vendor');
const RawMaterial = require('../models/vlite/RawMaterial');

async function deleteAllVendorData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Get organization ID from logged in user
    const orgId = '674b0b7a22c3b9c5e9f6d4e8';

    console.log(`🔍 Searching for data with organizationId: ${orgId}\n`);

    // Find all vendors
    const vendors = await Vendor.find({ organizationId: orgId });
    console.log(`Found ${vendors.length} vendors:`);
    vendors.forEach(v => {
      console.log(`  - ${v.vendorName} (${v.vendorId})`);
    });

    // Find all price book materials
    const materials = await RawMaterial.find({ organizationId: orgId });
    console.log(`\nFound ${materials.length} price book materials:`);
    materials.slice(0, 5).forEach(m => {
      console.log(`  - ${m.name} (${m.materialCode})`);
    });

    console.log('\n🗑️  Deleting all data...\n');

    // Delete all
    const vendorResult = await Vendor.deleteMany({ organizationId: orgId });
    const materialResult = await RawMaterial.deleteMany({ organizationId: orgId });

    console.log(`✅ Deleted ${vendorResult.deletedCount} vendors`);
    console.log(`✅ Deleted ${materialResult.deletedCount} materials`);

    // Also try deleting without organizationId filter (in case field name is different)
    console.log('\n🔍 Checking for data without organizationId...');
    const allVendors = await Vendor.find({});
    const allMaterials = await RawMaterial.find({});
    
    console.log(`Total vendors in DB: ${allVendors.length}`);
    console.log(`Total materials in DB: ${allMaterials.length}`);

    if (allVendors.length > 0) {
      console.log('\n⚠️  Found vendors without organizationId filter. Deleting all...');
      const deleteAll = await Vendor.deleteMany({});
      console.log(`Deleted ${deleteAll.deletedCount} vendors`);
    }

    if (allMaterials.length > 0) {
      console.log('\n⚠️  Found materials without organizationId filter. Deleting all...');
      const deleteAll = await RawMaterial.deleteMany({});
      console.log(`Deleted ${deleteAll.deletedCount} materials`);
    }

    console.log('\n✅ Cleanup completed!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteAllVendorData();
