require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/vlite/Order');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const order = await Order.findOne({ orderNumber: 'ORD25000008' });
  console.log('\n=== Order Details ===');
  console.log('Order ID:', order._id);
  console.log('Order Number:', order.orderNumber);
  console.log('Organization ID:', order.organizationId);
  console.log('\n=== Invoice Details ===');
  console.log('Invoice URL:', order.invoice?.invoiceUrl);
  console.log('Invoice Number:', order.invoice?.invoiceNumber);
  console.log('Invoice Status:', order.invoiceStatus);
  
  // Check if file exists
  const path = require('path');
  const fs = require('fs');
  const invoiceFileName = order.invoice?.invoiceUrl?.replace('/invoices/', '');
  const invoicePath = path.join(__dirname, '..', 'invoices', invoiceFileName);
  console.log('\n=== File System ===');
  console.log('Expected path:', invoicePath);
  console.log('File exists:', fs.existsSync(invoicePath));
  
  if (fs.existsSync(invoicePath)) {
    const stats = fs.statSync(invoicePath);
    console.log('File size:', (stats.size / 1024).toFixed(2), 'KB');
  }
  
  await mongoose.connection.close();
  process.exit(0);
});
