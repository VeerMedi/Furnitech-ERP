require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/vlite/Customer');
const Organization = require('../models/shared/Organization');
const connectDB = require('../config/database');

const testCustomerModel = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to database\n');

    // Get the first organization
    const organization = await Organization.findOne();
    if (!organization) {
      console.error('❌ No organization found');
      process.exit(1);
    }

    console.log(`📋 Testing with organization: ${organization.name}\n`);

    // Test 1: Get all customers
    console.log('Test 1: Get all customers');
    const allCustomers = await Customer.find({ organizationId: organization._id });
    console.log(`   Found ${allCustomers.length} customers\n`);

    if (allCustomers.length > 0) {
      const customer = allCustomers[0];
      
      // Test 2: Customer details
      console.log('Test 2: Customer details');
      console.log(`   Code: ${customer.customerCode}`);
      console.log(`   Company: ${customer.companyName}`);
      console.log(`   Type: ${customer.customerType}`);
      console.log(`   Status: ${customer.status}`);
      console.log(`   GST: ${customer.gstNumber}`);
      console.log(`   PAN: ${customer.panNumber}\n`);

      // Test 3: Virtual fields
      console.log('Test 3: Virtual fields');
      console.log(`   Display Name: ${customer.displayName}`);
      console.log(`   Primary Email: ${customer.primaryEmail}`);
      if (customer.primaryContact) {
        console.log(`   Primary Contact: ${customer.primaryContact.name} (${customer.primaryContact.mobile})\n`);
      }

      // Test 4: Enabled categories
      console.log('Test 4: Enabled categories');
      const enabledCategories = customer.getEnabledCategories();
      console.log(`   Enabled: ${enabledCategories.join(', ')}\n`);

      // Test 5: Credit availability
      console.log('Test 5: Credit availability');
      const testAmount = 50000;
      const hasCreditAvailable = customer.hasCreditAvailable(testAmount);
      console.log(`   Credit Limit: ₹${customer.creditLimit}`);
      console.log(`   Outstanding: ₹${customer.outstandingAmount}`);
      console.log(`   Available: ₹${customer.creditLimit - customer.outstandingAmount}`);
      console.log(`   Can process ₹${testAmount}? ${hasCreditAvailable ? 'Yes' : 'No'}\n`);

      // Test 6: Category details
      console.log('Test 6: Panel category details');
      if (customer.categories.panel.enabled) {
        console.log(`   Discount: ${customer.categories.panel.discount}%`);
        console.log(`   Credit Limit: ₹${customer.categories.panel.creditLimit}`);
        console.log(`   Payment Terms: ${customer.categories.panel.paymentTerms}`);
        console.log(`   Preferred Brands: ${customer.categories.panel.preferredBrands.join(', ')}\n`);
      }

      // Test 7: Search by GST
      console.log('Test 7: Search by GST number');
      const gstSearch = await Customer.findOne({ 
        organizationId: organization._id,
        gstNumber: customer.gstNumber 
      });
      console.log(`   Found: ${gstSearch ? gstSearch.companyName : 'Not found'}\n`);

      // Test 8: Filter by customer type
      console.log('Test 8: Filter by customer type (Dealer)');
      const dealers = await Customer.find({ 
        organizationId: organization._id,
        customerType: 'Dealer'
      });
      console.log(`   Found ${dealers.length} dealers\n`);

      // Test 9: Active customers with enabled panel category
      console.log('Test 9: Active customers with Panel category enabled');
      const panelCustomers = await Customer.find({
        organizationId: organization._id,
        status: 'Active',
        'categories.panel.enabled': true
      });
      console.log(`   Found ${panelCustomers.length} customers\n`);

      // Test 10: Generate new customer code
      console.log('Test 10: Generate new customer code');
      const newCode = await Customer.generateCustomerCode(organization._id);
      console.log(`   Generated: ${newCode}\n`);
    }

    console.log('✅ All tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
};

// Run the test
testCustomerModel();
