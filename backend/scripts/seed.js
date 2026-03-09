/**
 * Database Seeder Script
 * Seeds initial data including super admin, features, and sample organization
 * Run: node scripts/seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/database');
const SuperAdmin = require('../models/shared/SuperAdmin');
const Feature = require('../models/shared/Feature');
const Organization = require('../models/shared/Organization');
const Role = require('../models/vlite/Role');
const User = require('../models/vlite/User');
const RawMaterial = require('../models/vlite/RawMaterial');
const logger = require('../utils/logger');

// Feature definitions based on SRS
const features = [
  // Core Modules
  {
    code: 'MDM',
    name: 'Master Data Management',
    description: 'Manage raw materials, products, customers, staff, and settings',
    category: 'CORE',
    displayOrder: 1,
    icon: 'database',
    subFeatures: [
      {
        code: 'RAW_MATERIAL',
        name: 'Raw Material',
        description: 'Manage panels, laminates, edgebands, hardware, etc.',
        permissions: [
          { action: 'CREATE', description: 'Create new raw materials' },
          { action: 'READ', description: 'View raw materials' },
          { action: 'UPDATE', description: 'Edit raw materials' },
          { action: 'DELETE', description: 'Delete raw materials' },
        ],
      },
      {
        code: 'PRODUCT',
        name: 'Product Masters',
        description: 'Manage products and BOMs',
        permissions: [
          { action: 'CREATE', description: 'Create products' },
          { action: 'READ', description: 'View products' },
          { action: 'UPDATE', description: 'Edit products' },
          { action: 'DELETE', description: 'Delete products' },
        ],
      },
      {
        code: 'CUSTOMER',
        name: 'Customer',
        description: 'Manage customer information',
        permissions: [
          { action: 'CREATE', description: 'Create customers' },
          { action: 'READ', description: 'View customers' },
          { action: 'UPDATE', description: 'Edit customers' },
          { action: 'DELETE', description: 'Delete customers' },
        ],
      },
      {
        code: 'STAFF',
        name: 'Staff',
        description: 'Manage staff profiles',
        permissions: [
          { action: 'CREATE', description: 'Create staff' },
          { action: 'READ', description: 'View staff' },
          { action: 'UPDATE', description: 'Edit staff' },
          { action: 'DELETE', description: 'Delete staff' },
        ],
      },
    ],
  },
  {
    code: 'CRM',
    name: 'Customer Relationship Management',
    description: 'Lead tracking, inquiries, quotations, and approvals',
    category: 'CORE',
    displayOrder: 2,
    icon: 'users',
    subFeatures: [
      {
        code: 'INQUIRY',
        name: 'Inquiry Management',
        description: 'Track leads and inquiries',
        permissions: [
          { action: 'CREATE', description: 'Create inquiries' },
          { action: 'READ', description: 'View inquiries' },
          { action: 'UPDATE', description: 'Update inquiries' },
          { action: 'DELETE', description: 'Delete inquiries' },
        ],
      },
      {
        code: 'QUOTATION',
        name: 'Quotation',
        description: 'Create and manage quotations',
        permissions: [
          { action: 'CREATE', description: 'Create quotations' },
          { action: 'READ', description: 'View quotations' },
          { action: 'UPDATE', description: 'Edit quotations' },
          { action: 'APPROVE', description: 'Approve quotations' },
          { action: 'EXPORT', description: 'Export quotations' },
        ],
      },
      {
        code: 'ADVANCE_PAYMENT',
        name: 'Advance Payment',
        description: 'Track advance payments',
        permissions: [
          { action: 'CREATE', description: 'Record payments' },
          { action: 'READ', description: 'View payments' },
          { action: 'UPDATE', description: 'Update payments' },
        ],
      },
    ],
  },
  {
    code: 'INVENTORY',
    name: 'Inventory Management',
    description: 'Stock tracking, vendor management, and alerts',
    category: 'CORE',
    displayOrder: 3,
    icon: 'package',
    subFeatures: [
      {
        code: 'VENDOR',
        name: 'Vendor Management',
        description: 'Manage vendors and purchases',
        permissions: [
          { action: 'CREATE', description: 'Create vendors' },
          { action: 'READ', description: 'View vendors' },
          { action: 'UPDATE', description: 'Edit vendors' },
          { action: 'DELETE', description: 'Delete vendors' },
        ],
      },
      {
        code: 'STOCK',
        name: 'Stock Tracking',
        description: 'Track inventory levels',
        permissions: [
          { action: 'CREATE', description: 'Add stock' },
          { action: 'READ', description: 'View stock' },
          { action: 'UPDATE', description: 'Adjust stock' },
        ],
      },
    ],
  },
  {
    code: 'PRODUCTION',
    name: 'Production Management',
    description: 'Manufacturing, QC, dispatch, and installation',
    category: 'CORE',
    displayOrder: 4,
    icon: 'settings',
    subFeatures: [
      {
        code: 'ORDER',
        name: 'Production Orders',
        description: 'Manage production orders',
        permissions: [
          { action: 'CREATE', description: 'Create orders' },
          { action: 'READ', description: 'View orders' },
          { action: 'UPDATE', description: 'Update orders' },
        ],
      },
      {
        code: 'QC',
        name: 'Quality Control',
        description: 'Quality inspections',
        permissions: [
          { action: 'CREATE', description: 'Create QC records' },
          { action: 'READ', description: 'View QC records' },
          { action: 'APPROVE', description: 'Approve QC' },
        ],
      },
    ],
  },
  {
    code: 'FINANCE',
    name: 'Finance & Accounting',
    description: 'Price books, ledger, and payments',
    category: 'CORE',
    displayOrder: 5,
    icon: 'dollar-sign',
    subFeatures: [
      {
        code: 'PRICE_BOOK',
        name: 'Price Book',
        description: 'Manage pricing',
        permissions: [
          { action: 'CREATE', description: 'Create prices' },
          { action: 'READ', description: 'View prices' },
          { action: 'UPDATE', description: 'Update prices' },
        ],
      },
      {
        code: 'LEDGER',
        name: 'Ledger',
        description: 'Financial accounts',
        permissions: [
          { action: 'CREATE', description: 'Create entries' },
          { action: 'READ', description: 'View ledger' },
        ],
      },
    ],
  },
  // AI Features
  {
    code: 'AI_ANALYTICS',
    name: 'AI Analytics',
    description: 'AI-powered reports and insights',
    category: 'AI',
    displayOrder: 6,
    icon: 'brain',
    subFeatures: [
      {
        code: 'AI_REPORTS',
        name: 'AI Reports',
        description: 'Intelligent business reports',
        permissions: [
          { action: 'READ', description: 'View AI reports' },
        ],
      },
      {
        code: 'DEMAND_FORECAST',
        name: 'Demand Forecasting',
        description: 'Predict future demand',
        permissions: [
          { action: 'READ', description: 'View forecasts' },
        ],
      },
      {
        code: 'PREDICTIVE_MAINTENANCE',
        name: 'Predictive Maintenance',
        description: 'Machine failure predictions',
        permissions: [
          { action: 'READ', description: 'View predictions' },
        ],
      },
    ],
  },
];

const seedDatabase = async () => {
  try {
    // Connect to database
    await connectDB();

    // Clear existing data
    console.log('Clearing existing data...');
    await SuperAdmin.deleteMany({});
    await Feature.deleteMany({});
    await Organization.deleteMany({});

    // Create super admin
    console.log('Creating super admin...');
    const superAdmin = await SuperAdmin.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: process.env.SUPER_ADMIN_EMAIL || 'admin@vlite-erp.com',
      password: process.env.SUPER_ADMIN_PASSWORD || 'krishna@123',
      role: 'SUPER_ADMIN',
      phone: '+1234567890',
      isActive: true,
      permissions: {
        canCreateOrganization: true,
        canDeleteOrganization: true,
        canManageFeatures: true,
        canViewAllOrganizations: true,
        canManageAdmins: true,
        canAccessSystemSettings: true,
      },
    });
    console.log(`✅ Super admin created: ${superAdmin.email}`);

    // Create features
    console.log('Creating features...');
    const createdFeatures = await Feature.insertMany(features);
    console.log(`✅ ${createdFeatures.length} features created`);

    // Create sample organization (Vlite)
    console.log('Creating sample organization...');
    const vliteFeatures = createdFeatures.map(f => ({
      featureId: f._id,
      enabledSubFeatures: f.subFeatures.map(sf => sf.code),
      enabledPermissions: f.subFeatures.map(sf => ({
        subFeatureCode: sf.code,
        actions: sf.permissions.map(p => p.action),
      })),
    }));

    const vliteOrg = await Organization.create({
      name: 'Vlite Furnitures',
      slug: 'vlite-furnitures',
      email: 'admin@vlite.com',
      phone: '+919876543210',
      address: {
        street: '123 Furniture Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        zipCode: '400001',
      },
      subscriptionPlan: 'ENTERPRISE',
      subscriptionStatus: 'ACTIVE',
      subscriptionStartDate: Date.now(),
      enabledFeatures: vliteFeatures,
      adminUser: {
        firstName: 'Vlite',
        lastName: 'Admin',
        email: 'admin@vlite.com',
        phone: '+919876543210',
        password: 'krishna@123',
        isActive: true,
      },
      database: {
        name: `vlite_vlite-furnitures_${Date.now()}`,
      },
      settings: {
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        dateFormat: 'DD/MM/YYYY',
        fiscalYearStart: 4,
        language: 'en',
      },
      limits: {
        maxUsers: 50,
        maxStorage: 10737418240, // 10 GB
        maxAPICallsPerDay: 50000,
      },
      isActive: true,
      isVerified: true,
      verifiedAt: Date.now(),
      createdBy: superAdmin._id,
    });
    console.log(`✅ Sample organization created: ${vliteOrg.name}`);

    // Create default roles for Vlite organization
    console.log('Creating default roles for Vlite...');
    const defaultRoles = await Role.insertMany([
      {
        name: 'Admin',
        code: 'ADMIN',
        description: 'Full access to all features',
        organizationId: vliteOrg._id,
        permissions: [], // Full access
        level: 100,
        isSystemRole: true,
        isActive: true,
      },
      {
        name: 'Sales Executive',
        code: 'SALES_EXEC',
        description: 'Can manage customers, inquiries, and quotations',
        organizationId: vliteOrg._id,
        permissions: [
          { module: 'CRM', subModule: 'CUSTOMER', actions: ['CREATE', 'READ', 'UPDATE'] },
          { module: 'CRM', subModule: 'INQUIRY', actions: ['CREATE', 'READ', 'UPDATE'] },
          { module: 'CRM', subModule: 'QUOTATION', actions: ['CREATE', 'READ'] },
        ],
        level: 50,
        isSystemRole: false,
        isActive: true,
      },
      {
        name: 'Designer',
        code: 'DESIGNER',
        description: 'Can create quotations and manage designs',
        organizationId: vliteOrg._id,
        permissions: [
          { module: 'CRM', subModule: 'QUOTATION', actions: ['CREATE', 'READ', 'UPDATE'] },
          { module: 'MDM', subModule: 'PRODUCT', actions: ['READ'] },
        ],
        level: 40,
        isSystemRole: false,
        isActive: true,
      },
      {
        name: 'Accounts Manager',
        code: 'ACCOUNTS',
        description: 'Can manage payments and financial records',
        organizationId: vliteOrg._id,
        permissions: [
          { module: 'FINANCE', actions: ['CREATE', 'READ', 'UPDATE'] },
          { module: 'CRM', subModule: 'ADVANCE_PAYMENT', actions: ['CREATE', 'READ', 'UPDATE'] },
        ],
        level: 60,
        isSystemRole: false,
        isActive: true,
      },
      {
        name: 'Production Manager',
        code: 'PRODUCTION',
        description: 'Can manage production orders and workflow',
        organizationId: vliteOrg._id,
        permissions: [
          { module: 'PRODUCTION', actions: ['CREATE', 'READ', 'UPDATE'] },
          { module: 'INVENTORY', subModule: 'STOCK', actions: ['READ', 'UPDATE'] },
        ],
        level: 50,
        isSystemRole: false,
        isActive: true,
      },
    ]);
    console.log(`✅ ${defaultRoles.length} default roles created`);

    // Create sample users for Vlite organization
    console.log('Creating sample users for Vlite...');
    
    // Hash password once for all users
    const hashedPassword = await bcrypt.hash('krishna@123', 10);
    
    const sampleUsers = await User.insertMany([
      {
        firstName: 'Jasleen',
        lastName: 'POC',
        email: 'jasleen@vlite.com',
        phone: '+919876543211',
        password: hashedPassword,
        employeeId: 'EMP001',
        designation: 'First Point of Contact',
        department: 'SALES_MARKETING',
        workflowRole: 'POC',
        role: defaultRoles.find(r => r.code === 'SALES_EXEC')._id,
        organizationId: vliteOrg._id,
        isActive: true,
        status: 'ACTIVE',
      },
      {
        firstName: 'Rachana',
        lastName: 'Matondkar',
        email: 'rachana@vlite.com',
        phone: '+919876543212',
        password: hashedPassword,
        employeeId: 'EMP002',
        designation: 'Sales Executive',
        department: 'SALES_MARKETING',
        workflowRole: 'SALES_EXECUTIVE',
        role: defaultRoles.find(r => r.code === 'SALES_EXEC')._id,
        organizationId: vliteOrg._id,
        isActive: true,
        status: 'ACTIVE',
      },
      {
        firstName: 'Akshay',
        lastName: 'Patil',
        email: 'akshay@vlite.com',
        phone: '+919876543213',
        password: hashedPassword,
        employeeId: 'EMP003',
        designation: 'Design Team Lead',
        department: 'DESIGN',
        workflowRole: 'DESIGN_LEAD',
        role: defaultRoles.find(r => r.code === 'DESIGNER')._id,
        organizationId: vliteOrg._id,
        isActive: true,
        status: 'ACTIVE',
      },
      {
        firstName: 'Sandeep',
        lastName: 'Sinha',
        email: 'sandeep@vlite.com',
        phone: '+919876543214',
        password: hashedPassword,
        employeeId: 'EMP004',
        designation: 'Marketing Director',
        department: 'MANAGEMENT',
        workflowRole: 'MARKETING_DIRECTOR',
        role: defaultRoles.find(r => r.code === 'ADMIN')._id,
        organizationId: vliteOrg._id,
        isActive: true,
        status: 'ACTIVE',
      },
      {
        firstName: 'Sachin',
        lastName: 'Girhe',
        email: 'sachin@vlite.com',
        phone: '+919876543215',
        password: hashedPassword,
        employeeId: 'EMP005',
        designation: 'Accounts Manager',
        department: 'ACCOUNTS',
        workflowRole: 'ACCOUNTS_MANAGER',
        role: defaultRoles.find(r => r.code === 'ACCOUNTS')._id,
        organizationId: vliteOrg._id,
        isActive: true,
        status: 'ACTIVE',
      },
    ]);
    console.log(`✅ ${sampleUsers.length} sample users created`);

    // Create sample raw materials
    console.log('Creating sample raw materials...');
    const rawMaterialsData = [
      // Panel (10 items)
      { name: 'CenturyPly 18mm MDF 8x4 Sheet', category: 'PANEL', currentStock: 150, uom: 'SHEET', costPrice: 1250, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'GreenPly BWP 12mm Plywood', category: 'PANEL', currentStock: 80, uom: 'SHEET', costPrice: 1580, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Particle Board 16mm Standard', category: 'PANEL', currentStock: 20, uom: 'SHEET', costPrice: 920, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'HDF Board 6mm Premium', category: 'PANEL', currentStock: 95, uom: 'SHEET', costPrice: 850, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Marine Plywood 18mm BWR', category: 'PANEL', currentStock: 45, uom: 'SHEET', costPrice: 2650, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Block Board 19mm Commercial', category: 'PANEL', currentStock: 60, uom: 'SHEET', costPrice: 1850, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'MDF Board 25mm Thick Grade', category: 'PANEL', currentStock: 110, uom: 'SHEET', costPrice: 1650, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Plywood 8mm Flexible', category: 'PANEL', currentStock: 140, uom: 'SHEET', costPrice: 980, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'HMR Particle Board 18mm', category: 'PANEL', currentStock: 15, uom: 'SHEET', costPrice: 1120, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Prelaminated MDF 18mm White', category: 'PANEL', currentStock: 75, uom: 'SHEET', costPrice: 1950, status: 'ACTIVE', organizationId: vliteOrg._id },
      
      // Laminate (10 items)
      { name: 'Greenlam Glossy White 1mm', category: 'LAMINATE', currentStock: 200, uom: 'SHEET', costPrice: 485, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Merino Matte Black Premium', category: 'LAMINATE', currentStock: 120, uom: 'SHEET', costPrice: 520, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Royale Touche Wood Grain Walnut', category: 'LAMINATE', currentStock: 90, uom: 'SHEET', costPrice: 565, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Formica Marble Pattern Statuario', category: 'LAMINATE', currentStock: 15, uom: 'SHEET', costPrice: 650, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Virgo Metallic Silver Shine', category: 'LAMINATE', currentStock: 75, uom: 'SHEET', costPrice: 590, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Greenlam High Gloss Red', category: 'LAMINATE', currentStock: 105, uom: 'SHEET', costPrice: 615, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Merino Suede Finish Beige', category: 'LAMINATE', currentStock: 85, uom: 'SHEET', costPrice: 545, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Century Laminates Oak Natural', category: 'LAMINATE', currentStock: 130, uom: 'SHEET', costPrice: 495, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Formica Solid Color Grey', category: 'LAMINATE', currentStock: 18, uom: 'SHEET', costPrice: 475, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Royale Touche Leather Finish Brown', category: 'LAMINATE', currentStock: 95, uom: 'SHEET', costPrice: 625, status: 'ACTIVE', organizationId: vliteOrg._id },
      
      // HBD (10 items)
      { name: 'Rehau Oak Edgeband 0.8mm 22mm', category: 'EDGEBAND', currentStock: 500, uom: 'METER', costPrice: 28, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Egger Walnut PVC 1mm 32mm', category: 'EDGEBAND', currentStock: 300, uom: 'METER', costPrice: 32, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'White PVC Edgeband 0.5mm 19mm', category: 'EDGEBAND', currentStock: 10, uom: 'METER', costPrice: 18, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Black ABS Edgeband 1mm 25mm', category: 'EDGEBAND', currentStock: 250, uom: 'METER', costPrice: 24, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Teak Veneer Edgeband 1.5mm 40mm', category: 'EDGEBAND', currentStock: 180, uom: 'METER', costPrice: 38, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Maple PVC Edge Banding 0.8mm', category: 'EDGEBAND', currentStock: 420, uom: 'METER', costPrice: 26, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Cherry Wood ABS Edge 1mm', category: 'EDGEBAND', currentStock: 195, uom: 'METER', costPrice: 30, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'High Gloss White ABS 2mm', category: 'EDGEBAND', currentStock: 15, uom: 'METER', costPrice: 35, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Beige PVC Edgeband 0.6mm', category: 'EDGEBAND', currentStock: 340, uom: 'METER', costPrice: 22, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Aluminium Silver Edge Trim 15mm', category: 'EDGEBAND', currentStock: 280, uom: 'METER', costPrice: 42, status: 'ACTIVE', organizationId: vliteOrg._id },
      
      // Hardware (10 items)
      { name: 'Hettich Soft Close Hinge 110°', category: 'HARDWARE', currentStock: 500, uom: 'PCS', costPrice: 95, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Blum Tandem Full Extension Slide 450mm', category: 'HARDWARE', currentStock: 200, uom: 'PCS', costPrice: 165, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Hafele Concealed Door Hinge 35mm', category: 'HARDWARE', currentStock: 8, uom: 'PCS', costPrice: 52, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Adjustable Shelf Support Nickel', category: 'HARDWARE', currentStock: 1000, uom: 'PCS', costPrice: 6, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Cabinet Leg Leveler Chrome', category: 'HARDWARE', currentStock: 350, uom: 'PCS', costPrice: 18, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Glass Door Hinge 180° Opening', category: 'HARDWARE', currentStock: 120, uom: 'PCS', costPrice: 105, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Push to Open Mechanism', category: 'HARDWARE', currentStock: 285, uom: 'PCS', costPrice: 145, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Drawer Lock Sliding Cam Type', category: 'HARDWARE', currentStock: 12, uom: 'PCS', costPrice: 75, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Gas Lift Support 60N', category: 'HARDWARE', currentStock: 180, uom: 'PCS', costPrice: 125, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Magnetic Door Catch Heavy Duty', category: 'HARDWARE', currentStock: 540, uom: 'PCS', costPrice: 28, status: 'ACTIVE', organizationId: vliteOrg._id },
      
      // Glass (10 items)
      { name: 'Clear Float Glass 5mm Standard', category: 'GLASS', currentStock: 50, uom: 'SHEET', costPrice: 850, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Frosted Glass 6mm Acid Etched', category: 'GLASS', currentStock: 30, uom: 'SHEET', costPrice: 985, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Tinted Glass 8mm Bronze', category: 'GLASS', currentStock: 5, uom: 'SHEET', costPrice: 1150, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Mirror Glass 4mm Silver Back', category: 'GLASS', currentStock: 25, uom: 'SHEET', costPrice: 720, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Textured Glass 6mm Pattern', category: 'GLASS', currentStock: 42, uom: 'SHEET', costPrice: 1050, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Tempered Glass 10mm Safety', category: 'GLASS', currentStock: 35, uom: 'SHEET', costPrice: 1650, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Laminated Glass 6.38mm Clear', category: 'GLASS', currentStock: 18, uom: 'SHEET', costPrice: 1420, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Tinted Glass 6mm Grey', category: 'GLASS', currentStock: 28, uom: 'SHEET', costPrice: 950, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Decorative Glass 5mm Painted', category: 'GLASS', currentStock: 55, uom: 'SHEET', costPrice: 1280, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Low Iron Glass 8mm Ultra Clear', category: 'GLASS', currentStock: 15, uom: 'SHEET', costPrice: 1850, status: 'ACTIVE', organizationId: vliteOrg._id },
      
      // Fabric (10 items)
      { name: 'Cotton Upholstery Fabric Plain Weave', category: 'FABRIC', currentStock: 80, uom: 'METER', costPrice: 280, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Velvet Fabric Royal Blue Premium', category: 'FABRIC', currentStock: 40, uom: 'METER', costPrice: 485, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Genuine Leather Brown Full Grain', category: 'FABRIC', currentStock: 15, uom: 'METER', costPrice: 850, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Linen Fabric Grey Natural', category: 'FABRIC', currentStock: 60, uom: 'METER', costPrice: 385, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Synthetic Leather Black Textured', category: 'FABRIC', currentStock: 95, uom: 'METER', costPrice: 595, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Chenille Fabric Beige Luxury', category: 'FABRIC', currentStock: 52, uom: 'METER', costPrice: 420, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Suede Fabric Tan Soft Touch', category: 'FABRIC', currentStock: 38, uom: 'METER', costPrice: 650, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Polyester Blend Navy Blue', category: 'FABRIC', currentStock: 12, uom: 'METER', costPrice: 295, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Jacquard Fabric Gold Pattern', category: 'FABRIC', currentStock: 45, uom: 'METER', costPrice: 525, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Microfiber Fabric Charcoal Grey', category: 'FABRIC', currentStock: 70, uom: 'METER', costPrice: 365, status: 'ACTIVE', organizationId: vliteOrg._id },
      
      // Aluminum (10 items)
      { name: 'Aluminum Profile 20x20mm Anodized', category: 'ALUMINIUM', currentStock: 150, uom: 'METER', costPrice: 135, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Aluminum Channel 30x30mm Silver', category: 'ALUMINIUM', currentStock: 90, uom: 'METER', costPrice: 195, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Anodized Aluminum Strip 25mm', category: 'ALUMINIUM', currentStock: 10, uom: 'METER', costPrice: 225, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Aluminum Frame 40x40mm Heavy Duty', category: 'ALUMINIUM', currentStock: 70, uom: 'METER', costPrice: 275, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Aluminum Angle 25x25mm L-Shape', category: 'ALUMINIUM', currentStock: 120, uom: 'METER', costPrice: 165, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Aluminum T-Section 20mm Profile', category: 'ALUMINIUM', currentStock: 85, uom: 'METER', costPrice: 145, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Aluminum U-Channel 35mm Wide', category: 'ALUMINIUM', currentStock: 14, uom: 'METER', costPrice: 185, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Aluminum Square Tube 25x25mm', category: 'ALUMINIUM', currentStock: 95, uom: 'METER', costPrice: 205, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Aluminum Flat Bar 50x6mm', category: 'ALUMINIUM', currentStock: 110, uom: 'METER', costPrice: 155, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Aluminum Round Tube 25mm Dia', category: 'ALUMINIUM', currentStock: 75, uom: 'METER', costPrice: 175, status: 'ACTIVE', organizationId: vliteOrg._id },
      
      // Processed Panel (10 items)
      { name: 'Laminated MDF Panel White 18mm', category: 'PROCESSED_PANEL', currentStock: 100, uom: 'SHEET', costPrice: 2350, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Pre-cut Kitchen Cabinet Panel Set', category: 'PROCESSED_PANEL', currentStock: 50, uom: 'PCS', costPrice: 1650, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Edge Banded Shelf Oak Finish', category: 'PROCESSED_PANEL', currentStock: 8, uom: 'PCS', costPrice: 850, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Finished Wardrobe Panel Walnut', category: 'PROCESSED_PANEL', currentStock: 30, uom: 'PCS', costPrice: 2650, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'CNC Cut Decorative Panel Jali', category: 'PROCESSED_PANEL', currentStock: 22, uom: 'PCS', costPrice: 3200, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'UV Coated MDF Panel High Gloss', category: 'PROCESSED_PANEL', currentStock: 65, uom: 'SHEET', costPrice: 2850, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Acrylic Finish Panel Glossy White', category: 'PROCESSED_PANEL', currentStock: 38, uom: 'SHEET', costPrice: 3450, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Membrane Pressed Door Shutter', category: 'PROCESSED_PANEL', currentStock: 12, uom: 'PCS', costPrice: 1950, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'PU Painted Panel Matte Finish', category: 'PROCESSED_PANEL', currentStock: 45, uom: 'SHEET', costPrice: 3850, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Veneer Finished Panel Teak', category: 'PROCESSED_PANEL', currentStock: 28, uom: 'SHEET', costPrice: 4200, status: 'ACTIVE', organizationId: vliteOrg._id },
      
      // Handles (10 items)
      { name: 'Stainless Steel Handle 128mm Modern', category: 'HANDLES', currentStock: 300, uom: 'PCS', costPrice: 52, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Brass Handle 96mm Antique Finish', category: 'HANDLES', currentStock: 150, uom: 'PCS', costPrice: 75, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Aluminum Handle 160mm Sleek Design', category: 'HANDLES', currentStock: 12, uom: 'PCS', costPrice: 62, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Chrome Handle 192mm Contemporary', category: 'HANDLES', currentStock: 200, uom: 'PCS', costPrice: 78, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Black Matte Handle 128mm Minimalist', category: 'HANDLES', currentStock: 185, uom: 'PCS', costPrice: 68, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Gold Finish Handle 256mm Luxury', category: 'HANDLES', currentStock: 100, uom: 'PCS', costPrice: 135, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Rose Gold Handle 160mm Premium', category: 'HANDLES', currentStock: 15, uom: 'PCS', costPrice: 125, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Brushed Nickel Handle 192mm', category: 'HANDLES', currentStock: 220, uom: 'PCS', costPrice: 85, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Copper Finish Handle 128mm Vintage', category: 'HANDLES', currentStock: 95, uom: 'PCS', costPrice: 95, status: 'ACTIVE', organizationId: vliteOrg._id },
      { name: 'Titanium Handle 224mm Industrial', category: 'HANDLES', currentStock: 140, uom: 'PCS', costPrice: 115, status: 'ACTIVE', organizationId: vliteOrg._id },
    ];
    
    // Create materials one by one to trigger pre-save hook for materialCode
    const rawMaterials = [];
    for (const materialData of rawMaterialsData) {
      const material = await RawMaterial.create(materialData);
      rawMaterials.push(material);
    }
    console.log(`✅ ${rawMaterials.length} raw materials created`);

    console.log('\n📊 Database seeding completed successfully!');
    console.log('\n🔐 Login Credentials:');
    console.log('─────────────────────────────────────');
    console.log('Super Admin:');
    console.log(`  Email: ${superAdmin.email}`);
    console.log(`  Password: ${process.env.SUPER_ADMIN_PASSWORD || 'krishna@123'}`);
    console.log('\nVlite Organization Admin:');
    console.log(`  Email: ${vliteOrg.adminUser.email}`);
    console.log(`  Password: krishna@123`);
    console.log(`  Organization ID: ${vliteOrg._id}`);
    console.log('\nSample Users (all use password: krishna@123):');
    sampleUsers.forEach(user => {
      console.log(`  ${user.firstName} ${user.lastName} (${user.workflowRole}): ${user.email}`);
    });

    console.log('─────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run seeder
seedDatabase();
