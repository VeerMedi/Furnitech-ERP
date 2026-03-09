require('dotenv').config();
const mongoose = require('mongoose');
const Transport = require('./models/vlite/Transport');

const seedTransportData = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/vlite';
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    await Transport.deleteMany({});
    console.log('Cleared existing transport data');

    const sampleTransports = [
      {
        tenantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        orderNumber: 'ORD-2025-001',
        productId: 'PROD-001',
        productName: 'Wooden Dining Table',
        clientName: 'Raj Kumar',
        clientAddress: '123 Business Park, Mumbai, MH 400001',
        clientContact: '9876543210',
        vehicleType: 'Truck',
        vehicleNumber: 'MH-02-AB-1234',
        driverId: 'DRV-001',
        driverName: 'Ravi Singh',
        driverContact: '9123456789',
        status: 'Delivered',
        deliveryDate: new Date('2025-12-05'),
        distance: 45.5,
        estimatedTime: 2.5,
        actualDeliveryTime: new Date('2025-12-05T14:30:00Z'),
        notes: 'Delivered successfully',
        statusLogs: [
          { status: 'Scheduled', timestamp: new Date('2025-12-04T08:00:00Z'), notes: 'Order scheduled' },
          { status: 'En Route', timestamp: new Date('2025-12-05T10:00:00Z'), notes: 'Vehicle departed' },
          { status: 'Delivered', timestamp: new Date('2025-12-05T14:30:00Z'), notes: 'Delivered to client' },
        ],
      },
      {
        tenantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        orderNumber: 'ORD-2025-002',
        productId: 'PROD-002',
        productName: 'Office Chair Set',
        clientName: 'Priya Sharma',
        clientAddress: '456 Corporate Tower, Delhi, DL 110001',
        clientContact: '9988776655',
        vehicleType: 'Van',
        vehicleNumber: 'DL-01-CD-5678',
        driverId: 'DRV-002',
        driverName: 'Amit Patel',
        driverContact: '9987654321',
        status: 'En Route',
        deliveryDate: new Date('2025-12-06'),
        distance: 78.2,
        estimatedTime: 3.5,
        notes: 'Currently in transit',
        statusLogs: [
          { status: 'Scheduled', timestamp: new Date('2025-12-05T08:00:00Z'), notes: 'Order scheduled' },
          { status: 'Confirmed', timestamp: new Date('2025-12-05T09:30:00Z'), notes: 'Driver assigned' },
          { status: 'En Route', timestamp: new Date('2025-12-05T10:15:00Z'), notes: 'Vehicle on road' },
        ],
      },
      {
        tenantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        orderNumber: 'ORD-2025-003',
        productId: 'PROD-003',
        productName: 'Sofa Set',
        clientName: 'Vikram Reddy',
        clientAddress: '789 Tech Hub, Bangalore, KA 560001',
        clientContact: '9999888777',
        vehicleType: 'Truck',
        vehicleNumber: 'KA-05-EF-9101',
        driverId: 'DRV-003',
        driverName: 'Suresh Kumar',
        driverContact: '9876123456',
        status: 'Scheduled',
        deliveryDate: new Date('2025-12-07'),
        distance: 62.0,
        estimatedTime: 2.8,
        notes: 'Scheduled for tomorrow',
        statusLogs: [
          { status: 'Scheduled', timestamp: new Date('2025-12-05T08:00:00Z'), notes: 'Order scheduled' },
        ],
      },
      {
        tenantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        orderNumber: 'ORD-2025-004',
        productId: 'PROD-004',
        productName: 'Bed Frame',
        clientName: 'Anjali Desai',
        clientAddress: '321 Premium Residency, Pune, MH 411001',
        clientContact: '9876543212',
        vehicleType: 'Van',
        vehicleNumber: 'MH-09-GH-1121',
        driverId: 'DRV-004',
        driverName: 'Mohan Das',
        driverContact: '9912345678',
        status: 'Delivered',
        deliveryDate: new Date('2025-12-04'),
        distance: 35.8,
        estimatedTime: 1.8,
        actualDeliveryTime: new Date('2025-12-04T16:00:00Z'),
        notes: 'Delivered successfully',
        statusLogs: [
          { status: 'Scheduled', timestamp: new Date('2025-12-03T08:00:00Z'), notes: 'Order scheduled' },
          { status: 'En Route', timestamp: new Date('2025-12-04T13:00:00Z'), notes: 'Vehicle departed' },
          { status: 'Delivered', timestamp: new Date('2025-12-04T16:00:00Z'), notes: 'Delivered to client' },
        ],
      },
      {
        tenantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        orderNumber: 'ORD-2025-005',
        productId: 'PROD-005',
        productName: 'Cabinet Set',
        clientName: 'Sneha Gupta',
        clientAddress: '654 Luxury Avenue, Hyderabad, TS 500001',
        clientContact: '9876543213',
        vehicleType: 'Truck',
        vehicleNumber: 'TS-07-IJ-3141',
        driverId: 'DRV-005',
        driverName: 'Ramesh Babu',
        driverContact: '9834567890',
        status: 'Delayed',
        deliveryDate: new Date('2025-12-05'),
        distance: 98.5,
        estimatedTime: 4.2,
        notes: 'Delayed due to traffic',
        statusLogs: [
          { status: 'Scheduled', timestamp: new Date('2025-12-04T08:00:00Z'), notes: 'Order scheduled' },
          { status: 'En Route', timestamp: new Date('2025-12-05T09:00:00Z'), notes: 'Vehicle on road' },
          { status: 'Delayed', timestamp: new Date('2025-12-05T14:00:00Z'), notes: 'Delayed due to traffic' },
        ],
      },
      {
        tenantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        orderNumber: 'ORD-2025-006',
        productId: 'PROD-006',
        productName: 'Wardrobe Cabinet',
        clientName: 'Arjun Singh',
        clientAddress: '987 Fashion Street, Chennai, TN 600001',
        clientContact: '9876543214',
        vehicleType: 'Truck',
        vehicleNumber: 'TN-08-KL-5151',
        driverId: 'DRV-001',
        driverName: 'Ravi Singh',
        driverContact: '9123456789',
        status: 'Scheduled',
        deliveryDate: new Date('2025-12-08'),
        distance: 52.3,
        estimatedTime: 2.3,
        notes: 'Scheduled for bulk delivery',
        statusLogs: [
          { status: 'Scheduled', timestamp: new Date('2025-12-05T08:00:00Z'), notes: 'Order scheduled' },
        ],
      },
      {
        tenantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        orderNumber: 'ORD-2025-007',
        productId: 'PROD-007',
        productName: 'Desk Organizer',
        clientName: 'Deepa Mishra',
        clientAddress: '147 Tech Park, Kolkata, WB 700001',
        clientContact: '9876543215',
        vehicleType: 'Van',
        vehicleNumber: 'WB-06-MN-7272',
        driverId: 'DRV-002',
        driverName: 'Amit Patel',
        driverContact: '9987654321',
        status: 'En Route',
        deliveryDate: new Date('2025-12-05'),
        distance: 41.7,
        estimatedTime: 1.9,
        notes: 'On the way to client',
        statusLogs: [
          { status: 'Scheduled', timestamp: new Date('2025-12-05T08:00:00Z'), notes: 'Order scheduled' },
          { status: 'En Route', timestamp: new Date('2025-12-05T09:30:00Z'), notes: 'Vehicle departed' },
        ],
      },
      {
        tenantId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        orderNumber: 'ORD-2025-008',
        productId: 'PROD-008',
        productName: 'Bookshelf',
        clientName: 'Karan Patel',
        clientAddress: '258 Home Street, Jaipur, RJ 302001',
        clientContact: '9876543216',
        vehicleType: 'Van',
        vehicleNumber: 'RJ-07-OP-8383',
        driverId: 'DRV-003',
        driverName: 'Suresh Kumar',
        driverContact: '9876123456',
        status: 'Delivered',
        deliveryDate: new Date('2025-12-05'),
        distance: 55.9,
        estimatedTime: 2.6,
        actualDeliveryTime: new Date('2025-12-05T12:45:00Z'),
        notes: 'Delivered successfully',
        statusLogs: [
          { status: 'Scheduled', timestamp: new Date('2025-12-04T08:00:00Z'), notes: 'Order scheduled' },
          { status: 'En Route', timestamp: new Date('2025-12-05T09:00:00Z'), notes: 'Vehicle departed' },
          { status: 'Delivered', timestamp: new Date('2025-12-05T12:45:00Z'), notes: 'Delivered to client' },
        ],
      },
    ];

    await Transport.insertMany(sampleTransports);
    console.log(`✅ Inserted ${sampleTransports.length} sample transport records`);

    await mongoose.connection.close();
    console.log('✅ Seed script completed successfully');
  } catch (error) {
    console.error('❌ Error seeding transport data:', error);
    process.exit(1);
  }
};

seedTransportData();
