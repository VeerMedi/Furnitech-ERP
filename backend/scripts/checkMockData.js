const mongoose = require('mongoose');
require('dotenv').config();
const RawMaterial = require('../models/vlite/RawMaterial');
const Vendor = require('../models/vlite/Vendor');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    const orgId = '674b0b7a22c3b9c5e9f6d4e8';

    // Check Price Book
    const materials = await RawMaterial.find({ 
      organizationId: orgId, 
      isDeleted: false 
    }).select('name materialCode category costPrice sellingPrice');

    console.log('📦 PRICE BOOK (Raw Materials):');
    console.log(`Total count: ${materials.length}\n`);
    if (materials.length > 0) {
      console.log('Sample entries:');
      materials.slice(0, 5).forEach(m => {
        console.log(`  - ${m.name} (${m.materialCode}) - ₹${m.costPrice || 0}`);
      });
    } else {
      console.log('✅ No mock data found - Price Book is clean!\n');
    }

    // Check Vendors
    const vendors = await Vendor.find({ 
      organizationId: orgId, 
      isDeleted: false 
    }).select('vendorName vendorId purchaseHistory');

    console.log('\n👥 VENDORS:');
    console.log(`Total count: ${vendors.length}\n`);
    if (vendors.length > 0) {
      console.log('Sample entries:');
      vendors.slice(0, 5).forEach(v => {
        const purchaseCount = v.purchaseHistory ? v.purchaseHistory.length : 0;
        console.log(`  - ${v.vendorName} (${v.vendorId}) - ${purchaseCount} purchases`);
      });
    } else {
      console.log('✅ No mock data found - Vendors is clean!\n');
    }

    await mongoose.disconnect();
    console.log('\n✅ Check completed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkData();
