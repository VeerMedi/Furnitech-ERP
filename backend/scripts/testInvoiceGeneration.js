/**
 * Test Invoice Generation
 * This script tests the invoice generation functionality
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/vlite/Order');
const Customer = require('../models/vlite/Customer');
const { generateInvoicePDF } = require('../utils/invoiceGenerator');
const path = require('path');
const fs = require('fs');

async function testInvoiceGeneration() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find a post-production order (from our seed data)
    console.log('\n🔍 Finding a post-production order...');
    const order = await Order.findOne({
      orderNumber: { $in: ['ORD25000008', 'ORD25000009', 'ORD25000010'] }
    }).populate('customer').limit(1);

    if (!order) {
      console.log('❌ No orders found. Please run seedPostProduction.js first.');
      process.exit(1);
    }

    console.log(`✅ Found order: ${order.orderNumber}`);
    console.log(`   Customer: ${order.customer?.firstName} ${order.customer?.lastName}`);
    console.log(`   Total Amount: ₹${order.totalAmount}`);

    // Generate invoice
    console.log('\n📄 Generating invoice PDF...');
    
    const companyDetails = {
      name: 'Vlite Furnitures',
      address: 'Manufacturing Unit, Industrial Area, Sector 24',
      phone: '+91 98765 43210',
      email: 'info@vlitefurnitures.com',
      gstNumber: '24XXXXX1234X1Z5',
    };

    // Add invoice details to order if not exists
    if (!order.invoice || !order.invoice.invoiceNumber) {
      order.invoice = {
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`,
        invoiceDate: new Date(),
      };
      await order.save();
      console.log(`✅ Created invoice number: ${order.invoice.invoiceNumber}`);
    }

    const invoicePath = await generateInvoicePDF(order, companyDetails);
    
    console.log(`✅ Invoice generated successfully!`);
    console.log(`   File location: ${invoicePath}`);
    console.log(`   File size: ${(fs.statSync(invoicePath).size / 1024).toFixed(2)} KB`);
    
    // Update order with invoice URL
    const invoiceFileName = path.basename(invoicePath);
    order.invoice.invoiceUrl = `/invoices/${invoiceFileName}`;
    order.invoiceStatus = 'GENERATED';
    await order.save();
    
    console.log(`✅ Order updated with invoice URL`);
    console.log(`   Invoice URL: ${order.invoice.invoiceUrl}`);
    
    console.log('\n✅ Invoice generation test completed successfully!');
    console.log(`\n📁 Check the invoice at: ${invoicePath}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
testInvoiceGeneration();
