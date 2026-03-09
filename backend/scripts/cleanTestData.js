require('dotenv').config();
const mongoose = require('mongoose');
const Vendor = require('../models/vlite/Vendor');
const RawMaterial = require('../models/vlite/RawMaterial');

const organizationId = '6935417d57433de522df0bbe';

async function cleanAndReseed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Delete existing test vendor
    console.log('🗑️  Deleting existing test vendor...');
    const deletedVendor = await Vendor.findOneAndDelete({
      organizationId,
      vendorId: 'VEN-TEST-001'
    });
    if (deletedVendor) {
      console.log('   Deleted vendor:', deletedVendor.vendorName);
    }

    // Step 2: Delete test materials from Price Book
    console.log('\n🗑️  Deleting test materials from Price Book...');
    const testMaterials = ['Panel', 'Laminate', 'Hardware', 'Glass'];
    
    for (const materialName of testMaterials) {
      const deleted = await RawMaterial.findOneAndDelete({
        organizationId,
        name: materialName,
        'specifications.brand': { $in: ['Greenply', 'Merino', 'Hettich', 'Saint-Gobain'] }
      });
      if (deleted) {
        console.log(`   Deleted: ${deleted.name} (${deleted.category})`);
      }
    }

    console.log('\n✅ Cleanup completed! Now you can run: node scripts/seedTestVendor.js');
    
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.connection.close();
  }
}

cleanAndReseed();
