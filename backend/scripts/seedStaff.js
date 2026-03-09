require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('../models/vlite/Staff');

const ORGANIZATION_ID = '6935417d57433de522df0bbe'; // Your actual organization ID

const sampleStaff = [
  {
    tenantId: ORGANIZATION_ID,
    staffId: 'STF-001',
    name: 'Rajesh Kumar',
    address: '123 MG Road, Bangalore',
    contact: '9876543210',
    email: 'rajesh.kumar@vlite.com',
    salary: 45000,
    status: 'Active',
    designation: 'Production Manager',
    department: 'Production',
    joiningDate: new Date('2023-01-15')
  },
  {
    tenantId: ORGANIZATION_ID,
    staffId: 'STF-002',
    name: 'Priya Sharma',
    address: '456 Brigade Road, Bangalore',
    contact: '9765432109',
    email: 'priya.sharma@vlite.com',
    salary: 38000,
    status: 'Active',
    designation: 'Quality Inspector',
    department: 'Quality Control',
    joiningDate: new Date('2023-03-20')
  },
  {
    tenantId: ORGANIZATION_ID,
    staffId: 'STF-003',
    name: 'Amit Patel',
    address: '789 Residency Road, Bangalore',
    contact: '9654321098',
    email: 'amit.patel@vlite.com',
    salary: 35000,
    status: 'On Leave',
    designation: 'Warehouse Supervisor',
    department: 'Logistics',
    joiningDate: new Date('2023-05-10')
  },
  {
    tenantId: ORGANIZATION_ID,
    staffId: 'STF-004',
    name: 'Sneha Reddy',
    address: '321 Indiranagar, Bangalore',
    contact: '9543210987',
    email: 'sneha.reddy@vlite.com',
    salary: 42000,
    status: 'Active',
    designation: 'HR Manager',
    department: 'Human Resources',
    joiningDate: new Date('2022-11-01')
  },
  {
    tenantId: ORGANIZATION_ID,
    staffId: 'STF-005',
    name: 'Vikram Singh',
    address: '654 Koramangala, Bangalore',
    contact: '9432109876',
    email: 'vikram.singh@vlite.com',
    salary: 32000,
    status: 'Active',
    designation: 'Machine Operator',
    department: 'Production',
    joiningDate: new Date('2024-02-15')
  },
  {
    tenantId: ORGANIZATION_ID,
    staffId: 'STF-006',
    name: 'Anita Desai',
    address: '987 Whitefield, Bangalore',
    contact: '9321098765',
    email: 'anita.desai@vlite.com',
    salary: 48000,
    status: 'Active',
    designation: 'Accounts Manager',
    department: 'Finance',
    joiningDate: new Date('2022-08-20')
  },
  {
    tenantId: ORGANIZATION_ID,
    staffId: 'STF-007',
    name: 'Ravi Verma',
    address: '147 JP Nagar, Bangalore',
    contact: '9210987654',
    email: 'ravi.verma@vlite.com',
    salary: 28000,
    status: 'Inactive',
    designation: 'Helper',
    department: 'Production',
    joiningDate: new Date('2023-09-05')
  },
  {
    tenantId: ORGANIZATION_ID,
    staffId: 'STF-008',
    name: 'Kavita Nair',
    address: '258 Electronic City, Bangalore',
    contact: '9109876543',
    email: 'kavita.nair@vlite.com',
    salary: 40000,
    status: 'Active',
    designation: 'Sales Executive',
    department: 'Sales',
    joiningDate: new Date('2023-07-12')
  },
  {
    tenantId: ORGANIZATION_ID,
    staffId: 'STF-009',
    name: 'Suresh Rao',
    address: '369 HSR Layout, Bangalore',
    contact: '9098765432',
    email: 'suresh.rao@vlite.com',
    salary: 30000,
    status: 'Suspended',
    designation: 'Delivery Driver',
    department: 'Logistics',
    joiningDate: new Date('2024-01-20')
  },
  {
    tenantId: ORGANIZATION_ID,
    staffId: 'STF-010',
    name: 'Meera Krishnan',
    address: '741 Jayanagar, Bangalore',
    contact: '8987654321',
    email: 'meera.krishnan@vlite.com',
    salary: 36000,
    status: 'Active',
    designation: 'Design Assistant',
    department: 'Design',
    joiningDate: new Date('2023-12-01')
  }
];

async function seedStaff() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await Staff.deleteMany({ tenantId: ORGANIZATION_ID });
    console.log('Cleared existing staff data');

    await Staff.insertMany(sampleStaff);
    console.log('Staff data seeded successfully');

    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding staff:', error);
    process.exit(1);
  }
}

seedStaff();
