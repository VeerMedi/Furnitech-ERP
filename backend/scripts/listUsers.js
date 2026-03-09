require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/vlite/User');

const listUsers = async () => {
  try {
    await connectDB();
    
    // Get first active organization dynamically
    const Organization = require('../models/shared/Organization');
    const organization = await Organization.findOne({ isActive: true }).sort({ createdAt: 1 });
    if (!organization) {
      console.error('❌ No active organization found.');
      process.exit(1);
    }
    const TENANT_ID = organization._id;
    console.log(`📦 Using organization: ${organization.name}\n`);
    
    const users = await User.find({ organizationId: TENANT_ID })
      .select('firstName lastName email workflowRole organizationId')
      .sort({ email: 1 });
    
    console.log(`\n📋 Found ${users.length} users:\n`);
    
    users.forEach(u => {
      console.log(`  ${u.firstName} ${u.lastName}`);
      console.log(`    Email: ${u.email}`);
      console.log(`    Role: ${u.workflowRole}`);
      console.log(`    Org ID: ${u.organizationId}`);
      console.log();
    });
    
    console.log('Password for all users: krishna@123\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

listUsers();
