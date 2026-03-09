// Test script to check machines API
const axios = require('axios');

const testMachinesAPI = async () => {
  try {
    // First, get organization ID dynamically
    const mongoose = require('mongoose');
    const connectDB = require('../config/database');
    const Organization = require('../models/shared/Organization');
    
    await connectDB();
    const organization = await Organization.findOne({ isActive: true }).sort({ createdAt: 1 });
    if (!organization) {
      console.error('❌ No active organization found.');
      process.exit(1);
    }
    const organizationId = organization._id.toString();
    console.log(`📦 Using organization: ${organization.name} (${organizationId})\\n`);
    
    // Login to get a token
    console.log('1. Logging in as jasleen@vlite.com...\\n');
    
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'jasleen@vlite.com',
      password: 'krishna@123',
      organizationId: organizationId // Use dynamic organization ID
    });
    
    console.log('✅ Login successful!');
    console.log('Token:', loginResponse.data.token.substring(0, 30) + '...');
    console.log('User:', loginResponse.data.user.firstName, loginResponse.data.user.lastName);
    console.log('Organization ID:', loginResponse.data.user.organizationId);
    console.log('\n2. Fetching machines...\n');
    
    // Now fetch machines
    const machinesResponse = await axios.get('http://localhost:5001/api/machines', {
      headers: {
        'Authorization': `Bearer ${loginResponse.data.token}`,
        'x-tenant-id': loginResponse.data.user.organizationId
      }
    });
    
    console.log('✅ Machines fetched successfully!');
    console.log('Total machines:', machinesResponse.data.count);
    console.log('\nFirst 5 machines:');
    
    machinesResponse.data.data.slice(0, 5).forEach(m => {
      console.log(`  - ${m.machineCode}: ${m.name} (${m.type})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    console.error('Status:', error.response?.status);
    console.error('Full error:', error.response?.data);
  }
};

testMachinesAPI();
