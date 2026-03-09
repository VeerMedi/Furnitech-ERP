const mongoose = require('mongoose');
require('dotenv').config();

const Lead = require('../models/vlite/Lead');

async function checkLeads() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vlite-furniture');
        console.log('✅ Connected to MongoDB');

        // Count total leads
        const totalLeads = await Lead.countDocuments();
        console.log('\n📊 LEADS COUNT:');
        console.log('Total Leads:', totalLeads);

        // Get all leads
        const leads = await Lead.find().limit(10);
        console.log('\n📋 SAMPLE LEADS:');
        leads.forEach((lead, index) => {
            console.log(`${index + 1}. ${lead.customerName} - ${lead.email} - Status: ${lead.status} - Onboarded: ${lead.isOnboarded}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkLeads();
