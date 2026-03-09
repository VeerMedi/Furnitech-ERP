const mongoose = require('mongoose');
const Organization = require('../models/shared/Organization');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function findVliteOrg() {
    const output = [];
    const log = (msg) => {
        console.log(msg);
        output.push(msg);
    };

    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        log('✓ Connected to MongoDB');

        // Find all organizations
        const allOrgs = await Organization.find({})
            .select('_id name slug email isActive subscriptionStatus database')
            .lean();

        log('\n📊 All Organizations in Database:');
        log('='.repeat(80));

        allOrgs.forEach((org, index) => {
            log(`\n${index + 1}. ${org.name}`);
            log(`   ID: ${org._id}`);
            log(`   Slug: ${org.slug}`);
            log(`   Email: ${org.email}`);
            log(`   Active: ${org.isActive}`);
            log(`   Status: ${org.subscriptionStatus}`);
            log(`   Database: ${org.database?.name || 'N/A'}`);
        });

        // Try to find Vlite organization
        const vliteOrg = allOrgs.find(org =>
            org.slug?.toLowerCase() === 'vlite' ||
            org.slug?.toLowerCase().includes('vlite') ||
            org.name?.toLowerCase().includes('vlite')
        );

        log('\n' + '='.repeat(80));
        if (vliteOrg) {
            log('\n✅ FOUND VLITE ORGANIZATION:');
            log(`   Name: ${vliteOrg.name}`);
            log(`   ID: ${vliteOrg._id}`);
            log(`   Slug: ${vliteOrg.slug}`);
            log(`   Database: ${vliteOrg.database?.name}`);
            log('\n📝 Add these to your .env file:');
            log(`VLITE_ORG_ID=${vliteOrg._id}`);
            log(`VLITE_ORG_SLUG=${vliteOrg.slug}`);
        } else {
            log('\n⚠️  NO VLITE ORGANIZATION FOUND');
            log('Please specify which organization should be used as Vlite');
            if (allOrgs.length > 0) {
                log(`\nCurrent options: ${allOrgs.map((o, i) => `${i + 1}. ${o.name}`).join(', ')}`);
            }
        }

        log('\n' + '='.repeat(80));

        // Save to file
        const outputFile = path.join(__dirname, 'vlite-org-result.txt');
        fs.writeFileSync(outputFile, output.join('\n'));
        log(`\n💾 Results saved to: ${outputFile}`);

        await mongoose.connection.close();
        log('\n✓ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

findVliteOrg();
