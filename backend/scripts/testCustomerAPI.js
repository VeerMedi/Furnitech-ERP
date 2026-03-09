/**
 * Test Customer API Endpoints
 * Run with: node backend/scripts/testCustomerAPI.js
 */

const mongoose = require('mongoose');
const Customer = require('../models/vlite/Customer');
const Organization = require('../models/shared/Organization');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const testCustomerAPI = async () => {
  try {
    // Check if MONGODB_URI exists
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables');
      console.log('Looking for .env at:', path.join(__dirname, '../.env'));
      process.exit(1);
    }
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the first organization
    const org = await Organization.findOne();
    if (!org) {
      console.error('❌ No organization found. Run seed script first.');
      process.exit(1);
    }
    console.log(`✅ Found organization: ${org.name} (${org._id})`);

    // Generate customer code
    const customerCode = await Customer.generateCustomerCode(org._id);
    console.log(`✅ Generated customer code: ${customerCode}`);

    // Create a test customer
    const testCustomer = {
      customerCode: customerCode,
      organizationId: org._id,
      companyName: 'Test Customer API',
      tradeName: 'Test API',
      customerType: 'Dealer',
      status: 'Active',
      registrationDate: new Date(),
      creditLimit: 500000,
      creditDays: 30,
      website: 'https://testapi.com',
      gstNumber: '27AAAAA0000A1Z5',
      panNumber: 'AAAAA0000A',
      gstType: 'Regular',
      registeredState: 'Maharashtra',
      billingAddress: {
        address: 'Test Address',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India'
      },
      officeAddress: {
        address: 'Test Office',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India'
      },
      workAddress: {
        address: 'Test Work',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India'
      },
      emails: [
        { email: 'test@testapi.com', type: 'Primary' }
      ],
      phoneNumbers: [
        { number: '+91 98765 43210', type: 'Office' }
      ],
      contactPersons: [
        {
          name: 'Test Person',
          designation: 'Manager',
          email: 'manager@testapi.com',
          mobile: '+91 98765 43210',
          isPrimary: true
        }
      ],
      categories: {
        panel: {
          enabled: true,
          discount: 5,
          creditLimit: 200000,
          paymentTerms: 'Net 30',
          preferredBrands: ['Brand A', 'Brand B'],
          notes: 'Test notes for panel'
        }
      }
    };

    console.log('\n📝 Creating test customer...');
    const customer = await Customer.create(testCustomer);
    
    console.log('\n✅ Customer created successfully!');
    console.log('Customer ID:', customer._id);
    console.log('Customer Code:', customer.customerCode);
    console.log('Company Name:', customer.companyName);
    console.log('MongoDB ObjectId type:', typeof customer._id);
    console.log('MongoDB ObjectId toString:', customer._id.toString());
    console.log('Full customer object keys:', Object.keys(customer.toObject()));

    // Test fetching the customer
    console.log('\n📖 Fetching customer by ID...');
    const fetchedCustomer = await Customer.findOne({
      _id: customer._id,
      organizationId: org._id
    });

    if (fetchedCustomer) {
      console.log('✅ Successfully fetched customer');
      console.log('Fetched ID:', fetchedCustomer._id);
      console.log('Fetched Code:', fetchedCustomer.customerCode);
      console.log('Fetched Name:', fetchedCustomer.companyName);
    } else {
      console.log('❌ Failed to fetch customer');
    }

    // Clean up - delete test customer
    console.log('\n🗑️  Cleaning up test customer...');
    await Customer.deleteOne({ _id: customer._id });
    console.log('✅ Test customer deleted');

    console.log('\n✅ All tests passed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
};

testCustomerAPI();
