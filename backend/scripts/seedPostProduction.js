const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('../models/vlite/Order');
const Customer = require('../models/vlite/Customer');

async function seedPostProductionOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    const correctOrgId = '6935417d57433de522df0bbe';
    
    // Get existing customers or create one
    let customer = await Customer.findOne({
      organizationId: new mongoose.Types.ObjectId(correctOrgId)
    });

    if (!customer) {
      console.log('Creating sample customer...');
      customer = await Customer.create({
        firstName: 'Rahul',
        lastName: 'Verma',
        phone: '9988776655',
        email: 'rahul.verma@example.com',
        address: 'Sector 18, Noida',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        organizationId: new mongoose.Types.ObjectId(correctOrgId)
      });
      console.log('✅ Created customer\n');
    }

    // Create 3 completed orders for Post-Production
    const postProductionOrders = [
      {
        // Wood Type Order - All 5 steps completed
        customer: customer._id,
        productType: 'Wood',
        orderStatus: 'COMPLETED',
        paymentStatus: 'PARTIAL',
        priority: 'HIGH',
        totalAmount: 125000,
        advanceReceived: 75000,
        expectedDeliveryDate: new Date('2025-12-18'),
        orderDate: new Date('2025-11-25'),
        
        // Wood workflow - All 5 steps completed
        woodWorkflowStatus: {
          beamSaw: true,
          edgeBending: true,
          boringMachine: true,
          finish: true,
          packaging: true
        },
        
        // Post-Production: Packaging & Dispatch
        packagingStatus: 'COMPLETED',
        packagingCompletedDate: new Date('2025-12-10'),
        dispatchDate: new Date('2025-12-11'),
        courierDetails: {
          courierName: 'Blue Dart Express',
          trackingNumber: 'BD12345678901',
          contactNumber: '1800-123-4567'
        },
        
        // Invoice
        invoice: {
          invoiceNumber: 'INV-2025-001',
          invoiceDate: new Date('2025-12-10'),
          invoiceUrl: '/invoices/INV-2025-001.pdf'
        },
        invoiceStatus: 'GENERATED',
        
        // Delivery Status
        deliveryStatus: 'IN_TRANSIT',
        deliveryStatusLogs: [
          {
            status: 'Ready for Dispatch',
            timestamp: new Date('2025-12-10T10:00:00'),
            location: 'Warehouse, Bangalore',
            notes: 'Order packed and ready for pickup'
          },
          {
            status: 'Picked Up',
            timestamp: new Date('2025-12-11T08:30:00'),
            location: 'Warehouse, Bangalore',
            notes: 'Courier picked up the package'
          },
          {
            status: 'In Transit',
            timestamp: new Date('2025-12-11T14:00:00'),
            location: 'Delhi Hub',
            notes: 'Package reached Delhi sorting facility'
          }
        ],
        
        items: [{
          description: 'Modular Wardrobe with Mirror',
          quantity: 1,
          unitPrice: 125000,
          totalPrice: 125000
        }],
        
        deliveryAddress: {
          street: 'A-45, Sector 18',
          area: 'Noida',
          city: 'Noida',
          state: 'Uttar Pradesh',
          zipCode: '201301'
        },
        
        productionNotes: 'Premium quality marine plywood used',
        customerNotes: 'Deliver between 10 AM to 5 PM',
        internalNotes: 'High priority customer - handle with care',
        
        organizationId: new mongoose.Types.ObjectId(correctOrgId)
      },
      
      {
        // Steel Type Order - All 6 steps completed
        customer: customer._id,
        productType: 'Steel',
        orderStatus: 'COMPLETED',
        paymentStatus: 'COMPLETED',
        priority: 'MEDIUM',
        totalAmount: 85000,
        advanceReceived: 85000,
        expectedDeliveryDate: new Date('2025-12-15'),
        orderDate: new Date('2025-11-20'),
        
        // Steel workflow - All 6 steps completed
        steelWorkflowStatus: {
          steelCutting: true,
          cncCutting: true,
          bending: true,
          welding: true,
          finishing: true,
          packaging: true
        },
        
        // Post-Production: Packaging & Dispatch
        packagingStatus: 'COMPLETED',
        packagingCompletedDate: new Date('2025-12-08'),
        dispatchDate: new Date('2025-12-09'),
        courierDetails: {
          courierName: 'DTDC Courier',
          trackingNumber: 'DTDC987654321',
          contactNumber: '1800-222-3344'
        },
        
        // Invoice
        invoice: {
          invoiceNumber: 'INV-2025-002',
          invoiceDate: new Date('2025-12-08'),
          invoiceUrl: '/invoices/INV-2025-002.pdf'
        },
        invoiceStatus: 'SENT_TO_CUSTOMER',
        
        // Delivery Status
        deliveryStatus: 'DELIVERED',
        deliveryStatusLogs: [
          {
            status: 'Ready for Dispatch',
            timestamp: new Date('2025-12-08T09:00:00'),
            location: 'Factory, Bangalore',
            notes: 'Steel furniture packed securely'
          },
          {
            status: 'Picked Up',
            timestamp: new Date('2025-12-09T07:00:00'),
            location: 'Factory, Bangalore',
            notes: 'Courier collected the shipment'
          },
          {
            status: 'In Transit',
            timestamp: new Date('2025-12-09T16:00:00'),
            location: 'Mumbai Hub',
            notes: 'Package in transit to destination'
          },
          {
            status: 'Out for Delivery',
            timestamp: new Date('2025-12-10T08:00:00'),
            location: 'Noida Local Office',
            notes: 'Out for delivery today'
          },
          {
            status: 'Delivered',
            timestamp: new Date('2025-12-10T15:30:00'),
            location: 'Customer Address, Noida',
            notes: 'Successfully delivered and signed by customer'
          }
        ],
        
        actualDeliveryDate: new Date('2025-12-10'),
        
        customerSignature: {
          signatureUrl: '/signatures/rahul-verma-sign.png',
          signedBy: 'Rahul Verma',
          signedAt: new Date('2025-12-10T15:30:00')
        },
        
        items: [{
          description: 'Steel Office Table with Drawers',
          quantity: 2,
          unitPrice: 42500,
          totalPrice: 85000
        }],
        
        deliveryAddress: {
          street: 'A-45, Sector 18',
          area: 'Noida',
          city: 'Noida',
          state: 'Uttar Pradesh',
          zipCode: '201301'
        },
        
        productionNotes: 'Powder coated finish applied',
        customerNotes: 'Install immediately after delivery',
        internalNotes: 'Customer has paid full amount - priority delivery',
        
        organizationId: new mongoose.Types.ObjectId(correctOrgId)
      },
      
      {
        // Wood Type Order - Ready for Dispatch
        customer: customer._id,
        productType: 'Wood',
        orderStatus: 'COMPLETED',
        paymentStatus: 'PENDING',
        priority: 'URGENT',
        totalAmount: 195000,
        advanceReceived: 50000,
        expectedDeliveryDate: new Date('2025-12-14'),
        orderDate: new Date('2025-11-15'),
        
        // Wood workflow - All 5 steps completed
        woodWorkflowStatus: {
          beamSaw: true,
          edgeBending: true,
          boringMachine: true,
          finish: true,
          packaging: true
        },
        
        // Post-Production: Packaging & Dispatch
        packagingStatus: 'COMPLETED',
        packagingCompletedDate: new Date('2025-12-11'),
        
        // Invoice
        invoice: {
          invoiceNumber: 'INV-2025-003',
          invoiceDate: new Date('2025-12-11'),
          invoiceUrl: '/invoices/INV-2025-003.pdf'
        },
        invoiceStatus: 'GENERATED',
        
        // Delivery Status
        deliveryStatus: 'READY_FOR_DISPATCH',
        deliveryStatusLogs: [
          {
            status: 'Production Completed',
            timestamp: new Date('2025-12-11T12:00:00'),
            location: 'Production Unit, Bangalore',
            notes: 'All production steps completed successfully'
          },
          {
            status: 'Quality Check Passed',
            timestamp: new Date('2025-12-11T14:00:00'),
            location: 'Quality Department',
            notes: 'Passed final quality inspection'
          },
          {
            status: 'Ready for Dispatch',
            timestamp: new Date('2025-12-11T16:00:00'),
            location: 'Warehouse',
            notes: 'Awaiting courier pickup'
          }
        ],
        
        items: [{
          description: 'Complete Bedroom Set (King Size Bed + Wardrobes)',
          quantity: 1,
          unitPrice: 195000,
          totalPrice: 195000
        }],
        
        deliveryAddress: {
          street: 'A-45, Sector 18',
          area: 'Noida',
          city: 'Noida',
          state: 'Uttar Pradesh',
          zipCode: '201301'
        },
        
        productionNotes: 'Premium teak finish applied',
        customerNotes: 'Payment COD - collect balance before delivery',
        internalNotes: 'Urgent order - arrange pickup ASAP',
        
        organizationId: new mongoose.Types.ObjectId(correctOrgId)
      }
    ];

    console.log('Creating post-production orders...\n');
    
    for (const orderData of postProductionOrders) {
      const order = await Order.create(orderData);
      console.log(`✅ Created order: ${order.orderNumber} - ${order.productType} Type - Status: ${order.deliveryStatus}`);
    }

    console.log('\n✅ Successfully created 3 post-production orders!');
    console.log('\n📦 Order Summary:');
    console.log('1. Wood Type - IN_TRANSIT - Invoice Generated - Partial Payment');
    console.log('2. Steel Type - DELIVERED - Invoice Sent - Full Payment - Customer Signed');
    console.log('3. Wood Type - READY_FOR_DISPATCH - Invoice Generated - Payment Pending');
    
    console.log('\n🎯 Navigate to: /production/post-production to view these orders');
    
  } catch (error) {
    console.error('❌ Error seeding post-production orders:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

seedPostProductionOrders();
