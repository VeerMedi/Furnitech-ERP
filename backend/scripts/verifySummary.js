require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');

const verifySummary = async () => {
  try {
    await connectDB();
    
    console.log('\n✅ MONGODB ATLAS - DATABASE SUMMARY\n');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const db = mongoose.connection.db;
    
    // List all collections with counts
    const collections = await db.listCollections().toArray();
    
    console.log('📚 Collections:\n');
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`   ${collection.name.padEnd(25)} : ${count} documents`);
    }
    
    console.log('\n───────────────────────────────────────────────────────────────\n');
    
    // Get organization info
    const Organization = require('../models/shared/Organization');
    const org = await Organization.findOne();
    
    if (org) {
      console.log('🏢 Organization Details:\n');
      console.log(`   Name: ${org.name}`);
      console.log(`   ID: ${org._id}`);
      console.log(`   Admin Email: ${org.adminUser.email}`);
      console.log(`   Status: ${org.isActive ? 'Active ✓' : 'Inactive'}`);
    }
    
    console.log('\n───────────────────────────────────────────────────────────────\n');
    
    // Database stats
    const stats = await db.stats();
    console.log('📊 Database Statistics:\n');
    console.log(`   Collections: ${stats.collections}`);
    console.log(`   Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Indexes: ${stats.indexes}`);
    
    console.log('\n───────────────────────────────────────────────────────────────\n');
    
    console.log('🔐 Login Credentials:\n');
    console.log('   Organization Admin:');
    console.log('      Email: admin@vlite.com');
    console.log('      Password: krishna@123');
    console.log('      Org ID:', org._id.toString());
    console.log('\n   User Account:');
    console.log('      Email: jasleen@vlite.com');
    console.log('      Password: krishna@123');
    
    console.log('\n═══════════════════════════════════════════════════════════════\n');
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

verifySummary();
