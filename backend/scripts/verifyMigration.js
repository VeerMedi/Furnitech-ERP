require('dotenv').config();
const mongoose = require('mongoose');

const verifyMigration = async () => {
    try {
        console.log('🔍 Verifying TenantId Migration...\n');

        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vlite';
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB\n');

        // Check if Organization exists
        const Organization = require('../models/shared/Organization');
        const org = await Organization.findOne({});

        if (org) {
            console.log('✅ Organization found:', org.name);
            console.log('📌 Organization ID:', org._id.toString());
            console.log('');
        } else {
            console.log('❌ No organization found!');
            console.log('');
        }

        // Check sample documents
        const Customer = require('../models/vlite/Customer');
        const Product = require('../models/vlite/Product');
        const Order = require('../models/vlite/Order');

        console.log('📊 Sample Document Check:\n');

        const sampleCustomer = await Customer.findOne({});
        console.log('Customer:');
        console.log('  Total:', await Customer.countDocuments({}));
        console.log('  With tenantId:', await Customer.countDocuments({ tenantId: { $exists: true, $ne: null } }));
        console.log('  Sample tenantId:', sampleCustomer?.tenantId || 'undefined');
        console.log('');

        const sampleProduct = await Product.findOne({});
        console.log('Product:');
        console.log('  Total:', await Product.countDocuments({}));
        console.log('  With tenantId:', await Product.countDocuments({ tenantId: { $exists: true, $ne: null } }));
        console.log('  Sample tenantId:', sampleProduct?.tenantId || 'undefined');
        console.log('');

        const sampleOrder = await Order.findOne({});
        console.log('Order:');
        console.log('  Total:', await Order.countDocuments({}));
        console.log('  With tenantId:', await Order.countDocuments({ tenantId: { $exists: true, $ne: null } }));
        console.log('  Sample tenantId:', sampleOrder?.tenantId || 'undefined');
        console.log('');

        await mongoose.connection.close();
        console.log('✅ Verification complete');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

verifyMigration();
