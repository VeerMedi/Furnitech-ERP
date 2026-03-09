require('dotenv').config();
const mongoose = require('mongoose');
const Inquiry = require('../models/vlite/Inquiry');

const ORGANIZATION_ID = '6935417d57433de522df0bbe';

async function checkInquiries() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/vlite_erp_multitenant');
    console.log('✅ Connected to MongoDB\n');

    const customerNames = [
      'Rahul Sharma',
      'Ankit Verma',
      'Neha Jain',
      'sourabh'
    ];

    for (const name of customerNames) {
      // Check in both companyName and meta.customerName
      const inquiries = await Inquiry.find({
        organization: ORGANIZATION_ID,
        $or: [
          { companyName: { $regex: new RegExp(name, 'i') } },
          { 'meta.customerName': { $regex: new RegExp(name, 'i') } }
        ]
      }).select('_id companyName meta.customerName meta.contact meta.email customerId createdAt');

      if (inquiries.length > 0) {
        console.log(`✅ Found ${inquiries.length} inquiry(s) for "${name}":`);
        inquiries.forEach((inq, index) => {
          console.log(`   ${index + 1}. ID: ${inq._id}`);
          console.log(`      Company: ${inq.companyName}`);
          console.log(`      Customer: ${inq.meta?.customerName || 'N/A'}`);
          console.log(`      Contact: ${inq.meta?.contact || 'N/A'}`);
          console.log(`      Email: ${inq.meta?.email || 'N/A'}`);
          console.log(`      Customer ID: ${inq.customerId || 'N/A'}`);
          console.log(`      Created: ${inq.createdAt}`);
          console.log('');
        });
      } else {
        console.log(`❌ No inquiry found for "${name}"\n`);
      }
    }

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkInquiries();
