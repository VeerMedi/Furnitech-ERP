require('dotenv').config();
const mongoose = require('mongoose');
const Vendor = require('../models/vlite/Vendor');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const cleanupEmptyVendors = async () => {
  try {
    console.log('🔍 Searching for empty vendors (totalAmount = 0, paidAmount = 0, balance = 0)...');
    
    // Find vendors with all amounts as 0
    const emptyVendors = await Vendor.find({
      $or: [
        { totalAmount: 0, paidAmount: 0, balance: 0 },
        { totalAmount: { $exists: false }, paidAmount: { $exists: false }, balance: { $exists: false } }
      ]
    });
    
    console.log(`📊 Found ${emptyVendors.length} empty vendor records`);
    
    if (emptyVendors.length === 0) {
      console.log('✨ No empty vendors found. Database is clean!');
      return;
    }
    
    // Display the vendors that will be deleted
    console.log('\n🗑️  The following vendors will be deleted:');
    emptyVendors.forEach(vendor => {
      console.log(`   - ${vendor.vendorId || 'N/A'}: ${vendor.vendorName || 'N/A'} (Total: ₹${vendor.totalAmount || 0}, Paid: ₹${vendor.paidAmount || 0}, Balance: ₹${vendor.balance || 0})`);
    });
    
    console.log('\n⚠️  Proceeding with deletion in 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Delete the empty vendors
    const result = await Vendor.deleteMany({
      $or: [
        { totalAmount: 0, paidAmount: 0, balance: 0 },
        { totalAmount: { $exists: false }, paidAmount: { $exists: false }, balance: { $exists: false } }
      ]
    });
    
    console.log(`\n✅ Successfully deleted ${result.deletedCount} empty vendor records`);
    
  } catch (error) {
    console.error('❌ Error cleaning up vendors:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
};

const run = async () => {
  await connectDB();
  await cleanupEmptyVendors();
  process.exit(0);
};

run();
