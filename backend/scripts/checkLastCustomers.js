const mongoose = require('mongoose');
const Customer = require('../models/vlite/Customer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const checkLastCustomers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const customers = await Customer.find().sort({ createdAt: -1 }).limit(5);
    console.log(`\nLast ${customers.length} customers:\n`);
    
    customers.forEach((c, i) => {
      console.log(`${i + 1}. Customer:`);
      console.log(`   _id: ${c._id}`);
      console.log(`   _id type: ${typeof c._id}`);
      console.log(`   _id constructor: ${c._id.constructor.name}`);
      console.log(`   Customer Code: ${c.customerCode}`);
      console.log(`   Company Name: ${c.companyName}`);
      console.log(`   Created At: ${c.createdAt}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkLastCustomers();
