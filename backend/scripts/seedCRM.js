require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Organization = require('../models/shared/Organization');
const User = require('../models/vlite/User');
const Customer = require('../models/vlite/Customer');
const Lead = require('../models/vlite/Lead');
const Quotation = require('../models/vlite/Quotation');
const AdvancePayment = require('../models/vlite/AdvancePayment');
const Product = require('../models/vlite/Product');
const Role = require('../models/vlite/Role');

const seedCRM = async () => {
  try {
    await connectDB();
    console.log('Connected to DB');

    const org = await Organization.findOne();
    if (!org) {
      console.log('No organization found. Run seed.js first.');
      process.exit(1);
    }
    console.log(`Using Organization: ${org.name}`);

    const user = await User.findOne({ organization: org._id });
    if (!user) {
      console.log('No user found.');
      process.exit(1);
    }
    console.log(`Using User: ${user.name}`);

    // Create Roles
    const roles = [
        {
            name: 'Sales Executive',
            code: 'SALES',
            description: 'Can manage leads and create quotations',
            organization: org._id,
            permissions: [
                { module: 'CRM', subModule: 'LEAD', actions: ['CREATE', 'READ', 'UPDATE'] },
                { module: 'CRM', subModule: 'QUOTATION', actions: ['CREATE', 'READ', 'UPDATE'] }
            ]
        },
        {
            name: 'Quotation Manager',
            code: 'QT_MANAGER',
            description: 'Can approve quotations',
            organization: org._id,
            permissions: [
                { module: 'CRM', subModule: 'QUOTATION', actions: ['CREATE', 'READ', 'UPDATE', 'APPROVE', 'DELETE'] }
            ]
        },
        {
            name: 'Accounts',
            code: 'ACCOUNTS',
            description: 'Can manage payments',
            organization: org._id,
            permissions: [
                { module: 'CRM', subModule: 'PAYMENT', actions: ['CREATE', 'READ', 'UPDATE', 'APPROVE'] }
            ]
        }
    ];

    for (const roleData of roles) {
        const exists = await Role.findOne({ code: roleData.code, organization: org._id });
        if (!exists) {
            await Role.create(roleData);
            console.log(`Created Role: ${roleData.name}`);
        }
    }

    // Ensure we have a customer
    let customer = await Customer.findOne({ organization: org._id });
    if (!customer) {
        customer = await Customer.create({
            organization: org._id,
            name: 'Acme Corp',
            email: 'contact@acme.com',
            phone: '1234567890',
            address: { street: '123 Main St', city: 'Metropolis', state: 'NY', zip: '10001', country: 'USA' },
            createdBy: user._id
        });
        console.log('Created sample customer');
    }

    // Create Leads
    const leadsData = [
      {
        title: 'Office Furniture Upgrade',
        description: 'Looking for 50 workstations and chairs',
        source: 'WEBSITE',
        contact: { name: 'John Doe', email: 'john@acme.com', phone: '555-0101' },
        status: 'NEW',
        estimatedValue: 25000,
        probability: 20,
        organization: org._id,
        createdBy: user._id,
        customer: customer._id
      },
      {
        title: 'Conference Room Setup',
        description: 'Large conference table and 12 premium chairs',
        source: 'REFERRAL',
        contact: { name: 'Jane Smith', email: 'jane@techstart.com', phone: '555-0102' },
        status: 'QUALIFIED',
        estimatedValue: 8000,
        probability: 60,
        organization: org._id,
        createdBy: user._id
      },
      {
        title: 'Lobby Renovation',
        description: 'Reception desk and waiting area seating',
        source: 'CAMPAIGN',
        contact: { name: 'Bob Wilson', email: 'bob@hotel.com', phone: '555-0103' },
        status: 'CONTACTED',
        estimatedValue: 12000,
        probability: 40,
        organization: org._id,
        createdBy: user._id
      }
    ];

    await Lead.deleteMany({ organization: org._id });
    await Lead.insertMany(leadsData);
    console.log('Seeded Leads');

    // Create Quotations
    // Need a product first
    let product = await Product.findOne({ organization: org._id });
    if (!product) {
        // Create a dummy product if none exists (simplified schema assumption)
        product = await Product.create({
            organization: org._id,
            name: 'Executive Chair',
            code: 'CHR-001',
            category: 'Chair',
            basePrice: 250,
            createdBy: user._id
        });
    }

    const quotationsData = [
      {
        lead: (await Lead.findOne({ title: 'Office Furniture Upgrade' }))._id,
        organization: org._id,
        createdBy: user._id,
        referenceNumber: 'QT-1001',
        status: 'DRAFT',
        items: [
          { product: product._id, description: 'Executive Chair', quantity: 10, unitPrice: 250, taxes: 250 }
        ],
        subtotal: 2500,
        taxes: 250,
        total: 2750,
        validUntil: new Date(Date.now() + 30*24*60*60*1000)
      },
      {
        lead: (await Lead.findOne({ title: 'Conference Room Setup' }))._id,
        organization: org._id,
        createdBy: user._id,
        referenceNumber: 'QT-1002',
        status: 'APPROVED',
        items: [
          { product: product._id, description: 'Conference Chair', quantity: 12, unitPrice: 300, taxes: 360 }
        ],
        subtotal: 3600,
        taxes: 360,
        total: 3960,
        validUntil: new Date(Date.now() + 15*24*60*60*1000)
      }
    ];

    await Quotation.deleteMany({ organization: org._id });
    await Quotation.insertMany(quotationsData);
    console.log('Seeded Quotations');

    // Create Advance Payments
    const paymentsData = [
      {
        organization: org._id,
        customer: customer._id,
        amount: 1000,
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: 'TXN-998877',
        status: 'VERIFIED',
        createdBy: user._id
      },
      {
        organization: org._id,
        customer: customer._id,
        amount: 500,
        paymentMethod: 'CHECK',
        referenceNumber: 'CHK-1234',
        status: 'PENDING',
        createdBy: user._id
      }
    ];

    await AdvancePayment.deleteMany({ organization: org._id });
    await AdvancePayment.insertMany(paymentsData);
    console.log('Seeded Advance Payments');

    console.log('CRM Seed Completed Successfully');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedCRM();
