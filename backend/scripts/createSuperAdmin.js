require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const SuperAdmin = require('../models/shared/SuperAdmin');
const connectDB = require('../config/database');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const prompt = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

const createSuperAdmin = async () => {
  try {
    console.log('🔐 Super Admin Creation Script\n');
    console.log('This script will create a super admin account for the multi-tenant system.\n');

    // Connect to database
    await connectDB();

    // Check if super admin already exists
    const existingAdmin = await SuperAdmin.findOne({});
    if (existingAdmin) {
      console.log('⚠️  A super admin already exists in the system.');
      const overwrite = await prompt('Do you want to create another super admin? (yes/no): ');
      if (overwrite.toLowerCase() !== 'yes') {
        console.log('Exiting...');
        process.exit(0);
      }
    }

    // Get super admin details
    console.log('\nEnter Super Admin Details:');
    const firstName = await prompt('First Name: ');
    const lastName = await prompt('Last Name: ');
    const email = await prompt('Email: ');
    const password = await prompt('Password (min 8 characters): ');
    const confirmPassword = await prompt('Confirm Password: ');

    // Validate inputs
    if (!firstName || !lastName || !email || !password) {
      console.error('❌ All fields are required');
      process.exit(1);
    }

    if (password !== confirmPassword) {
      console.error('❌ Passwords do not match');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    // Check if email already exists
    const existingEmail = await SuperAdmin.findOne({ email });
    if (existingEmail) {
      console.error('❌ Email already exists');
      process.exit(1);
    }

    // Create super admin
    const superAdmin = await SuperAdmin.create({
      firstName,
      lastName,
      email,
      password,
      role: 'SUPER_ADMIN',
      isActive: true,
    });

    console.log('\n✅ Super Admin created successfully!');
    console.log('\nSuper Admin Details:');
    console.log(`  Name: ${superAdmin.firstName} ${superAdmin.lastName}`);
    console.log(`  Email: ${superAdmin.email}`);
    console.log(`  ID: ${superAdmin._id}`);
    console.log('\n🎉 You can now login to the admin panel using these credentials.');
    console.log(`   Admin Panel: http://localhost:5174 (or your configured admin frontend URL)`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
};

createSuperAdmin();
