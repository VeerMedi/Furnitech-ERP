const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('../models/vlite/Order');
const Customer = require('../models/vlite/Customer');

async function addMoreOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    const correctOrgId = '6935417d57433de522df0bbe';
    
    // Get existing customers
    let customers = await Customer.find({
      organizationId: new mongoose.Types.ObjectId(correctOrgId)
    }).limit(5);

    if (customers.length === 0) {
      console.log('❌ No customers found! Please run seedOrders.js first');
      await mongoose.disconnect();
      return;
    }

    console.log(`Found ${customers.length} customers\n`);

    // New orders data
    const newOrders = [
      {
        customer: customers[0]._id,
        orderDate: new Date(),
        expectedDeliveryDate: new Date('2025-12-22'),
        items: [
          {
            description: 'Bedroom Wardrobe - 3 Door',
            specifications: {
              dimensions: '6ft x 7ft',
              material: 'BWP Plywood + Laminate',
              color: 'Dark Brown',
              finish: 'Wood Grain'
            },
            quantity: 1,
            unitPrice: 72000,
            totalPrice: 72000,
            productionStatus: 'PENDING'
          },
          {
            description: 'Side Tables',
            specifications: {
              dimensions: '2ft x 1.5ft',
              material: 'Solid Wood',
              color: 'Walnut',
              finish: 'Polished'
            },
            quantity: 2,
            unitPrice: 8500,
            totalPrice: 17000,
            productionStatus: 'PENDING'
          }
        ],
        totalAmount: 89000,
        advanceReceived: 45000,
        balanceAmount: 44000,
        paymentStatus: 'PARTIAL',
        orderStatus: 'CONFIRMED',
        priority: 'MEDIUM',
        customerNotes: 'Prefer delivery on weekend',
        deliveryAddress: {
          street: customers[0].address,
          city: customers[0].city,
          state: customers[0].state,
          zipCode: customers[0].pincode
        }
      },
      {
        customer: customers[1]._id,
        orderDate: new Date(),
        expectedDeliveryDate: new Date('2025-12-28'),
        items: [
          {
            description: 'Office Desk with Drawers',
            specifications: {
              dimensions: '5ft x 2.5ft',
              material: 'Engineered Wood',
              color: 'White Matt',
              finish: 'Laminate'
            },
            quantity: 3,
            unitPrice: 15000,
            totalPrice: 45000,
            productionStatus: 'CUTTING'
          },
          {
            description: 'Office Chairs',
            specifications: {
              dimensions: 'Standard',
              material: 'Mesh + Steel Frame',
              color: 'Black',
              finish: 'Ergonomic'
            },
            quantity: 3,
            unitPrice: 5500,
            totalPrice: 16500,
            productionStatus: 'PENDING'
          }
        ],
        totalAmount: 61500,
        advanceReceived: 0,
        balanceAmount: 61500,
        paymentStatus: 'PENDING',
        orderStatus: 'IN_PRODUCTION',
        priority: 'HIGH',
        productionNotes: 'Urgent requirement for new office setup',
        deliveryAddress: {
          street: customers[1].address,
          city: customers[1].city,
          state: customers[1].state,
          zipCode: customers[1].pincode
        }
      },
      {
        customer: customers[2]._id,
        orderDate: new Date('2025-12-08'),
        expectedDeliveryDate: new Date('2025-12-16'),
        actualDeliveryDate: new Date('2025-12-16'),
        items: [
          {
            description: 'Shoe Rack - 5 Tier',
            specifications: {
              dimensions: '3ft x 5ft',
              material: 'Metal + Wood',
              color: 'Brown',
              finish: 'Powder Coated'
            },
            quantity: 1,
            unitPrice: 12000,
            totalPrice: 12000,
            productionStatus: 'COMPLETED'
          }
        ],
        totalAmount: 12000,
        advanceReceived: 12000,
        balanceAmount: 0,
        paymentStatus: 'COMPLETED',
        orderStatus: 'DELIVERED',
        priority: 'LOW',
        deliveryAddress: {
          street: customers[2].address,
          city: customers[2].city,
          state: customers[2].state,
          zipCode: customers[2].pincode
        }
      }
    ];

    // Create orders
    console.log('Creating new orders...\n');
    let createdCount = 0;

    for (const orderData of newOrders) {
      const order = await Order.create({
        ...orderData,
        organizationId: new mongoose.Types.ObjectId(correctOrgId)
      });

      console.log(`✅ Order ${order.orderNumber} created`);
      console.log(`   Customer: ${customers.find(c => c._id.equals(order.customer))?.name}`);
      console.log(`   Items: ${order.items.length}`);
      console.log(`   Total: ₹${order.totalAmount.toLocaleString()}`);
      console.log(`   Status: ${order.orderStatus}`);
      console.log(`   Priority: ${order.priority}\n`);
      createdCount++;
    }

    console.log(`\n✅ Successfully created ${createdCount} new orders!`);
    console.log('📊 Total Orders Summary:');
    
    const totalOrders = await Order.countDocuments({ 
      organizationId: new mongoose.Types.ObjectId(correctOrgId) 
    });
    
    const totalRevenue = await Order.aggregate([
      { $match: { organizationId: new mongoose.Types.ObjectId(correctOrgId) } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, paid: { $sum: '$advanceReceived' } } }
    ]);

    console.log(`   Total Orders: ${totalOrders}`);
    console.log(`   Total Revenue: ₹${totalRevenue[0]?.total.toLocaleString() || 0}`);
    console.log(`   Total Paid: ₹${totalRevenue[0]?.paid.toLocaleString() || 0}`);
    console.log('\n🔄 Refresh your browser to see all orders!');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

addMoreOrders();
