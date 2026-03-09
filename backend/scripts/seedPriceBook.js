require('dotenv').config();
const mongoose = require('mongoose');
const RawMaterial = require('../models/vlite/RawMaterial');

const ORGANIZATION_ID = '6935417d57433de522df0bbe';

// Sample price book data with purchase history
const priceBookData = [
  // PANELS
  {
    materialCode: 'PNL001',
    name: 'Plywood 18mm Commercial',
    category: 'PANEL',
    specifications: {
      thickness: '18mm',
      width: '8ft',
      length: '4ft',
      brand: 'Greenply',
      grade: 'BWR',
      finish: 'Smooth',
    },
    uom: 'SHEET',
    costPrice: 1850,
    currentStock: 45,
    minStockLevel: 20,
    priceHistory: [
      { date: new Date('2024-08-15'), price: 1750, vendor: 'Timber Traders', vendorContact: '9876543210', quantity: 50, notes: 'Bulk purchase discount' },
      { date: new Date('2024-10-01'), price: 1800, vendor: 'Timber Traders', vendorContact: '9876543210', quantity: 30, notes: 'Regular order' },
      { date: new Date('2024-11-20'), price: 1850, vendor: 'Wood World', vendorContact: '9876543211', quantity: 40, notes: 'Price increased due to raw material cost' },
    ],
    status: 'ACTIVE',
  },
  {
    materialCode: 'PNL002',
    name: 'MDF Board 18mm',
    category: 'PANEL',
    specifications: {
      thickness: '18mm',
      width: '8ft',
      length: '4ft',
      brand: 'Century',
      grade: 'Premium',
      finish: 'Pre-laminated White',
    },
    uom: 'SHEET',
    costPrice: 1250,
    currentStock: 60,
    minStockLevel: 25,
    priceHistory: [
      { date: new Date('2024-07-10'), price: 1200, vendor: 'MDF Solutions', vendorContact: '9876543212', quantity: 100, notes: 'Annual contract rate' },
      { date: new Date('2024-09-25'), price: 1220, vendor: 'MDF Solutions', vendorContact: '9876543212', quantity: 50, notes: 'Standard order' },
      { date: new Date('2024-11-15'), price: 1250, vendor: 'Panel Palace', vendorContact: '9876543213', quantity: 60, notes: 'Better quality, slightly higher price' },
    ],
    status: 'ACTIVE',
  },
  {
    materialCode: 'PNL003',
    name: 'Particle Board 18mm',
    category: 'PANEL',
    specifications: {
      thickness: '18mm',
      width: '8ft',
      length: '4ft',
      brand: 'Action Tesa',
      grade: 'Standard',
      finish: 'Raw',
    },
    uom: 'SHEET',
    costPrice: 850,
    currentStock: 80,
    minStockLevel: 30,
    priceHistory: [
      { date: new Date('2024-08-20'), price: 800, vendor: 'Board Bazaar', vendorContact: '9876543214', quantity: 100, notes: 'Bulk order' },
      { date: new Date('2024-10-10'), price: 820, vendor: 'Board Bazaar', vendorContact: '9876543214', quantity: 80, notes: 'Regular supply' },
      { date: new Date('2024-12-01'), price: 850, vendor: 'Board Bazaar', vendorContact: '9876543214', quantity: 80, notes: 'Price revision' },
    ],
    status: 'ACTIVE',
  },

  // LAMINATES
  {
    materialCode: 'LAM001',
    name: 'Laminate Sheet 1mm Glossy White',
    category: 'LAMINATE',
    specifications: {
      thickness: '1mm',
      width: '8ft',
      length: '4ft',
      brand: 'Merino',
      finish: 'Glossy White',
      color: 'Pure White',
    },
    uom: 'SHEET',
    costPrice: 650,
    currentStock: 120,
    minStockLevel: 40,
    priceHistory: [
      { date: new Date('2024-06-15'), price: 600, vendor: 'Laminate Hub', vendorContact: '9876543215', quantity: 150, notes: 'Summer discount' },
      { date: new Date('2024-09-10'), price: 620, vendor: 'Laminate Hub', vendorContact: '9876543215', quantity: 100, notes: 'Regular pricing' },
      { date: new Date('2024-11-25'), price: 650, vendor: 'Surface Solutions', vendorContact: '9876543216', quantity: 120, notes: 'Premium quality' },
    ],
    status: 'ACTIVE',
  },
  {
    materialCode: 'LAM002',
    name: 'Laminate Sheet 0.8mm Wooden Texture',
    category: 'LAMINATE',
    specifications: {
      thickness: '0.8mm',
      width: '8ft',
      length: '4ft',
      brand: 'Greenlam',
      finish: 'Matte Wood Grain',
      color: 'Walnut Brown',
    },
    uom: 'SHEET',
    costPrice: 720,
    currentStock: 95,
    minStockLevel: 35,
    priceHistory: [
      { date: new Date('2024-07-20'), price: 680, vendor: 'Decor Laminates', vendorContact: '9876543217', quantity: 80, notes: 'New supplier trial' },
      { date: new Date('2024-10-05'), price: 700, vendor: 'Decor Laminates', vendorContact: '9876543217', quantity: 100, notes: 'Regular order' },
      { date: new Date('2024-12-02'), price: 720, vendor: 'Premium Surfaces', vendorContact: '9876543218', quantity: 95, notes: 'Better texture quality' },
    ],
    status: 'ACTIVE',
  },

  // EDGEBANDS
  {
    materialCode: 'EDB001',
    name: 'PVC Edgeband 1mm White',
    category: 'EDGEBAND',
    specifications: {
      thickness: '1mm',
      width: '22mm',
      brand: 'Rehau',
      finish: 'Glossy',
      color: 'Pure White',
    },
    uom: 'METER',
    costPrice: 4.5,
    currentStock: 5000,
    minStockLevel: 1000,
    priceHistory: [
      { date: new Date('2024-05-10'), price: 4.2, vendor: 'Edge Masters', vendorContact: '9876543219', quantity: 10000, notes: 'Annual contract' },
      { date: new Date('2024-08-15'), price: 4.3, vendor: 'Edge Masters', vendorContact: '9876543219', quantity: 5000, notes: 'Regular supply' },
      { date: new Date('2024-11-10'), price: 4.5, vendor: 'Edge Masters', vendorContact: '9876543219', quantity: 5000, notes: 'Slight price increase' },
    ],
    status: 'ACTIVE',
  },
  {
    materialCode: 'EDB002',
    name: 'ABS Edgeband 2mm Walnut',
    category: 'EDGEBAND',
    specifications: {
      thickness: '2mm',
      width: '42mm',
      brand: 'Doellken',
      finish: 'Matte Wood Grain',
      color: 'Dark Walnut',
    },
    uom: 'METER',
    costPrice: 12,
    currentStock: 3000,
    minStockLevel: 500,
    priceHistory: [
      { date: new Date('2024-06-01'), price: 11, vendor: 'Premium Edges', vendorContact: '9876543220', quantity: 5000, notes: 'First order' },
      { date: new Date('2024-09-20'), price: 11.5, vendor: 'Premium Edges', vendorContact: '9876543220', quantity: 3000, notes: 'Repeat order' },
      { date: new Date('2024-11-28'), price: 12, vendor: 'Premium Edges', vendorContact: '9876543220', quantity: 3000, notes: 'Import cost increase' },
    ],
    status: 'ACTIVE',
  },

  // HARDWARE
  {
    materialCode: 'HRD001',
    name: 'Soft Close Hinge 110°',
    category: 'HARDWARE',
    specifications: {
      brand: 'Hettich',
      finish: 'Nickel Plated',
      grade: 'Premium',
    },
    uom: 'PCS',
    costPrice: 85,
    currentStock: 500,
    minStockLevel: 100,
    priceHistory: [
      { date: new Date('2024-07-05'), price: 80, vendor: 'Hardware World', vendorContact: '9876543221', quantity: 1000, notes: 'Bulk discount' },
      { date: new Date('2024-09-15'), price: 82, vendor: 'Hardware World', vendorContact: '9876543221', quantity: 500, notes: 'Regular pricing' },
      { date: new Date('2024-11-30'), price: 85, vendor: 'Fittings Pro', vendorContact: '9876543222', quantity: 500, notes: 'Genuine Hettich certified' },
    ],
    status: 'ACTIVE',
  },
  {
    materialCode: 'HRD002',
    name: 'Drawer Channel 450mm Soft Close',
    category: 'HARDWARE',
    specifications: {
      brand: 'Ebco',
      finish: 'Zinc Plated',
      grade: 'Heavy Duty',
    },
    uom: 'SET',
    costPrice: 320,
    currentStock: 200,
    minStockLevel: 50,
    priceHistory: [
      { date: new Date('2024-06-20'), price: 300, vendor: 'Slide Systems', vendorContact: '9876543223', quantity: 300, notes: 'Introduction offer' },
      { date: new Date('2024-10-01'), price: 310, vendor: 'Slide Systems', vendorContact: '9876543223', quantity: 200, notes: 'Standard price' },
      { date: new Date('2024-12-03'), price: 320, vendor: 'Slide Systems', vendorContact: '9876543223', quantity: 200, notes: 'Price adjustment' },
    ],
    status: 'ACTIVE',
  },

  // GLASS
  {
    materialCode: 'GLS001',
    name: 'Clear Glass 5mm',
    category: 'GLASS',
    specifications: {
      thickness: '5mm',
      brand: 'Saint Gobain',
      finish: 'Clear',
      grade: 'Float Glass',
    },
    uom: 'SQF',
    costPrice: 95,
    currentStock: 250,
    minStockLevel: 50,
    priceHistory: [
      { date: new Date('2024-05-15'), price: 88, vendor: 'Glass House', vendorContact: '9876543224', quantity: 300, notes: 'Regular supply' },
      { date: new Date('2024-08-25'), price: 92, vendor: 'Glass House', vendorContact: '9876543224', quantity: 250, notes: 'Price increase' },
      { date: new Date('2024-11-20'), price: 95, vendor: 'Crystal Glass', vendorContact: '9876543225', quantity: 250, notes: 'Better quality control' },
    ],
    status: 'ACTIVE',
  },
  {
    materialCode: 'GLS002',
    name: 'Tinted Glass 8mm Bronze',
    category: 'GLASS',
    specifications: {
      thickness: '8mm',
      brand: 'Asahi',
      finish: 'Tinted',
      color: 'Bronze',
      grade: 'Tempered',
    },
    uom: 'SQF',
    costPrice: 185,
    currentStock: 150,
    minStockLevel: 40,
    priceHistory: [
      { date: new Date('2024-06-10'), price: 175, vendor: 'Premium Glass', vendorContact: '9876543226', quantity: 200, notes: 'New product line' },
      { date: new Date('2024-09-18'), price: 180, vendor: 'Premium Glass', vendorContact: '9876543226', quantity: 150, notes: 'Regular order' },
      { date: new Date('2024-11-22'), price: 185, vendor: 'Premium Glass', vendorContact: '9876543226', quantity: 150, notes: 'Tempering cost increase' },
    ],
    status: 'ACTIVE',
  },

  // FABRIC
  {
    materialCode: 'FAB001',
    name: 'Upholstery Fabric Velvet Grey',
    category: 'FABRIC',
    specifications: {
      brand: 'Fabindia',
      finish: 'Velvet',
      color: 'Charcoal Grey',
      grade: 'Premium',
    },
    uom: 'METER',
    costPrice: 450,
    currentStock: 200,
    minStockLevel: 50,
    priceHistory: [
      { date: new Date('2024-07-01'), price: 420, vendor: 'Textile Traders', vendorContact: '9876543227', quantity: 250, notes: 'Summer collection' },
      { date: new Date('2024-10-10'), price: 435, vendor: 'Textile Traders', vendorContact: '9876543227', quantity: 200, notes: 'Regular pricing' },
      { date: new Date('2024-12-01'), price: 450, vendor: 'Fabric World', vendorContact: '9876543228', quantity: 200, notes: 'Premium quality upgrade' },
    ],
    status: 'ACTIVE',
  },

  // ALUMINIUM
  {
    materialCode: 'ALU001',
    name: 'Aluminium Profile 25x25mm',
    category: 'ALUMINIUM',
    specifications: {
      thickness: '1.2mm',
      width: '25mm',
      brand: 'Jindal',
      finish: 'Anodized Silver',
      grade: '6063-T5',
    },
    uom: 'FEET',
    costPrice: 68,
    currentStock: 500,
    minStockLevel: 100,
    priceHistory: [
      { date: new Date('2024-06-05'), price: 62, vendor: 'Aluminium Mart', vendorContact: '9876543229', quantity: 1000, notes: 'Bulk order discount' },
      { date: new Date('2024-09-12'), price: 65, vendor: 'Aluminium Mart', vendorContact: '9876543229', quantity: 500, notes: 'Standard pricing' },
      { date: new Date('2024-11-25'), price: 68, vendor: 'Metal Works', vendorContact: '9876543230', quantity: 500, notes: 'Market price increase' },
    ],
    status: 'ACTIVE',
  },

  // HANDLES
  {
    materialCode: 'HDL001',
    name: 'Cabinet Handle 128mm SS',
    category: 'HANDLES',
    specifications: {
      brand: 'Ozone',
      finish: 'Brushed Stainless Steel',
      grade: 'SS304',
    },
    uom: 'PCS',
    costPrice: 145,
    currentStock: 300,
    minStockLevel: 80,
    priceHistory: [
      { date: new Date('2024-05-20'), price: 135, vendor: 'Handle House', vendorContact: '9876543231', quantity: 500, notes: 'New collection launch' },
      { date: new Date('2024-08-30'), price: 140, vendor: 'Handle House', vendorContact: '9876543231', quantity: 300, notes: 'Regular supply' },
      { date: new Date('2024-11-18'), price: 145, vendor: 'Premium Handles', vendorContact: '9876543232', quantity: 300, notes: 'Better finish quality' },
    ],
    status: 'ACTIVE',
  },
];

async function seedPriceBook() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Add organizationId to all materials
    const materialsWithOrg = priceBookData.map(material => ({
      ...material,
      organizationId: ORGANIZATION_ID,
    }));

    // Clear existing price book data (optional - comment out if you want to keep existing data)
    // await RawMaterial.deleteMany({ organizationId: ORGANIZATION_ID });
    // console.log('Cleared existing raw materials');

    // Insert new materials
    const inserted = await RawMaterial.insertMany(materialsWithOrg);
    console.log(`✅ Successfully seeded ${inserted.length} materials with price history`);
    
    console.log('\n📊 Price Book Summary:');
    console.log('- Panels: 3 materials');
    console.log('- Laminates: 2 materials');
    console.log('- Edgebands: 2 materials');
    console.log('- Hardware: 2 materials');
    console.log('- Glass: 2 materials');
    console.log('- Fabric: 1 material');
    console.log('- Aluminium: 1 material');
    console.log('- Handles: 1 material');
    console.log('\n✅ All materials have 3 price history entries each');

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error seeding price book:', error);
    process.exit(1);
  }
}

seedPriceBook();
