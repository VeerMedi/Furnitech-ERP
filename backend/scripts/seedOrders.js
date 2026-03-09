const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('../models/vlite/Order');
const Customer = require('../models/vlite/Customer');

async function seedOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    const correctOrgId = '6935417d57433de522df0bbe';
    
    // Get existing customers or create them
    let customers = await Customer.find({
      organizationId: new mongoose.Types.ObjectId(correctOrgId)
    }).limit(5);

    if (customers.length === 0) {
      console.log('Creating sample customers...');
      const sampleCustomers = [
        { name: 'Rajesh Kumar', phone: '9876543210', email: 'rajesh@example.com', address: 'MG Road, Bangalore', city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
        { name: 'Priya Sharma', phone: '9876543211', email: 'priya@example.com', address: 'Connaught Place, Delhi', city: 'Delhi', state: 'Delhi', pincode: '110001' },
        { name: 'Amit Patel', phone: '9876543212', email: 'amit@example.com', address: 'Ashram Road, Ahmedabad', city: 'Ahmedabad', state: 'Gujarat', pincode: '380009' },
        { name: 'Sneha Reddy', phone: '9876543213', email: 'sneha@example.com', address: 'Hitech City, Hyderabad', city: 'Hyderabad', state: 'Telangana', pincode: '500081' },
        { name: 'Vikram Singh', phone: '9876543214', email: 'vikram@example.com', address: 'Park Street, Kolkata', city: 'Kolkata', state: 'West Bengal', pincode: '700016' }
      ];

      for (const c of sampleCustomers) {
        const customer = await Customer.create({
          ...c,
          organizationId: new mongoose.Types.ObjectId(correctOrgId)
        });
        customers.push(customer);
      }
      console.log(`✅ Created ${customers.length} customers\n`);
    }

    // Sample orders data
    const ordersData = [
      {
        customer: customers[0]._id,
        expectedDeliveryDate: new Date('2025-12-20'),
        items: [
          {
            description: 'Modular Kitchen - L-Shaped',
            specifications: {
              dimensions: '10ft x 8ft',
              material: 'Marine Plywood + Laminate',
              color: 'White High Gloss',
              finish: 'Glossy'
            },
            quantity: 1,
            unitPrice: 150000,
            totalPrice: 150000,
            productionStatus: 'IN_PRODUCTION'
          },
          {
            description: 'Kitchen Cabinets (Upper)',
            specifications: {
              dimensions: '6ft x 2ft',
              material: 'Plywood + Laminate',
              color: 'Cream Matt',
              finish: 'Matte'
            },
            quantity: 6,
            unitPrice: 8000,
            totalPrice: 48000,
            productionStatus: 'CUTTING'
          }
        ],
        totalAmount: 198000,
        advanceReceived: 100000,
        balanceAmount: 98000,
        paymentStatus: 'PARTIAL',
        orderStatus: 'IN_PRODUCTION',
        priority: 'HIGH',
        productionNotes: 'Customer wants quick delivery. Prioritize this order.',
        customerNotes: 'Need soft-close hinges for all cabinets',
        deliveryAddress: {
          street: customers[0].address,
          city: customers[0].city,
          state: customers[0].state,
          zipCode: customers[0].pincode
        }
      },
      {
        customer: customers[1]._id,
        expectedDeliveryDate: new Date('2025-12-25'),
        items: [
          {
            description: 'Wardrobe - 4 Door Sliding',
            specifications: {
              dimensions: '8ft x 7ft',
              material: 'BWR Plywood + Laminate',
              color: 'Walnut',
              finish: 'Wood Texture'
            },
            quantity: 1,
            unitPrice: 85000,
            totalPrice: 85000,
            productionStatus: 'PENDING'
          }
        ],
        totalAmount: 85000,
        advanceReceived: 0,
        balanceAmount: 85000,
        paymentStatus: 'PENDING',
        orderStatus: 'CONFIRMED',
        priority: 'MEDIUM',
        customerNotes: 'Mirror on 2 doors required',
        deliveryAddress: {
          street: customers[1].address,
          city: customers[1].city,
          state: customers[1].state,
          zipCode: customers[1].pincode
        }
      },
      {
        customer: customers[2]._id,
        expectedDeliveryDate: new Date('2025-12-15'),
        items: [
          {
            description: 'TV Unit with Storage',
            specifications: {
              dimensions: '7ft x 2ft',
              material: 'MDF + Laminate',
              color: 'Grey & White',
              finish: 'Matte'
            },
            quantity: 1,
            unitPrice: 35000,
            totalPrice: 35000,
            productionStatus: 'COMPLETED'
          },
          {
            description: 'Wall Shelves',
            specifications: {
              dimensions: '5ft x 1ft',
              material: 'MDF + Paint',
              color: 'White',
              finish: 'Glossy'
            },
            quantity: 3,
            unitPrice: 4500,
            totalPrice: 13500,
            productionStatus: 'COMPLETED'
          }
        ],
        totalAmount: 48500,
        advanceReceived: 48500,
        balanceAmount: 0,
        paymentStatus: 'COMPLETED',
        orderStatus: 'COMPLETED',
        priority: 'URGENT',
        actualDeliveryDate: new Date('2025-12-14'),
        deliveryAddress: {
          street: customers[2].address,
          city: customers[2].city,
          state: customers[2].state,
          zipCode: customers[2].pincode
        }
      },
      {
        customer: customers[3]._id,
        expectedDeliveryDate: new Date('2025-12-30'),
        items: [
          {
            description: 'Study Table with Drawers',
            specifications: {
              dimensions: '5ft x 2.5ft',
              material: 'Plywood + Laminate',
              color: 'Oak Veneer',
              finish: 'Natural Wood'
            },
            quantity: 2,
            unitPrice: 18000,
            totalPrice: 36000,
            productionStatus: 'ASSEMBLY'
          },
          {
            description: 'Book Shelf',
            specifications: {
              dimensions: '6ft x 3ft',
              material: 'MDF + Laminate',
              color: 'Walnut',
              finish: 'Wood Grain'
            },
            quantity: 1,
            unitPrice: 22000,
            totalPrice: 22000,
            productionStatus: 'QC'
          }
        ],
        totalAmount: 58000,
        advanceReceived: 30000,
        balanceAmount: 28000,
        paymentStatus: 'PARTIAL',
        orderStatus: 'IN_PRODUCTION',
        priority: 'MEDIUM',
        productionNotes: 'Quality check pending for bookshelf',
        deliveryAddress: {
          street: customers[3].address,
          city: customers[3].city,
          state: customers[3].state,
          zipCode: customers[3].pincode
        }
      },
      {
        customer: customers[4]._id,
        expectedDeliveryDate: new Date('2026-01-05'),
        items: [
          {
            description: 'Dining Table Set (6 Seater)',
            specifications: {
              dimensions: '6ft x 3ft',
              material: 'Solid Wood',
              color: 'Mahogany',
              finish: 'Polished'
            },
            quantity: 1,
            unitPrice: 75000,
            totalPrice: 75000,
            productionStatus: 'PENDING'
          },
          {
            description: 'Dining Chairs',
            specifications: {
              dimensions: 'Standard',
              material: 'Wood + Fabric Cushion',
              color: 'Mahogany & Beige',
              finish: 'Polished'
            },
            quantity: 6,
            unitPrice: 6500,
            totalPrice: 39000,
            productionStatus: 'PENDING'
          }
        ],
        totalAmount: 114000,
        advanceReceived: 0,
        balanceAmount: 114000,
        paymentStatus: 'PENDING',
        orderStatus: 'CONFIRMED',
        priority: 'LOW',
        customerNotes: 'Custom design - share final design before production',
        deliveryAddress: {
          street: customers[4].address,
          city: customers[4].city,
          state: customers[4].state,
          zipCode: customers[4].pincode
        }
      },
      {
        customer: customers[0]._id,
        orderDate: new Date(),
        expectedDeliveryDate: new Date('2025-12-18'),
        items: [
          {
            description: 'Crockery Unit',
            specifications: {
              dimensions: '5ft x 6ft',
              material: 'Plywood + Glass',
              color: 'White & Transparent Glass',
              finish: 'Glossy'
            },
            quantity: 1,
            unitPrice: 55000,
            totalPrice: 55000,
            productionStatus: 'IN_PRODUCTION'
          }
        ],
        totalAmount: 55000,
        advanceReceived: 55000,
        balanceAmount: 0,
        paymentStatus: 'COMPLETED',
        orderStatus: 'IN_PRODUCTION',
        priority: 'HIGH',
        requiresInstallation: true,
        installationStatus: 'NOT_STARTED',
        deliveryAddress: {
          street: customers[0].address,
          city: customers[0].city,
          state: customers[0].state,
          zipCode: customers[0].pincode
        }
      }
    ];

    // Create orders
    console.log('Creating orders...\n');
    let createdCount = 0;

    for (const orderData of ordersData) {
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

    console.log(`\n✅ Successfully created ${createdCount} orders!`);
    console.log('📊 Order Summary:');
    
    const stats = {
      total: createdCount,
      confirmed: ordersData.filter(o => o.orderStatus === 'CONFIRMED').length,
      inProduction: ordersData.filter(o => o.orderStatus === 'IN_PRODUCTION').length,
      completed: ordersData.filter(o => o.orderStatus === 'COMPLETED').length,
      totalRevenue: ordersData.reduce((sum, o) => sum + o.totalAmount, 0),
      totalPaid: ordersData.reduce((sum, o) => sum + o.advanceReceived, 0)
    };

    console.log(`   Total Orders: ${stats.total}`);
    console.log(`   Confirmed: ${stats.confirmed}`);
    console.log(`   In Production: ${stats.inProduction}`);
    console.log(`   Completed: ${stats.completed}`);
    console.log(`   Total Revenue: ₹${stats.totalRevenue.toLocaleString()}`);
    console.log(`   Total Paid: ₹${stats.totalPaid.toLocaleString()}`);
    console.log('\n🔄 Refresh your browser to see the orders!');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedOrders();
