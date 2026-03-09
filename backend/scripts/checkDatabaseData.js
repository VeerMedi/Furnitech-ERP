require('dotenv').config();
const mongoose = require('mongoose');

const checkDatabase = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vlite';
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB\n');

        // Get all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📊 Available Collections:');
        console.log(collections.map(c => c.name).join(', '));
        console.log('');

        // Check main collections
        const Lead = require('../models/vlite/Lead');
        const Customer = require('../models/vlite/Customer');
        const Order = require('../models/vlite/Order');
        const Product = require('../models/vlite/Product');
        const User = require('../models/vlite/User');

        console.log('📈 Collection Counts (ALL DATA - No filter):');
        console.log('  - Total Leads:', await Lead.countDocuments({}));
        console.log('  - Total Customers:', await Customer.countDocuments({}));
        console.log('  - Total Orders:', await Order.countDocuments({}));
        console.log('  - Total Products:', await Product.countDocuments({}));
        console.log('  - Total Users:', await User.countDocuments({}));
        console.log('');

        // Check with tenant filtering
        console.log('🔍 Checking tenantId field in documents:');
        const sampleLead = await Lead.findOne({});
        const sampleCustomer = await Customer.findOne({});
        const sampleOrder = await Order.findOne({});

        console.log('Sample Lead tenantId:', sampleLead?.tenantId);
        console.log('Sample Customer tenantId:', sampleCustomer?.tenantId);
        console.log('Sample Order tenantId:', sampleOrder?.tenantId);
        console.log('');

        // Get unique tenantIds
        const uniqueTenants = await Customer.distinct('tenantId');
        console.log('📋 Unique TenantIds found:', uniqueTenants);
        console.log('');

        // Count by each tenantId
        for (const tenantId of uniqueTenants) {
            console.log(`📊 Stats for TenantId: ${tenantId}`);
            console.log('  - Leads:', await Lead.countDocuments({ tenantId }));
            console.log('  - Customers:', await Customer.countDocuments({ tenantId }));
            console.log('  - Orders:', await Order.countDocuments({ tenantId }));
            console.log('  - Products:', await Product.countDocuments({ tenantId }));
            console.log('');
        }

        await mongoose.connection.close();
        console.log('✅ Database check completed');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkDatabase();
