/**
 * Clear Raw Materials Data Script
 * Removes only raw material data from the database
 * Keeps organization, users, and other data intact
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const RawMaterial = require('../models/vlite/RawMaterial');
const Organization = require('../models/shared/Organization');

const clearRawMaterials = async () => {
    try {
        await connectDB();

        // Get the organization
        const organization = await Organization.findOne();
        if (!organization) {
            console.log('❌ No organization found.');
            process.exit(1);
        }

        console.log(`🏢 Organization: ${organization.name}`);

        // Count existing raw materials
        const existingCount = await RawMaterial.countDocuments({ organizationId: organization._id });
        console.log(`📊 Current raw materials: ${existingCount}\n`);

        if (existingCount === 0) {
            console.log('ℹ️  No raw materials to delete. Database is already empty.');
        } else {
            // Delete all raw materials
            const result = await RawMaterial.deleteMany({ organizationId: organization._id });
            console.log(`✅ Successfully deleted ${result.deletedCount} raw materials\n`);
            console.log('🗑️  Raw Material Dashboard is now empty!');
            console.log('✨ Organization, users, and other data remain intact.\n');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

clearRawMaterials();
