const mongoose = require('mongoose');
const Vendor = require('../models/vlite/Vendor');
require('dotenv').config();

const vendorsData = [
  {
    tenantId: 'tenant_001',
    vendorId: 'VEN-001',
    vendorName: 'Timber Traders Pvt Ltd',
    contactNumber: '9876543210',
    email: 'contact@timbertraders.com',
    altContactNumber: '9876543211',
    address: '123 Industrial Area, Phase 2',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    gstNumber: '27AABCT1234A1Z5',
    paymentStatus: 'Half',
    totalAmount: 250000,
    paidAmount: 150000,
    balance: 100000,
    purchaseHistory: [
      {
        purchaseDate: new Date('2025-11-15'),
        itemName: 'Teak Wood Planks',
        quantity: 50,
        unitPrice: 2000,
        totalAmount: 100000,
        amountPaid: 60000,
        balance: 40000,
        status: 'Partial'
      },
      {
        purchaseDate: new Date('2025-12-01'),
        itemName: 'Oak Wood Sheets',
        quantity: 75,
        unitPrice: 2000,
        totalAmount: 150000,
        amountPaid: 90000,
        balance: 60000,
        status: 'Partial'
      }
    ]
  },
  {
    tenantId: 'tenant_001',
    vendorId: 'VEN-002',
    vendorName: 'Hardware Solutions Inc',
    contactNumber: '9876543220',
    email: 'sales@hardwaresolutions.com',
    altContactNumber: '9876543221',
    address: '456 Market Road',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
    gstNumber: '07AABCH1234B1Z5',
    paymentStatus: 'Done',
    totalAmount: 80000,
    paidAmount: 80000,
    balance: 0,
    purchaseHistory: [
      {
        purchaseDate: new Date('2025-11-20'),
        itemName: 'Screws and Bolts',
        quantity: 1000,
        unitPrice: 50,
        totalAmount: 50000,
        amountPaid: 50000,
        balance: 0,
        status: 'Paid'
      },
      {
        purchaseDate: new Date('2025-11-25'),
        itemName: 'Door Hinges',
        quantity: 200,
        unitPrice: 150,
        totalAmount: 30000,
        amountPaid: 30000,
        balance: 0,
        status: 'Paid'
      }
    ]
  },
  {
    tenantId: 'tenant_001',
    vendorId: 'VEN-003',
    vendorName: 'Premium Laminates Co',
    contactNumber: '9876543230',
    email: 'info@premiumlaminates.com',
    altContactNumber: '9876543231',
    address: '789 Trade Center',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560001',
    gstNumber: '29AABCL1234C1Z5',
    paymentStatus: 'Pending',
    totalAmount: 120000,
    paidAmount: 0,
    balance: 120000,
    purchaseHistory: [
      {
        purchaseDate: new Date('2025-12-03'),
        itemName: 'Laminate Sheets - Glossy',
        quantity: 100,
        unitPrice: 800,
        totalAmount: 80000,
        amountPaid: 0,
        balance: 80000,
        status: 'Pending'
      },
      {
        purchaseDate: new Date('2025-12-04'),
        itemName: 'Laminate Sheets - Matte',
        quantity: 50,
        unitPrice: 800,
        totalAmount: 40000,
        amountPaid: 0,
        balance: 40000,
        status: 'Pending'
      }
    ]
  },
  {
    tenantId: 'tenant_001',
    vendorId: 'VEN-004',
    vendorName: 'Glass World Enterprises',
    contactNumber: '9876543240',
    email: 'orders@glassworld.com',
    altContactNumber: '9876543241',
    address: '321 Glass Street',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    gstNumber: '27AABCG1234D1Z5',
    paymentStatus: 'Overdue',
    totalAmount: 95000,
    paidAmount: 20000,
    balance: 75000,
    purchaseHistory: [
      {
        purchaseDate: new Date('2025-10-15'),
        itemName: 'Tempered Glass Panels',
        quantity: 20,
        unitPrice: 3000,
        totalAmount: 60000,
        amountPaid: 20000,
        balance: 40000,
        status: 'Partial'
      },
      {
        purchaseDate: new Date('2025-11-05'),
        itemName: 'Mirror Glass',
        quantity: 25,
        unitPrice: 1400,
        totalAmount: 35000,
        amountPaid: 0,
        balance: 35000,
        status: 'Pending'
      }
    ]
  },
  {
    tenantId: 'tenant_001',
    vendorId: 'VEN-005',
    vendorName: 'Fabric & Upholstery Hub',
    contactNumber: '9876543250',
    email: 'sales@fabrichub.com',
    altContactNumber: '9876543251',
    address: '654 Textile Lane',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380001',
    gstNumber: '24AABCF1234E1Z5',
    paymentStatus: 'On Hold',
    totalAmount: 65000,
    paidAmount: 0,
    balance: 65000,
    purchaseHistory: [
      {
        purchaseDate: new Date('2025-11-28'),
        itemName: 'Sofa Fabric - Premium',
        quantity: 100,
        unitPrice: 450,
        totalAmount: 45000,
        amountPaid: 0,
        balance: 45000,
        status: 'Pending'
      },
      {
        purchaseDate: new Date('2025-12-02'),
        itemName: 'Chair Fabric',
        quantity: 50,
        unitPrice: 400,
        totalAmount: 20000,
        amountPaid: 0,
        balance: 20000,
        status: 'Pending'
      }
    ]
  },
  {
    tenantId: 'tenant_001',
    vendorId: 'VEN-006',
    vendorName: 'Metal Works India',
    contactNumber: '9876543260',
    email: 'info@metalworksindia.com',
    altContactNumber: '9876543261',
    address: '987 Steel Road',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    gstNumber: '33AABCM1234F1Z5',
    paymentStatus: 'Half',
    totalAmount: 180000,
    paidAmount: 90000,
    balance: 90000,
    purchaseHistory: [
      {
        purchaseDate: new Date('2025-11-10'),
        itemName: 'Steel Frames',
        quantity: 30,
        unitPrice: 4000,
        totalAmount: 120000,
        amountPaid: 60000,
        balance: 60000,
        status: 'Partial'
      },
      {
        purchaseDate: new Date('2025-11-25'),
        itemName: 'Aluminum Channels',
        quantity: 40,
        unitPrice: 1500,
        totalAmount: 60000,
        amountPaid: 30000,
        balance: 30000,
        status: 'Partial'
      }
    ]
  },
  {
    tenantId: 'tenant_001',
    vendorId: 'VEN-007',
    vendorName: 'Paint & Polish Suppliers',
    contactNumber: '9876543270',
    email: 'contact@paintpolish.com',
    altContactNumber: '9876543271',
    address: '159 Color Street',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500001',
    gstNumber: '36AABCP1234G1Z5',
    paymentStatus: 'Done',
    totalAmount: 45000,
    paidAmount: 45000,
    balance: 0,
    purchaseHistory: [
      {
        purchaseDate: new Date('2025-11-18'),
        itemName: 'Wood Polish - 20L',
        quantity: 10,
        unitPrice: 3000,
        totalAmount: 30000,
        amountPaid: 30000,
        balance: 0,
        status: 'Paid'
      },
      {
        purchaseDate: new Date('2025-11-22'),
        itemName: 'Primer Paint',
        quantity: 15,
        unitPrice: 1000,
        totalAmount: 15000,
        amountPaid: 15000,
        balance: 0,
        status: 'Paid'
      }
    ]
  },
  {
    tenantId: 'tenant_001',
    vendorId: 'VEN-008',
    vendorName: 'Packaging Solutions Ltd',
    contactNumber: '9876543280',
    email: 'orders@packagingsolutions.com',
    altContactNumber: '9876543281',
    address: '753 Warehouse Zone',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700001',
    gstNumber: '19AABCPS1234H1Z5',
    paymentStatus: 'Pending',
    totalAmount: 35000,
    paidAmount: 0,
    balance: 35000,
    purchaseHistory: [
      {
        purchaseDate: new Date('2025-12-01'),
        itemName: 'Cardboard Boxes',
        quantity: 500,
        unitPrice: 50,
        totalAmount: 25000,
        amountPaid: 0,
        balance: 25000,
        status: 'Pending'
      },
      {
        purchaseDate: new Date('2025-12-03'),
        itemName: 'Bubble Wrap Rolls',
        quantity: 20,
        unitPrice: 500,
        totalAmount: 10000,
        amountPaid: 0,
        balance: 10000,
        status: 'Pending'
      }
    ]
  }
];

const ORGANIZATION_ID = '6935417d57433de522df0bbe'; // Vlite organization

async function seedVendors() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete existing vendors for this organization
    const deleteResult = await Vendor.deleteMany({ organizationId: ORGANIZATION_ID });
    console.log(`Deleted ${deleteResult.deletedCount} existing vendors`);

    // Update vendorsData to use organizationId instead of tenantId
    const vendorsToInsert = vendorsData.map(vendor => {
      const { tenantId, ...rest } = vendor;
      return {
        ...rest,
        organizationId: ORGANIZATION_ID,
        status: rest.status || 'Active'
      };
    });

    const result = await Vendor.insertMany(vendorsToInsert);
    console.log(`✓ Successfully seeded ${result.length} vendors`);

    // Display summary
    const totalAmount = result.reduce((sum, v) => sum + v.totalAmount, 0);
    const totalPaid = result.reduce((sum, v) => sum + v.paidAmount, 0);
    const totalBalance = result.reduce((sum, v) => sum + v.balance, 0);

    console.log('\nVendor Summary:');
    console.log(`Total Vendors: ${result.length}`);
    console.log(`Total Payable: ₹${totalAmount.toLocaleString()}`);
    console.log(`Total Paid: ₹${totalPaid.toLocaleString()}`);
    console.log(`Total Pending: ₹${totalBalance.toLocaleString()}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding vendors:', error);
    process.exit(1);
  }
}

seedVendors();
