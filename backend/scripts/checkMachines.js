require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Machine = require('../models/vlite/Machine');

const checkMachines = async () => {
  try {
    await connectDB();
    console.log('Connected to database\n');

    // Get first active organization dynamically
    const Organization = require('../models/shared/Organization');
    const organization = await Organization.findOne({ isActive: true }).sort({ createdAt: 1 });
    if (!organization) {
      console.error('❌ No active organization found.');
      process.exit(1);
    }
    const TENANT_ID = organization._id;
    console.log(`📦 Using organization: ${organization.name}\n`);
    
    const count = await Machine.countDocuments({ organizationId: TENANT_ID });
    console.log(`📊 Total machines in database: ${count}\n`);

    if (count > 0) {
      console.log('Machine types breakdown:');
      const types = await Machine.aggregate([
        { $match: { organizationId: TENANT_ID } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);
      
      types.forEach(t => {
        console.log(`  ${t._id}: ${t.count} machines`);
      });

      console.log('\n📋 All machines:');
      const machines = await Machine.find({ organizationId: TENANT_ID })
        .select('machineCode name type operationalStatus')
        .sort({ machineCode: 1 });
      
      machines.forEach(m => {
        console.log(`  ${m.machineCode} | ${m.name.padEnd(35)} | ${m.type.padEnd(22)} | ${m.operationalStatus}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkMachines();
