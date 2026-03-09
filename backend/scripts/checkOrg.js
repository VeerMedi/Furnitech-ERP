require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Organization = require('../models/shared/Organization');

const checkOrg = async () => {
  try {
    await connectDB();
    
    const org = await Organization.findOne({ name: 'Vlite Furnitures' })
      .select('_id name adminUser database slug');
    
    if (org) {
      console.log('Organization found:');
      console.log(`  Name: ${org.name}`);
      console.log(`  ID: ${org._id}`);
      console.log(`  Slug: ${org.slug}`);
      console.log(`  Database Name: ${org.database?.name || 'NOT SET'}`);
      console.log(`  Admin Email: ${org.adminUser.email}`);
    } else {
      console.log('No organization found with name "Vlite Furnitures"');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkOrg();
