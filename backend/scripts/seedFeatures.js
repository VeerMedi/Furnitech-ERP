/**
 * Seed Additional Features
 * Adds or updates features to match the actual dashboard structure
 * Run this after the main seed script
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Feature = require('../models/shared/Feature');
const connectDB = require('../config/database');
const logger = require('../utils/logger');

const additionalFeatures = [
  {
    code: 'DASHBOARD',
    name: 'Dashboard',
    description: 'Main analytics and overview dashboard',
    category: 'CORE',
    displayOrder: 0,
    icon: 'layout-dashboard',
    subFeatures: [],
  },
  {
    code: 'CUSTOMERS',
    name: 'Customers',
    description: 'Customer management and profiles',
    category: 'CORE',
    displayOrder: 1,
    icon: 'building-2',
    subFeatures: [
      {
        code: 'CUSTOMER_MANAGE',
        name: 'Manage Customers',
        description: 'Create, edit, and delete customers',
        permissions: [
          { action: 'CREATE', description: 'Create new customers' },
          { action: 'READ', description: 'View customer details' },
          { action: 'UPDATE', description: 'Edit customer information' },
          { action: 'DELETE', description: 'Delete customers' },
        ],
      },
    ],
  },
  {
    code: 'CRM',
    name: 'Customer Relationship Management',
    description: 'Lead tracking, pipeline management, and advance payments',
    category: 'CORE',
    displayOrder: 2,
    icon: 'users',
    subFeatures: [
      {
        code: 'CRM_DASHBOARD',
        name: 'CRM Dashboard',
        description: 'CRM overview and metrics',
        permissions: [
          { action: 'READ', description: 'View CRM dashboard' },
        ],
      },
      {
        code: 'CRM_PIPELINE',
        name: 'Sales Pipeline',
        description: 'Manage sales stages and opportunities',
        permissions: [
          { action: 'CREATE', description: 'Create opportunities' },
          { action: 'READ', description: 'View pipeline' },
          { action: 'UPDATE', description: 'Update opportunities' },
        ],
      },
      {
        code: 'CRM_PAYMENTS',
        name: 'Advance Payments',
        description: 'Track advance payments from customers',
        permissions: [
          { action: 'CREATE', description: 'Record advance payments' },
          { action: 'READ', description: 'View payment records' },
          { action: 'UPDATE', description: 'Update payment status' },
        ],
      },
    ],
  },
  {
    code: 'PRODUCTS',
    name: 'Products',
    description: 'Product catalog and management',
    category: 'CORE',
    displayOrder: 3,
    icon: 'armchair',
    subFeatures: [
      {
        code: 'PRODUCT_MANAGE',
        name: 'Manage Products',
        description: 'Create and manage product listings',
        permissions: [
          { action: 'CREATE', description: 'Create products' },
          { action: 'READ', description: 'View products' },
          { action: 'UPDATE', description: 'Edit products' },
          { action: 'DELETE', description: 'Delete products' },
        ],
      },
    ],
  },
  {
    code: 'INQUIRIES',
    name: 'Inquiries',
    description: 'Customer inquiry management',
    category: 'CORE',
    displayOrder: 4,
    icon: 'file-text',
    subFeatures: [
      {
        code: 'INQUIRY_MANAGE',
        name: 'Manage Inquiries',
        description: 'Track and respond to inquiries',
        permissions: [
          { action: 'CREATE', description: 'Create inquiries' },
          { action: 'READ', description: 'View inquiries' },
          { action: 'UPDATE', description: 'Update inquiry status' },
          { action: 'DELETE', description: 'Delete inquiries' },
        ],
      },
    ],
  },
  {
    code: 'QUOTATIONS',
    name: 'Quotations',
    description: 'Quote generation and management',
    category: 'CORE',
    displayOrder: 5,
    icon: 'dollar-sign',
    subFeatures: [
      {
        code: 'QUOTATION_CREATE',
        name: 'Create Quotations',
        description: 'Generate customer quotations',
        permissions: [
          { action: 'CREATE', description: 'Create quotations' },
          { action: 'READ', description: 'View quotations' },
          { action: 'UPDATE', description: 'Edit quotations' },
          { action: 'DELETE', description: 'Delete quotations' },
          { action: 'EXPORT', description: 'Export quotations' },
        ],
      },
    ],
  },
  {
    code: 'ORDERS',
    name: 'Orders',
    description: 'Order processing and tracking',
    category: 'CORE',
    displayOrder: 6,
    icon: 'package',
    subFeatures: [
      {
        code: 'ORDER_MANAGE',
        name: 'Manage Orders',
        description: 'Create and track orders',
        permissions: [
          { action: 'CREATE', description: 'Create orders' },
          { action: 'READ', description: 'View orders' },
          { action: 'UPDATE', description: 'Update orders' },
          { action: 'DELETE', description: 'Delete orders' },
        ],
      },
    ],
  },
  {
    code: 'DRAWINGS',
    name: 'Drawing Management',
    description: 'Technical drawings and specifications',
    category: 'CORE',
    displayOrder: 7,
    icon: 'pen-tool',
    subFeatures: [
      {
        code: 'DRAWING_MANAGE',
        name: 'Manage Drawings',
        description: 'Upload and manage technical drawings',
        permissions: [
          { action: 'CREATE', description: 'Upload drawings' },
          { action: 'READ', description: 'View drawings' },
          { action: 'UPDATE', description: 'Edit drawings' },
          { action: 'DELETE', description: 'Delete drawings' },
        ],
      },
    ],
  },
  {
    code: 'MACHINES',
    name: 'Machine Management',
    description: 'Equipment and machinery tracking',
    category: 'CORE',
    displayOrder: 8,
    icon: 'wrench',
    subFeatures: [
      {
        code: 'MACHINE_MANAGE',
        name: 'Manage Machines',
        description: 'Track and maintain machines',
        permissions: [
          { action: 'CREATE', description: 'Add machines' },
          { action: 'READ', description: 'View machine status' },
          { action: 'UPDATE', description: 'Update machine info' },
        ],
      },
    ],
  },
  {
    code: 'PRODUCTION',
    name: 'Production Management',
    description: 'Pre and post production workflows',
    category: 'CORE',
    displayOrder: 9,
    icon: 'factory',
    subFeatures: [
      {
        code: 'PRE_PRODUCTION',
        name: 'Pre-Production',
        description: 'Planning and preparation',
        permissions: [
          { action: 'READ', description: 'View pre-production' },
          { action: 'UPDATE', description: 'Update status' },
        ],
      },
      {
        code: 'POST_PRODUCTION',
        name: 'Post-Production',
        description: 'Quality control and finishing',
        permissions: [
          { action: 'READ', description: 'View post-production' },
          { action: 'UPDATE', description: 'Update status' },
        ],
      },
    ],
  },
  {
    code: 'TRANSPORT',
    name: 'Transport & Delivery',
    description: 'Delivery order management and tracking',
    category: 'CORE',
    displayOrder: 10,
    icon: 'truck',
    subFeatures: [
      {
        code: 'TRANSPORT_MANAGE',
        name: 'Manage Transport',
        description: 'Create and track deliveries',
        permissions: [
          { action: 'CREATE', description: 'Create delivery orders' },
          { action: 'READ', description: 'View transport status' },
          { action: 'UPDATE', description: 'Update delivery status' },
        ],
      },
    ],
  },
  {
    code: 'VENDORS',
    name: 'Vendor Management',
    description: 'Vendor details and payment tracking',
    category: 'CORE',
    displayOrder: 11,
    icon: 'building-2',
    subFeatures: [
      {
        code: 'VENDOR_DETAILS',
        name: 'Vendor Details',
        description: 'Manage vendor information',
        permissions: [
          { action: 'CREATE', description: 'Add vendors' },
          { action: 'READ', description: 'View vendor details' },
          { action: 'UPDATE', description: 'Edit vendor info' },
          { action: 'DELETE', description: 'Remove vendors' },
        ],
      },
      {
        code: 'VENDOR_PAYMENTS',
        name: 'Vendor Payments',
        description: 'Track payments to vendors',
        permissions: [
          { action: 'CREATE', description: 'Record payments' },
          { action: 'READ', description: 'View payment history' },
          { action: 'UPDATE', description: 'Update payments' },
        ],
      },
    ],
  },
  {
    code: 'MANAGEMENT',
    name: 'Staff Management',
    description: 'Employee and staff administration',
    category: 'CORE',
    displayOrder: 12,
    icon: 'users',
    subFeatures: [
      {
        code: 'STAFF',
        name: 'Staff',
        description: 'Manage staff members',
        permissions: [
          { action: 'CREATE', description: 'Add staff' },
          { action: 'READ', description: 'View staff' },
          { action: 'UPDATE', description: 'Edit staff' },
          { action: 'DELETE', description: 'Remove staff' },
        ],
      },
      {
        code: 'EMPLOYEE',
        name: 'Employee',
        description: 'Manage employees',
        permissions: [
          { action: 'CREATE', description: 'Add employees' },
          { action: 'READ', description: 'View employees' },
          { action: 'UPDATE', description: 'Edit employees' },
          { action: 'DELETE', description: 'Remove employees' },
        ],
      },
    ],
  },
  {
    code: 'USERS',
    name: 'Users & Permissions',
    description: 'User access and permission management',
    category: 'CORE',
    displayOrder: 13,
    icon: 'user-circle',
    subFeatures: [
      {
        code: 'USER_MANAGE',
        name: 'Manage Users',
        description: 'Create and manage user accounts',
        permissions: [
          { action: 'CREATE', description: 'Create users' },
          { action: 'READ', description: 'View users' },
          { action: 'UPDATE', description: 'Edit user permissions' },
          { action: 'DELETE', description: 'Delete users' },
        ],
      },
    ],
  },
  {
    code: 'RAW_MATERIAL',
    name: 'Raw Materials',
    description: 'Material inventory and price book management',
    category: 'CORE',
    displayOrder: 14,
    icon: 'box',
    subFeatures: [
      {
        code: 'RAW_MATERIAL_DASHBOARD',
        name: 'Material Dashboard',
        description: 'Overview of raw materials',
        permissions: [
          { action: 'READ', description: 'View dashboard' },
        ],
      },
      {
        code: 'PRICE_BOOK',
        name: 'Price Book',
        description: 'Material pricing management',
        permissions: [
          { action: 'CREATE', description: 'Add prices' },
          { action: 'READ', description: 'View prices' },
          { action: 'UPDATE', description: 'Update prices' },
        ],
      },
    ],
  },
  {
    code: 'INVENTORY',
    name: 'Inventory Management',
    description: 'Stock tracking and purchase orders',
    category: 'CORE',
    displayOrder: 15,
    icon: 'warehouse',
    subFeatures: [
      {
        code: 'INVENTORY_DASHBOARD',
        name: 'Inventory Dashboard',
        description: 'Stock overview',
        permissions: [
          { action: 'READ', description: 'View inventory' },
        ],
      },
      {
        code: 'PURCHASE_ORDERS',
        name: 'Purchase Orders',
        description: 'Create and track purchase orders',
        permissions: [
          { action: 'CREATE', description: 'Create POs' },
          { action: 'READ', description: 'View POs' },
          { action: 'UPDATE', description: 'Update POs' },
        ],
      },
    ],
  },
];

const seedAdditionalFeatures = async () => {
  try {
    const conn = await connectDB();
    
    if (!conn) {
      console.error('\n❌ Failed to connect to database');
      console.error('Please ensure MongoDB is running and the connection string is correct.');
      console.error('\nOptions:');
      console.error('1. Start local MongoDB: mongod --dbpath /path/to/data');
      console.error('2. Set MONGODB_URI in your .env file with your MongoDB Atlas connection string');
      process.exit(1);
    }

    console.log('✅ Connected to database successfully\n');
    console.log('Upserting features...');
    
    for (const feature of additionalFeatures) {
      await Feature.findOneAndUpdate(
        { code: feature.code },
        feature,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`✅ Feature ${feature.code} (${feature.name}) upserted`);
    }

    console.log(`\n✅ Successfully processed ${additionalFeatures.length} features`);
    console.log('\nYou can now use these features in the superadmin panel to enable/disable dashboards for organizations.');
    
    process.exit(0);
  } catch (error) {
    logger.error(`Seed error: ${error.message}`);
    console.error('\n❌ Error seeding features:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the seed function
seedAdditionalFeatures();
