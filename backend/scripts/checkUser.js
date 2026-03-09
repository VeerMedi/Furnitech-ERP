require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/vlite/User');
const jwt = require('jsonwebtoken');

const checkUser = async () => {
  try {
    await connectDB();
    
    const user = await User.findOne({ email: 'admin@vlite.com' })
      .select('_id email firstName lastName organizationId');
    
    if (user) {
      console.log('User found:');
      console.log(`  Name: ${user.firstName} ${user.lastName}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  User ID: ${user._id}`);
      console.log(`  Organization ID: ${user.organizationId}`);
      
      // Generate a token like the login does
      const token = jwt.sign(
        { 
          id: user._id, 
          email: user.email,
          organizationId: user.organizationId 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      
      console.log(`\nTest Token: ${token.substring(0, 50)}...`);
    } else {
      console.log('User not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkUser();
