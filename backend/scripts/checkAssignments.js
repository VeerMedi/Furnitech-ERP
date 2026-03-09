require('dotenv').config();
const mongoose = require('mongoose');
const Inquiry = require('../models/vlite/Inquiry');
const connectDB = require('../config/database');

const checkAssignments = async () => {
    try {
        await connectDB();

        console.log('\n🔍 CHECKING INQUIRY ASSIGNMENTS\n');
        console.log('='.repeat(60));

        // Find all inquiries
        const allInquiries = await Inquiry.find({}).select('_id meta.customerName assignedTo assignedAt isOnboarded').lean();

        console.log(`\n📊 Total Inquiries: ${allInquiries.length}\n`);

        allInquiries.forEach((inq, i) => {
            console.log(`${i + 1}. ${inq.meta?.customerName || 'Unknown'}`);
            console.log(`   ID: ${inq._id}`);
            console.log(`   assignedTo: ${inq.assignedTo || 'NOT ASSIGNED'}`);
            console.log(`   assignedAt: ${inq.assignedAt || 'N/A'}`);
            console.log(`   isOnboarded: ${inq.isOnboarded || false}`);
            console.log('');
        });

        const assigned = allInquiries.filter(inq => inq.assignedTo);
        const unassigned = allInquiries.filter(inq => !inq.assignedTo && !inq.isOnboarded);

        console.log('📈 SUMMARY:');
        console.log(`   Assigned: ${assigned.length}`);
        console.log(`   Unassigned: ${unassigned.length}`);
        console.log(`   Onboarded: ${allInquiries.filter(inq => inq.isOnboarded).length}`);

        console.log('\n' + '='.repeat(60) + '\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

checkAssignments();
