require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/vlite/Product');
const connectDB = require('../config/database');

const checkProduct = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        const products = await Product.find({}).limit(5);
        console.log(`Found ${products.length} products total.`);

        if (products.length > 0) {
            console.log('Sample Product Category:', products[0].category);
            console.log('Sample Product Code:', products[0].productCode);
            console.log('Organization ID:', products[0].organizationId);
        }

        const counts = await Product.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);
        console.log('Counts by Category:', counts);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkProduct();
