const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const Organization = require('../models/shared/Organization');

const TARGET_ORG_ID = '6935417d57433de522df0bbe'; // The ID we want

async function checkOrg() {
    try {
        console.log('🚀 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const org = await Organization.findById(TARGET_ORG_ID);

        if (org) {
            console.log('✅ Organization EXISTS:', org.name, org._id);
        } else {
            console.log('❌ Organization NOT FOUND:', TARGET_ORG_ID);

            // Should we list what DOES exist?
            const allOrgs = await Organization.find({});
            console.log(`📋 Found ${allOrgs.length} other organizations:`);
            allOrgs.forEach(o => console.log(`- ${o.name}: ${o._id}`));
        }

        process.exit(0);

    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

checkOrg();
