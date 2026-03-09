const mongoose = require('mongoose');
require('dotenv').config();

const Order = require('../models/vlite/Order');

async function checkDeliveredOrders() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vlite-furniture');
        console.log('✅ Connected to MongoDB');

        // Check different status variations
        const delivered1 = await Order.countDocuments({ orderStatus: 'DELIVERED' });
        const delivered2 = await Order.countDocuments({ orderStatus: 'Delivered' });
        const delivered3 = await Order.countDocuments({ deliveryStatus: 'Delivered' });
        const delivered4 = await Order.countDocuments({ status: 'Delivered' });

        console.log('\n📊 DELIVERED ORDERS COUNT:');
        console.log('orderStatus: "DELIVERED":', delivered1);
        console.log('orderStatus: "Delivered":', delivered2);
        console.log('deliveryStatus: "Delivered":', delivered3);
        console.log('status: "Delivered":', delivered4);

        // Sample orders
        const samples = await Order.find({
            $or: [
                { orderStatus: { $regex: /deliver/i } },
                { deliveryStatus: { $exists: true } },
                { status: { $exists: true } }
            ]
        }).limit(3).select('orderStatus deliveryStatus status orderNumber');

        console.log('\n📋 SAMPLE ORDERS:');
        samples.forEach((order, i) => {
            console.log(`${i + 1}. ${order.orderNumber} - orderStatus: "${order.orderStatus}", deliveryStatus: "${order.deliveryStatus}", status: "${order.status}"`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkDeliveredOrders();
