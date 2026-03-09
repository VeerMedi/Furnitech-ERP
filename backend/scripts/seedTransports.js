const mongoose = require('mongoose');
const Transport = require('../models/vlite/Transport');
require('dotenv').config();

const ORGANIZATION_ID = '6935417d57433de522df0bbe'; // Vlite organization

const sampleTransports = [
  {
    tenantId: ORGANIZATION_ID,
    orderNumber: `ORD-${Date.now()}-001`,
    productId: 'PROD-001',
    productName: 'Wooden Dining Table',
    clientName: 'Raj Kumar',
    clientAddress: '123 Business Park, Mumbai',
    clientContact: '9876543210',
    vehicleType: 'Truck',
    vehicleNumber: 'MH-02-AB-1234',
    driverId: 'DRV-001',
    driverName: 'Ravi Singh',
    driverContact: '9123456789',
    status: 'Delivered',
    deliveryDate: new Date('2025-12-05'),
    distance: 45.5,
    estimatedTime: 2,
    notes: 'Handle with care',
    statusLogs: [
      {
        status: 'Scheduled',
        timestamp: new Date('2025-12-05T08:00:00'),
        notes: 'Order scheduled for delivery'
      },
      {
        status: 'En Route',
        timestamp: new Date('2025-12-05T10:15:00'),
        notes: 'Vehicle departed from warehouse'
      },
      {
        status: 'Delivered',
        timestamp: new Date('2025-12-05T14:45:00'),
        notes: 'Package delivered and signed'
      }
    ]
  },
  {
    tenantId: ORGANIZATION_ID,
    orderNumber: `ORD-${Date.now()}-002`,
    productId: 'PROD-002',
    productName: 'Office Chair Set',
    clientName: 'Priya Sharma',
    clientAddress: '456 Corporate Tower, Delhi',
    clientContact: '9988776655',
    vehicleType: 'Van',
    vehicleNumber: 'DL-01-CD-5678',
    driverId: 'DRV-002',
    driverName: 'Amit Patel',
    driverContact: '9987654321',
    status: 'En Route',
    deliveryDate: new Date('2025-12-08'),
    distance: 78.2,
    estimatedTime: 4,
    notes: 'Fragile items',
    statusLogs: [
      {
        status: 'Scheduled',
        timestamp: new Date('2025-12-08T07:00:00'),
        notes: 'Order scheduled'
      },
      {
        status: 'En Route',
        timestamp: new Date('2025-12-08T09:30:00'),
        notes: 'On the way to destination'
      }
    ]
  },
  {
    tenantId: ORGANIZATION_ID,
    orderNumber: `ORD-${Date.now()}-003`,
    productId: 'PROD-003',
    productName: 'Sofa Set',
    clientName: 'Vikram Reddy',
    clientAddress: '789 Tech Hub, Bangalore',
    clientContact: '9999888777',
    vehicleType: 'Truck',
    vehicleNumber: 'KA-05-EF-9101',
    driverId: 'DRV-003',
    driverName: 'Suresh Kumar',
    driverContact: '9876123456',
    status: 'Scheduled',
    deliveryDate: new Date('2025-12-09'),
    distance: 62.0,
    estimatedTime: 3,
    notes: 'Premium delivery',
    statusLogs: [
      {
        status: 'Scheduled',
        timestamp: new Date('2025-12-08T10:00:00'),
        notes: 'Order scheduled for tomorrow'
      }
    ]
  },
  {
    tenantId: ORGANIZATION_ID,
    orderNumber: `ORD-${Date.now()}-004`,
    productId: 'PROD-004',
    productName: 'Bed Frame',
    clientName: 'Anjali Desai',
    clientAddress: '321 Premium Residency, Pune',
    clientContact: '9876543212',
    vehicleType: 'Van',
    vehicleNumber: 'MH-09-GH-1121',
    driverId: 'DRV-004',
    driverName: 'Mohan Das',
    driverContact: '9912345678',
    status: 'Delivered',
    deliveryDate: new Date('2025-12-04'),
    distance: 35.8,
    estimatedTime: 2,
    actualDeliveryTime: new Date('2025-12-04T16:30:00'),
    notes: 'Assembly required',
    statusLogs: [
      {
        status: 'Scheduled',
        timestamp: new Date('2025-12-04T08:00:00'),
        notes: 'Order scheduled'
      },
      {
        status: 'En Route',
        timestamp: new Date('2025-12-04T10:00:00'),
        notes: 'Dispatched'
      },
      {
        status: 'Delivered',
        timestamp: new Date('2025-12-04T16:30:00'),
        notes: 'Successfully delivered'
      }
    ]
  },
  {
    tenantId: ORGANIZATION_ID,
    orderNumber: `ORD-${Date.now()}-005`,
    productId: 'PROD-005',
    productName: 'Cabinet Set',
    clientName: 'Sneha Gupta',
    clientAddress: '654 Luxury Avenue, Hyderabad',
    clientContact: '9876543213',
    vehicleType: 'Truck',
    vehicleNumber: 'TS-07-IJ-3141',
    driverId: 'DRV-005',
    driverName: 'Ramesh Babu',
    driverContact: '9834567890',
    status: 'Delayed',
    deliveryDate: new Date('2025-12-07'),
    distance: 98.5,
    estimatedTime: 5,
    notes: 'Traffic delay expected',
    statusLogs: [
      {
        status: 'Scheduled',
        timestamp: new Date('2025-12-07T06:00:00'),
        notes: 'Order scheduled'
      },
      {
        status: 'En Route',
        timestamp: new Date('2025-12-07T08:00:00'),
        notes: 'Started journey'
      },
      {
        status: 'Delayed',
        timestamp: new Date('2025-12-07T14:00:00'),
        notes: 'Heavy traffic on highway'
      }
    ]
  }
];

async function seedTransports() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete existing transports for this organization
    const deleteResult = await Transport.deleteMany({ tenantId: ORGANIZATION_ID });
    console.log(`Deleted ${deleteResult.deletedCount} existing transports`);

    // Insert sample transports
    const result = await Transport.insertMany(sampleTransports);
    console.log(`✓ Successfully seeded ${result.length} transports`);

    // Display summary
    const total = result.length;
    const delivered = result.filter(t => t.status === 'Delivered').length;
    const enRoute = result.filter(t => t.status === 'En Route').length;
    const scheduled = result.filter(t => t.status === 'Scheduled').length;
    const delayed = result.filter(t => t.status === 'Delayed').length;

    console.log('\nTransport Summary:');
    console.log(`Total Transports: ${total}`);
    console.log(`Delivered: ${delivered}`);
    console.log(`En Route: ${enRoute}`);
    console.log(`Scheduled: ${scheduled}`);
    console.log(`Delayed: ${delayed}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding transports:', error);
    process.exit(1);
  }
}

seedTransports();
