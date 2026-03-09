/**
 * Check actual raw material data structure in database
 * To verify if height field is being saved properly
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const RawMaterial = require('../models/vlite/RawMaterial');
const Organization = require('../models/shared/Organization');

const checkMaterialData = async () => {
    try {
        await connectDB();

        const organization = await Organization.findOne();
        if (!organization) {
            console.log('❌ No organization found.');
            process.exit(1);
        }

        console.log(`🏢 Organization: ${organization.name}\n`);

        // Get first few materials
        const materials = await RawMaterial.find({ organizationId: organization._id })
            .limit(3)
            .select('name currentStock uom costPrice specifications category status');

        console.log(`📊 Found ${materials.length} materials\n`);

        if (materials.length === 0) {
            console.log('🚨 No materials in database!');
        } else {
            materials.forEach((material, index) => {
                console.log(`${index + 1}. ${material.name}`);
                console.log(`   Stock: ${material.currentStock} ${material.uom}`);
                console.log(`   Price: ₹${material.costPrice}`);
                console.log(`   Category: ${material.category}`);
                console.log(`   Status: ${material.status}`);
                console.log(`   Specifications:`, JSON.stringify(material.specifications, null, 2));
                console.log('');
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkMaterialData();
