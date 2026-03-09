const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/vlite/User');
const Role = require('../models/vlite/Role');
const Organization = require('../models/shared/Organization');

const MONGO_URI = process.env.MONGODB_URI;
const ORG_ID = '692d83043ffecb29abbfc795';

const roles = [
  {
    name: 'Inquiry',
    code: 'INQUIRY',
    description: 'Handles customer inquiries and initial contact',
    permissions: [
      {
        module: 'CRM',
        subModule: 'INQUIRY',
        actions: ['CREATE', 'READ', 'UPDATE']
      },
      {
        module: 'CRM',
        subModule: 'CUSTOMER',
        actions: ['READ', 'UPDATE']
      }
    ],
    level: 3
  },
  {
    name: 'Sales Head',
    code: 'SALES_HEAD',
    description: 'Manages sales team and oversees sales operations',
    permissions: [
      {
        module: 'CRM',
        subModule: 'INQUIRY',
        actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE']
      },
      {
        module: 'CRM',
        subModule: 'QUOTATION',
        actions: ['CREATE', 'READ', 'UPDATE', 'APPROVE']
      },
      {
        module: 'CRM',
        subModule: 'CUSTOMER',
        actions: ['CREATE', 'READ', 'UPDATE', 'DELETE']
      }
    ],
    level: 8
  },
  {
    name: 'Quotation Manager',
    code: 'QUOTATION_MANAGER',
    description: 'Prepares and manages quotations',
    permissions: [
      {
        module: 'CRM',
        subModule: 'QUOTATION',
        actions: ['CREATE', 'READ', 'UPDATE', 'PRINT', 'EXPORT']
      },
      {
        module: 'INVENTORY',
        subModule: 'RAW_MATERIAL',
        actions: ['READ']
      }
    ],
    level: 5
  },
  {
    name: 'Designer',
    code: 'DESIGNER',
    description: 'Creates designs and drawings',
    permissions: [
      {
        module: 'DESIGN',
        subModule: 'DRAWING',
        actions: ['CREATE', 'READ', 'UPDATE']
      },
      {
        module: 'CRM',
        subModule: 'QUOTATION',
        actions: ['READ']
      }
    ],
    level: 4
  },
  {
    name: 'CNC Operator',
    code: 'CNC_OPERATOR',
    description: 'Operates CNC machines',
    permissions: [
      {
        module: 'PRODUCTION',
        subModule: 'MACHINE',
        actions: ['READ', 'UPDATE']
      },
      {
        module: 'PRODUCTION',
        subModule: 'PRODUCTION_ORDER',
        actions: ['READ', 'UPDATE']
      }
    ],
    level: 2
  },
  {
    name: 'BeamSaw (KDI)',
    code: 'BEAMSAW_KDI',
    description: 'Operates BeamSaw cutting machine',
    permissions: [
      {
        module: 'PRODUCTION',
        subModule: 'MACHINE',
        actions: ['READ', 'UPDATE']
      },
      {
        module: 'PRODUCTION',
        subModule: 'PRODUCTION_ORDER',
        actions: ['READ', 'UPDATE']
      }
    ],
    level: 2
  },
  {
    name: 'Inventory Manager',
    code: 'INVENTORY_MANAGER',
    description: 'Manages inventory and stock levels',
    permissions: [
      {
        module: 'INVENTORY',
        subModule: 'RAW_MATERIAL',
        actions: ['CREATE', 'READ', 'UPDATE', 'DELETE']
      },
      {
        module: 'INVENTORY',
        subModule: 'PRODUCT',
        actions: ['CREATE', 'READ', 'UPDATE', 'DELETE']
      },
      {
        module: 'INVENTORY',
        subModule: 'STOCK',
        actions: ['CREATE', 'READ', 'UPDATE', 'EXPORT']
      }
    ],
    level: 6
  },
  {
    name: 'Stock Inward',
    code: 'STOCK_INWARD',
    description: 'Handles incoming stock and materials',
    permissions: [
      {
        module: 'INVENTORY',
        subModule: 'PURCHASE_ORDER',
        actions: ['READ', 'UPDATE']
      },
      {
        module: 'INVENTORY',
        subModule: 'STOCK',
        actions: ['CREATE', 'READ', 'UPDATE']
      }
    ],
    level: 3
  },
  {
    name: 'Production Manager',
    code: 'PRODUCTION_MANAGER',
    description: 'Oversees production operations',
    permissions: [
      {
        module: 'PRODUCTION',
        subModule: 'PRODUCTION_ORDER',
        actions: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE']
      },
      {
        module: 'PRODUCTION',
        subModule: 'MACHINE',
        actions: ['READ', 'UPDATE']
      },
      {
        module: 'INVENTORY',
        subModule: 'RAW_MATERIAL',
        actions: ['READ']
      }
    ],
    level: 7
  },
  {
    name: 'Dispatch/Installation',
    code: 'DISPATCH_INSTALLATION',
    description: 'Handles dispatch and installation',
    permissions: [
      {
        module: 'LOGISTICS',
        subModule: 'DISPATCH',
        actions: ['CREATE', 'READ', 'UPDATE']
      },
      {
        module: 'CRM',
        subModule: 'ORDER',
        actions: ['READ', 'UPDATE']
      }
    ],
    level: 4
  },
  {
    name: 'Team Lead',
    code: 'TEAM_LEAD',
    description: 'Leads a team and coordinates tasks',
    permissions: [
      {
        module: 'CRM',
        subModule: 'INQUIRY',
        actions: ['CREATE', 'READ', 'UPDATE', 'APPROVE']
      },
      {
        module: 'PRODUCTION',
        subModule: 'PRODUCTION_ORDER',
        actions: ['READ', 'UPDATE', 'APPROVE']
      }
    ],
    level: 6
  },
  {
    name: 'Accounts',
    code: 'ACCOUNTS',
    description: 'Manages financial transactions and accounting',
    permissions: [
      {
        module: 'FINANCE',
        subModule: 'LEDGER',
        actions: ['CREATE', 'READ', 'UPDATE', 'EXPORT']
      },
      {
        module: 'FINANCE',
        subModule: 'PAYMENT',
        actions: ['CREATE', 'READ', 'UPDATE', 'APPROVE']
      },
      {
        module: 'CRM',
        subModule: 'ORDER',
        actions: ['READ']
      }
    ],
    level: 7
  }
];

const users = [
  {
    firstName: 'Jasleen',
    lastName: 'Singh',
    email: 'jasleen@vlite.com',
    password: 'krishna@123',
    employeeId: 'VLT001',
    designation: 'Admin',
    department: 'MANAGEMENT',
    workflowRole: 'ADMIN',
    roles: ['SALES_HEAD', 'QUOTATION_MANAGER'],
    status: 'ACTIVE',
    isActive: true
  },
  {
    firstName: 'Rahul',
    lastName: 'Sharma',
    email: 'rahul.sharma@vlite.com',
    password: 'krishna@123',
    employeeId: 'VLT002',
    designation: 'Sales Executive',
    department: 'SALES_MARKETING',
    workflowRole: 'SALES_EXECUTIVE',
    roles: ['INQUIRY', 'SALES_HEAD'],
    status: 'ACTIVE',
    isActive: true
  },
  {
    firstName: 'Priya',
    lastName: 'Patel',
    email: 'priya.patel@vlite.com',
    password: 'krishna@123',
    employeeId: 'VLT003',
    designation: 'Quotation Specialist',
    department: 'DESIGN',
    workflowRole: 'DESIGN_LEAD',
    roles: ['QUOTATION_MANAGER'],
    status: 'ACTIVE',
    isActive: true
  },
  {
    firstName: 'Amit',
    lastName: 'Kumar',
    email: 'amit.kumar@vlite.com',
    password: 'krishna@123',
    employeeId: 'VLT004',
    designation: 'Senior Designer',
    department: 'DESIGN',
    workflowRole: 'DESIGNER',
    roles: ['DESIGNER'],
    status: 'ACTIVE',
    isActive: true
  },
  {
    firstName: 'Neha',
    lastName: 'Verma',
    email: 'neha.verma@vlite.com',
    password: 'krishna@123',
    employeeId: 'VLT005',
    designation: 'CNC Machine Operator',
    department: 'PRODUCTION',
    workflowRole: 'PRODUCTION_MANAGER',
    roles: ['CNC_OPERATOR'],
    status: 'ACTIVE',
    isActive: true
  },
  {
    firstName: 'Vikram',
    lastName: 'Singh',
    email: 'vikram.singh@vlite.com',
    password: 'krishna@123',
    employeeId: 'VLT006',
    designation: 'BeamSaw Operator',
    department: 'PRODUCTION',
    workflowRole: 'PRODUCTION_MANAGER',
    roles: ['BEAMSAW_KDI'],
    status: 'ACTIVE',
    isActive: true
  },
  {
    firstName: 'Anjali',
    lastName: 'Reddy',
    email: 'anjali.reddy@vlite.com',
    password: 'krishna@123',
    employeeId: 'VLT007',
    designation: 'Inventory Head',
    department: 'INVENTORY',
    workflowRole: 'ADMIN',
    roles: ['INVENTORY_MANAGER'],
    status: 'ACTIVE',
    isActive: true
  },
  {
    firstName: 'Karan',
    lastName: 'Mehta',
    email: 'karan.mehta@vlite.com',
    password: 'krishna@123',
    employeeId: 'VLT008',
    designation: 'Stock Inward Executive',
    department: 'INVENTORY',
    workflowRole: 'ADMIN',
    roles: ['STOCK_INWARD'],
    status: 'ACTIVE',
    isActive: true
  },
  {
    firstName: 'Deepak',
    lastName: 'Gupta',
    email: 'deepak.gupta@vlite.com',
    password: 'krishna@123',
    employeeId: 'VLT009',
    designation: 'Production Head',
    department: 'PRODUCTION',
    workflowRole: 'PRODUCTION_MANAGER',
    roles: ['PRODUCTION_MANAGER', 'TEAM_LEAD'],
    status: 'ACTIVE',
    isActive: true
  },
  {
    firstName: 'Pooja',
    lastName: 'Iyer',
    email: 'pooja.iyer@vlite.com',
    password: 'krishna@123',
    employeeId: 'VLT010',
    designation: 'Dispatch Manager',
    department: 'LOGISTICS',
    workflowRole: 'LOGISTICS_HEAD',
    roles: ['DISPATCH_INSTALLATION'],
    status: 'ACTIVE',
    isActive: true
  },
  {
    firstName: 'Rajesh',
    lastName: 'Nair',
    email: 'rajesh.nair@vlite.com',
    password: 'krishna@123',
    employeeId: 'VLT011',
    designation: 'Accounts Manager',
    department: 'ACCOUNTS',
    workflowRole: 'ACCOUNTS_MANAGER',
    roles: ['ACCOUNTS'],
    status: 'ACTIVE',
    isActive: true
  },
  {
    firstName: 'Sneha',
    lastName: 'Desai',
    email: 'sneha.desai@vlite.com',
    password: 'krishna@123',
    employeeId: 'VLT012',
    designation: 'Team Lead - Sales',
    department: 'SALES_MARKETING',
    workflowRole: 'SALES_EXECUTIVE',
    roles: ['TEAM_LEAD', 'INQUIRY'],
    status: 'ACTIVE',
    isActive: true
  }
];

async function seedUserAccess() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');

    const org = await Organization.findById(ORG_ID);
    if (!org) {
      console.error('❌ Organization not found');
      process.exit(1);
    }

    console.log('\n🔄 Seeding roles...');
    await Role.deleteMany({ organizationId: ORG_ID });
    
    const createdRoles = {};
    for (const roleData of roles) {
      const role = await Role.create({
        ...roleData,
        organizationId: ORG_ID
      });
      createdRoles[role.code] = role._id;
      console.log(`  ✓ Created role: ${role.name}`);
    }

    console.log('\n🔄 Seeding users...');
    
    for (const userData of users) {
      const existingUser = await User.findOne({
        email: userData.email,
        organizationId: ORG_ID
      });

      if (existingUser) {
        existingUser.roles = userData.roles;
        existingUser.role = createdRoles['SALES_HEAD'];
        await existingUser.save();
        console.log(`  ✓ Updated user: ${userData.email}`);
      } else {
        await User.create({
          ...userData,
          organizationId: ORG_ID,
          role: createdRoles['SALES_HEAD']
        });
        console.log(`  ✓ Created user: ${userData.email}`);
      }
    }

    console.log('\n✅ User access data seeded successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   Roles: ${roles.length}`);
    console.log(`   Users: ${users.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedUserAccess();
