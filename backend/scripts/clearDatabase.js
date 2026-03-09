/**
 * Database Cleanup Script
 * 
 * ⚠️ WARNING: This script will DELETE all data except Users and Products!
 * 
 * Usage:
 *   node scripts/clearDatabase.js
 * 
 * What will be deleted:
 *   ✓ All Orders
 *   ✓ All Inquiries
 *   ✓ All Customers
 *   ✓ All Quotations
 *   ✓ All Drawings
 *   ✓ All Transports
 *   ✓ All Vendors
 *   ✓ All Raw Materials
 *   ✓ All Machines
 * 
 * What will be KEPT:
 *   ✓ Users
 *   ✓ Products
 *   ✓ Organizations
 *   ✓ Roles
 */

const mongoose = require('mongoose');
const readline = require('readline');
require('dotenv').config();

// Import all models
const Order = require('../models/vlite/Order');
const Inquiry = require('../models/vlite/Inquiry');
const Customer = require('../models/vlite/Customer');
const Quotation = require('../models/vlite/Quotation');
const Drawing = require('../models/vlite/Drawing');
const Transport = require('../models/vlite/Transport');
const Vendor = require('../models/vlite/Vendor');
const RawMaterial = require('../models/vlite/RawMaterial');
const Machine = require('../models/vlite/Machine');

// Create readline interface for user confirmation
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (question) => {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
};

const clearDatabase = async () => {
    try {
        console.log('\n🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        console.log('⚠️  WARNING: This will DELETE all data except Users and Products!\n');
        console.log('📋 Collections that will be cleared:');
        console.log('   - Orders');
        console.log('   - Inquiries');
        console.log('   - Customers');
        console.log('   - Quotations');
        console.log('   - Drawings');
        console.log('   - Transports');
        console.log('   - Vendors');
        console.log('   - Raw Materials');
        console.log('   - Machines\n');

        console.log('✅ Collections that will be KEPT:');
        console.log('   - Users');
        console.log('   - Products');
        console.log('   - Organizations');
        console.log('   - Roles\n');

        const answer = await askQuestion('Are you ABSOLUTELY sure you want to continue? (type "DELETE" to confirm): ');

        if (answer !== 'DELETE') {
            console.log('\n❌ Operation cancelled. Database unchanged.');
            process.exit(0);
        }

        console.log('\n🗑️  Starting cleanup...\n');

        // Delete data from each collection
        const results = [];

        // Orders
        const ordersDeleted = await Order.deleteMany({});
        results.push({ collection: 'Orders', count: ordersDeleted.deletedCount });
        console.log(`✓ Deleted ${ordersDeleted.deletedCount} orders`);

        // Inquiries
        const inquiriesDeleted = await Inquiry.deleteMany({});
        results.push({ collection: 'Inquiries', count: inquiriesDeleted.deletedCount });
        console.log(`✓ Deleted ${inquiriesDeleted.deletedCount} inquiries`);

        // Customers
        const customersDeleted = await Customer.deleteMany({});
        results.push({ collection: 'Customers', count: customersDeleted.deletedCount });
        console.log(`✓ Deleted ${customersDeleted.deletedCount} customers`);

        // Quotations
        const quotationsDeleted = await Quotation.deleteMany({});
        results.push({ collection: 'Quotations', count: quotationsDeleted.deletedCount });
        console.log(`✓ Deleted ${quotationsDeleted.deletedCount} quotations`);

        // Drawings
        const drawingsDeleted = await Drawing.deleteMany({});
        results.push({ collection: 'Drawings', count: drawingsDeleted.deletedCount });
        console.log(`✓ Deleted ${drawingsDeleted.deletedCount} drawings`);

        // Transports
        const transportsDeleted = await Transport.deleteMany({});
        results.push({ collection: 'Transports', count: transportsDeleted.deletedCount });
        console.log(`✓ Deleted ${transportsDeleted.deletedCount} transports`);

        // Vendors
        const vendorsDeleted = await Vendor.deleteMany({});
        results.push({ collection: 'Vendors', count: vendorsDeleted.deletedCount });
        console.log(`✓ Deleted ${vendorsDeleted.deletedCount} vendors`);

        // Raw Materials
        const rawMaterialsDeleted = await RawMaterial.deleteMany({});
        results.push({ collection: 'Raw Materials', count: rawMaterialsDeleted.deletedCount });
        console.log(`✓ Deleted ${rawMaterialsDeleted.deletedCount} raw materials`);

        // Machines
        const machinesDeleted = await Machine.deleteMany({});
        results.push({ collection: 'Machines', count: machinesDeleted.deletedCount });
        console.log(`✓ Deleted ${machinesDeleted.deletedCount} machines`);

        console.log('\n✅ Database cleanup completed successfully!\n');
        console.log('📊 Summary:');
        const totalDeleted = results.reduce((sum, r) => sum + r.count, 0);
        console.log(`   Total documents deleted: ${totalDeleted}\n`);

        results.forEach(r => {
            console.log(`   ${r.collection}: ${r.count}`);
        });

        console.log('\n✅ Users and Products remain intact.\n');

    } catch (error) {
        console.error('\n❌ Error during cleanup:', error.message);
        throw error;
    } finally {
        rl.close();
        await mongoose.connection.close();
        console.log('🔗 Database connection closed.');
        process.exit(0);
    }
};

// Run the script
clearDatabase();
