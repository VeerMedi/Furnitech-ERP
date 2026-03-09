const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.DB_NAME
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, '❌ MongoDB connection error:'));
db.once('open', async () => {
  console.log('✅ MongoDB Connected');

  try {
    // Get all orders with their organizationId
    const orders = await db.collection('orders').find({}).toArray();

    console.log(`\n📊 Total Orders in Database: ${orders.length}\n`);

    if (orders.length > 0) {
      // Group by organizationId
      const orgGroups = {};
      orders.forEach(order => {
        const orgId = order.organizationId?.toString() || 'null';
        if (!orgGroups[orgId]) {
          orgGroups[orgId] = [];
        }
        orgGroups[orgId].push(order.orderNumber || order._id.toString());
      });

      console.log('📋 Orders by Organization ID:\n');
      Object.entries(orgGroups).forEach(([orgId, orderNumbers]) => {
        console.log(`Organization ID: ${orgId}`);
        console.log(`Type: ${typeof orders.find(o => o.organizationId?.toString() === orgId)?.organizationId}`);
        console.log(`Orders (${orderNumbers.length}):`, orderNumbers.join(', '));
        console.log('');
      });

      // Show first order details
      console.log('📄 Sample Order Details:');
      console.log('Order Number:', orders[0].orderNumber);
      console.log('Organization ID:', orders[0].organizationId);
      console.log('Type:', typeof orders[0].organizationId);
      console.log('Is ObjectId?', orders[0].organizationId instanceof mongoose.Types.ObjectId);
    } else {
      console.log('⚠️ No orders found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Connection closed');
  }
});
