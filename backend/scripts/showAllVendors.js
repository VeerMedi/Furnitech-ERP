const mongoose = require('mongoose');
require('dotenv').config();
const Vendor = require('../models/vlite/Vendor');

async function showAllVendorData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Get ALL vendors with ALL fields
    const allVendors = await Vendor.find({}).lean();
    
    console.log('📦 TOTAL VENDORS IN DATABASE:', allVendors.length);
    console.log('='.repeat(80));
    
    allVendors.forEach((vendor, index) => {
      console.log(`\n🔹 VENDOR ${index + 1}:`);
      console.log('  _id:', vendor._id);
      console.log('  vendorId:', vendor.vendorId);
      console.log('  vendorName:', vendor.vendorName);
      console.log('  organizationId:', vendor.organizationId);
      console.log('  organizationId type:', typeof vendor.organizationId);
      console.log('  organizationId toString:', vendor.organizationId?.toString());
      console.log('  contactNumber:', vendor.contactNumber);
      console.log('  email:', vendor.email);
      console.log('  totalAmount:', vendor.totalAmount);
      console.log('  paidAmount:', vendor.paidAmount);
      console.log('  balance:', vendor.balance);
      console.log('  paymentStatus:', vendor.paymentStatus);
      console.log('  isDeleted:', vendor.isDeleted);
      console.log('  purchaseHistory items:', vendor.purchaseHistory?.length || 0);
      
      if (vendor.purchaseHistory && vendor.purchaseHistory.length > 0) {
        console.log('\n  📝 Purchase History:');
        vendor.purchaseHistory.forEach((p, i) => {
          console.log(`    ${i + 1}. ${p.materialName || p.itemName} - ₹${p.unitPrice} x ${p.quantity}`);
        });
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 SUMMARY:');
    console.log(`  Total Vendors: ${allVendors.length}`);
    console.log(`  Organization IDs found:`);
    const orgIds = [...new Set(allVendors.map(v => v.organizationId?.toString()))];
    orgIds.forEach(id => {
      const count = allVendors.filter(v => v.organizationId?.toString() === id).length;
      console.log(`    - ${id}: ${count} vendor(s)`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

showAllVendorData();
