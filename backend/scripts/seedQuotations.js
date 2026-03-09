require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Quotation = require('../models/vlite/Quotation');
const Customer = require('../models/vlite/Customer');
const User = require('../models/vlite/User');
const Organization = require('../models/shared/Organization');

const seedQuotations = async () => {
  try {
    console.log('🌱 Starting Quotation Seeding...');
    
    await connectDB();
    
    // Find organization
    const org = await Organization.findOne();
    if (!org) {
      console.error('❌ No organization found. Please seed organizations first.');
      process.exit(1);
    }
    console.log(`✅ Found organization: ${org.name}`);
    
    // Find a user (preparedBy)
    const user = await User.findOne({ organizationId: org._id });
    if (!user) {
      console.error('❌ No user found. Please seed users first.');
      process.exit(1);
    }
    console.log(`✅ Found user: ${user.firstName} ${user.lastName}`);
    
    // Find customers
    const customers = await Customer.find({ organizationId: org._id }).limit(8);
    if (customers.length === 0) {
      console.error('❌ No customers found. Please seed customers first.');
      process.exit(1);
    }
    console.log(`✅ Found ${customers.length} customers`);
    
    // Clear existing quotations
    await Quotation.deleteMany({ organizationId: org._id });
    console.log('🗑️  Cleared existing quotations');
    
    // Sample quotation data based on the screenshot
    const quotationData = [
      {
        customer: customers[0]._id,
        items: [
          {
            description: 'Executive Office Chair - Ergonomic Design',
            quantity: 10,
            unit: 'Nos',
            unitPrice: 15000,
            taxPerUnit: 18
          },
          {
            description: 'Standing Desk - Electric Height Adjustable',
            quantity: 5,
            unit: 'Nos',
            unitPrice: 25000,
            taxPerUnit: 18
          },
          {
            description: 'Meeting Table - 8 Seater Wooden',
            quantity: 2,
            unit: 'Nos',
            unitPrice: 45000,
            taxPerUnit: 18
          }
        ],
        discount: 5000,
        validFrom: new Date('2025-01-15'),
        validUntil: new Date('2025-02-15'),
        approvalStatus: 'APPROVED',
        bankDetails: {
          bankName: 'HDFC Bank',
          accountNumber: '50200012345678',
          ifscCode: 'HDFC0001234',
          branch: 'MG Road Branch'
        },
        notes: 'Premium quality office furniture with 2-year warranty',
        termsAndConditions: [
          'Payment terms: 50% advance, 50% on delivery',
          'Delivery within 15-20 working days from order confirmation',
          'Installation charges extra as per site requirement',
          'Transportation charges will be borne by the buyer',
          'Prices are valid for 30 days from quotation date'
        ]
      },
      {
        customer: customers[1]._id,
        items: [
          {
            description: 'Conference Room Chairs - Mesh Back',
            quantity: 20,
            unit: 'Nos',
            unitPrice: 8500,
            taxPerUnit: 18
          },
          {
            description: 'Conference Table - Modular Design',
            quantity: 4,
            unit: 'Nos',
            unitPrice: 35000,
            taxPerUnit: 18
          }
        ],
        discount: 10000,
        validFrom: new Date('2025-01-20'),
        validUntil: new Date('2025-02-20'),
        approvalStatus: 'SENT',
        bankDetails: {
          bankName: 'HDFC Bank',
          accountNumber: '50200012345678',
          ifscCode: 'HDFC0001234',
          branch: 'MG Road Branch'
        },
        notes: 'Bulk order discount applied',
        termsAndConditions: [
          'Payment terms: 50% advance, 50% on delivery',
          'Delivery within 15-20 working days',
          'Free installation for orders above ₹2,00,000',
          'One-year warranty on all products'
        ]
      },
      {
        customer: customers[2]._id,
        items: [
          {
            description: 'Workstation Desk with Drawers',
            quantity: 15,
            unit: 'Nos',
            unitPrice: 18000,
            taxPerUnit: 18
          },
          {
            description: 'Ergonomic Office Chairs',
            quantity: 15,
            unit: 'Nos',
            unitPrice: 12000,
            taxPerUnit: 18
          },
          {
            description: 'Mobile Pedestals - 3 Drawer',
            quantity: 15,
            unit: 'Nos',
            unitPrice: 5500,
            taxPerUnit: 18
          }
        ],
        discount: 15000,
        validFrom: new Date('2025-02-01'),
        validUntil: new Date('2025-03-01'),
        approvalStatus: 'DRAFT',
        bankDetails: {
          bankName: 'HDFC Bank',
          accountNumber: '50200012345678',
          ifscCode: 'HDFC0001234',
          branch: 'MG Road Branch'
        },
        notes: 'Complete workspace setup for new office',
        termsAndConditions: [
          'Payment terms: 30% advance, 70% on delivery',
          'Delivery within 20-25 working days',
          'Installation included',
          'Two-year comprehensive warranty'
        ]
      },
      {
        customer: customers[3]._id,
        items: [
          {
            description: 'Reception Desk - Curved Design',
            quantity: 1,
            unit: 'Nos',
            unitPrice: 85000,
            taxPerUnit: 18
          },
          {
            description: 'Visitor Chairs - Fabric Upholstery',
            quantity: 6,
            unit: 'Nos',
            unitPrice: 7500,
            taxPerUnit: 18
          },
          {
            description: 'Coffee Table - Glass Top',
            quantity: 2,
            unit: 'Nos',
            unitPrice: 12000,
            taxPerUnit: 18
          }
        ],
        discount: 8000,
        validFrom: new Date('2025-02-10'),
        validUntil: new Date('2025-03-10'),
        approvalStatus: 'APPROVED',
        bankDetails: {
          bankName: 'HDFC Bank',
          accountNumber: '50200012345678',
          ifscCode: 'HDFC0001234',
          branch: 'MG Road Branch'
        },
        notes: 'Custom design for reception area',
        termsAndConditions: [
          'Payment terms: 50% advance, 50% on delivery',
          'Delivery within 30 working days (custom design)',
          'Free installation and setup',
          'Two-year warranty on all items'
        ]
      },
      {
        customer: customers[4]._id,
        items: [
          {
            description: 'Executive Desk - Premium Wood Finish',
            quantity: 3,
            unit: 'Nos',
            unitPrice: 55000,
            taxPerUnit: 18
          },
          {
            description: 'Executive Chair - Leather',
            quantity: 3,
            unit: 'Nos',
            unitPrice: 28000,
            taxPerUnit: 18
          },
          {
            description: 'Bookshelf Unit - Wall Mounted',
            quantity: 3,
            unit: 'Nos',
            unitPrice: 22000,
            taxPerUnit: 18
          }
        ],
        discount: 12000,
        validFrom: new Date('2025-02-15'),
        validUntil: new Date('2025-03-15'),
        approvalStatus: 'SENT',
        bankDetails: {
          bankName: 'HDFC Bank',
          accountNumber: '50200012345678',
          ifscCode: 'HDFC0001234',
          branch: 'MG Road Branch'
        },
        notes: 'Premium executive office setup',
        termsAndConditions: [
          'Payment terms: 50% advance, 50% on delivery',
          'Delivery within 25 working days',
          'Professional installation included',
          'Three-year warranty on furniture'
        ]
      },
      {
        customer: customers[5]._id,
        items: [
          {
            description: 'Laboratory Workbench - Steel Frame',
            quantity: 8,
            unit: 'Nos',
            unitPrice: 32000,
            taxPerUnit: 18
          },
          {
            description: 'Laboratory Stools - Adjustable Height',
            quantity: 16,
            unit: 'Nos',
            unitPrice: 4500,
            taxPerUnit: 18
          },
          {
            description: 'Storage Cabinets - Chemical Resistant',
            quantity: 4,
            unit: 'Nos',
            unitPrice: 28000,
            taxPerUnit: 18
          }
        ],
        discount: 18000,
        validFrom: new Date('2025-03-01'),
        validUntil: new Date('2025-03-31'),
        approvalStatus: 'REJECTED',
        bankDetails: {
          bankName: 'HDFC Bank',
          accountNumber: '50200012345678',
          ifscCode: 'HDFC0001234',
          branch: 'MG Road Branch'
        },
        notes: 'Specialized laboratory furniture',
        termsAndConditions: [
          'Payment terms: 40% advance, 60% on delivery',
          'Delivery within 35 working days',
          'Installation by certified technicians',
          'Five-year warranty on lab equipment'
        ]
      },
      {
        customer: customers.length > 6 ? customers[6]._id : customers[0]._id,
        items: [
          {
            description: 'Lounge Sofa - 3 Seater Fabric',
            quantity: 4,
            unit: 'Nos',
            unitPrice: 42000,
            taxPerUnit: 18
          },
          {
            description: 'Coffee Tables - Wooden',
            quantity: 4,
            unit: 'Nos',
            unitPrice: 15000,
            taxPerUnit: 18
          },
          {
            description: 'Accent Chairs',
            quantity: 8,
            unit: 'Nos',
            unitPrice: 18000,
            taxPerUnit: 18
          }
        ],
        discount: 20000,
        validFrom: new Date('2025-03-05'),
        validUntil: new Date('2025-04-05'),
        approvalStatus: 'DRAFT',
        bankDetails: {
          bankName: 'HDFC Bank',
          accountNumber: '50200012345678',
          ifscCode: 'HDFC0001234',
          branch: 'MG Road Branch'
        },
        notes: 'Lounge area furniture for corporate office',
        termsAndConditions: [
          'Payment terms: 50% advance, 50% on delivery',
          'Delivery within 20 working days',
          'Installation charges included',
          'Two-year warranty'
        ]
      },
      {
        customer: customers.length > 7 ? customers[7]._id : customers[1]._id,
        items: [
          {
            description: 'Modular Workstation - 4 Person',
            quantity: 10,
            unit: 'Sets',
            unitPrice: 65000,
            taxPerUnit: 18
          },
          {
            description: 'Task Chairs - Mesh',
            quantity: 40,
            unit: 'Nos',
            unitPrice: 9500,
            taxPerUnit: 18
          },
          {
            description: 'Filing Cabinets - 4 Drawer',
            quantity: 10,
            unit: 'Nos',
            unitPrice: 14000,
            taxPerUnit: 18
          }
        ],
        discount: 50000,
        validFrom: new Date('2025-03-10'),
        validUntil: new Date('2025-04-10'),
        approvalStatus: 'APPROVED',
        bankDetails: {
          bankName: 'HDFC Bank',
          accountNumber: '50200012345678',
          ifscCode: 'HDFC0001234',
          branch: 'MG Road Branch'
        },
        notes: 'Large office expansion project - Phase 1',
        termsAndConditions: [
          'Payment terms: 30% advance, 40% on delivery, 30% after installation',
          'Delivery within 30 working days',
          'Free installation and setup',
          'Three-year comprehensive warranty',
          'AMC available at discounted rates'
        ]
      }
    ];
    
    // Create quotations
    const quotations = [];
    for (let i = 0; i < quotationData.length; i++) {
      const data = quotationData[i];
      const quotation = new Quotation({
        organizationId: org._id,
        customer: data.customer,
        items: data.items,
        discount: data.discount,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        approvalStatus: data.approvalStatus,
        bankDetails: data.bankDetails,
        notes: data.notes,
        termsAndConditions: data.termsAndConditions,
        createdBy: user._id,
        paymentTerms: {
          advancePercentage: 50
        }
      });
      
      await quotation.save();
      quotations.push(quotation);
      console.log(`✅ Created quotation: ${quotation.quotationNumber} for ${data.approvalStatus}`);
    }
    
    console.log(`\n🎉 Successfully seeded ${quotations.length} quotations!`);
    console.log('\nSummary:');
    console.log(`- Draft: ${quotations.filter(q => q.approvalStatus === 'DRAFT').length}`);
    console.log(`- Sent: ${quotations.filter(q => q.approvalStatus === 'SENT').length}`);
    console.log(`- Approved: ${quotations.filter(q => q.approvalStatus === 'APPROVED').length}`);
    console.log(`- Rejected: ${quotations.filter(q => q.approvalStatus === 'REJECTED').length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding quotations:', error);
    process.exit(1);
  }
};

seedQuotations();
