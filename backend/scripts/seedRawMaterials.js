/**
 * Raw Materials Seeder Script
 * Seeds 90 realistic raw material items across 9 categories
 * Run: node scripts/seedRawMaterials.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const RawMaterial = require('../models/vlite/RawMaterial');
const Organization = require('../models/shared/Organization');

const seedRawMaterials = async () => {
  try {
    await connectDB();

    // Get the first organization (or specify organizationId)
    const organization = await Organization.findOne();
    if (!organization) {
      console.error('❌ No organization found. Please run main seed script first.');
      process.exit(1);
    }

    console.log(`📦 Seeding raw materials for organization: ${organization.name}`);

    // Clear existing raw materials
    await RawMaterial.deleteMany({ organizationId: organization._id });
    console.log('🗑️  Cleared existing raw materials');

    // Raw materials data (90 items - 10 per category)
    const rawMaterialsData = [
      // Panel (10 items)
      { name: 'CenturyPly 18mm MDF 8x4 Sheet', category: 'Panel', stock: 150, unit: 'Sheet', price: 1250, status: 'available' },
      { name: 'GreenPly BWP 12mm Plywood', category: 'Panel', stock: 80, unit: 'Sheet', price: 1580, status: 'available' },
      { name: 'Particle Board 16mm Standard', category: 'Panel', stock: 20, unit: 'Sheet', price: 920, status: 'low-stock' },
      { name: 'HDF Board 6mm Premium', category: 'Panel', stock: 95, unit: 'Sheet', price: 850, status: 'available' },
      { name: 'Marine Plywood 18mm BWR', category: 'Panel', stock: 45, unit: 'Sheet', price: 2650, status: 'available' },
      { name: 'Block Board 19mm Commercial', category: 'Panel', stock: 60, unit: 'Sheet', price: 1850, status: 'available' },
      { name: 'MDF Board 25mm Thick Grade', category: 'Panel', stock: 110, unit: 'Sheet', price: 1650, status: 'available' },
      { name: 'Plywood 8mm Flexible', category: 'Panel', stock: 140, unit: 'Sheet', price: 980, status: 'available' },
      { name: 'HMR Particle Board 18mm', category: 'Panel', stock: 15, unit: 'Sheet', price: 1120, status: 'low-stock' },
      { name: 'Prelaminated MDF 18mm White', category: 'Panel', stock: 75, unit: 'Sheet', price: 1950, status: 'available' },
      
      // Laminate (10 items)
      { name: 'Greenlam Glossy White 1mm', category: 'Laminate', stock: 200, unit: 'Sheet', price: 485, status: 'available' },
      { name: 'Merino Matte Black Premium', category: 'Laminate', stock: 120, unit: 'Sheet', price: 520, status: 'available' },
      { name: 'Royale Touche Wood Grain Walnut', category: 'Laminate', stock: 90, unit: 'Sheet', price: 565, status: 'available' },
      { name: 'Formica Marble Pattern Statuario', category: 'Laminate', stock: 15, unit: 'Sheet', price: 650, status: 'low-stock' },
      { name: 'Virgo Metallic Silver Shine', category: 'Laminate', stock: 75, unit: 'Sheet', price: 590, status: 'available' },
      { name: 'Greenlam High Gloss Red', category: 'Laminate', stock: 105, unit: 'Sheet', price: 615, status: 'available' },
      { name: 'Merino Suede Finish Beige', category: 'Laminate', stock: 85, unit: 'Sheet', price: 545, status: 'available' },
      { name: 'Century Laminates Oak Natural', category: 'Laminate', stock: 130, unit: 'Sheet', price: 495, status: 'available' },
      { name: 'Formica Solid Color Grey', category: 'Laminate', stock: 18, unit: 'Sheet', price: 475, status: 'low-stock' },
      { name: 'Royale Touche Leather Finish Brown', category: 'Laminate', stock: 95, unit: 'Sheet', price: 625, status: 'available' },
      
      // HBD (10 items)
      { name: 'Rehau Oak Edgeband 0.8mm 22mm', category: 'HBD', stock: 500, unit: 'Meter', price: 28, status: 'available' },
      { name: 'Egger Walnut PVC 1mm 32mm', category: 'HBD', stock: 300, unit: 'Meter', price: 32, status: 'available' },
      { name: 'White PVC Edgeband 0.5mm 19mm', category: 'HBD', stock: 10, unit: 'Meter', price: 18, status: 'low-stock' },
      { name: 'Black ABS Edgeband 1mm 25mm', category: 'HBD', stock: 250, unit: 'Meter', price: 24, status: 'available' },
      { name: 'Teak Veneer Edgeband 1.5mm 40mm', category: 'HBD', stock: 180, unit: 'Meter', price: 38, status: 'available' },
      { name: 'Maple PVC Edge Banding 0.8mm', category: 'HBD', stock: 420, unit: 'Meter', price: 26, status: 'available' },
      { name: 'Cherry Wood ABS Edge 1mm', category: 'HBD', stock: 195, unit: 'Meter', price: 30, status: 'available' },
      { name: 'High Gloss White ABS 2mm', category: 'HBD', stock: 15, unit: 'Meter', price: 35, status: 'low-stock' },
      { name: 'Beige PVC Edgeband 0.6mm', category: 'HBD', stock: 340, unit: 'Meter', price: 22, status: 'available' },
      { name: 'Aluminium Silver Edge Trim 15mm', category: 'HBD', stock: 280, unit: 'Meter', price: 42, status: 'available' },
      
      // Hardware (10 items)
      { name: 'Hettich Soft Close Hinge 110°', category: 'Hardware', stock: 500, unit: 'Piece', price: 95, status: 'available' },
      { name: 'Blum Tandem Full Extension Slide 450mm', category: 'Hardware', stock: 200, unit: 'Pair', price: 165, status: 'available' },
      { name: 'Hafele Concealed Door Hinge 35mm', category: 'Hardware', stock: 8, unit: 'Piece', price: 52, status: 'low-stock' },
      { name: 'Adjustable Shelf Support Nickel', category: 'Hardware', stock: 1000, unit: 'Piece', price: 6, status: 'available' },
      { name: 'Cabinet Leg Leveler Chrome', category: 'Hardware', stock: 350, unit: 'Piece', price: 18, status: 'available' },
      { name: 'Glass Door Hinge 180° Opening', category: 'Hardware', stock: 120, unit: 'Piece', price: 105, status: 'available' },
      { name: 'Push to Open Mechanism', category: 'Hardware', stock: 285, unit: 'Piece', price: 145, status: 'available' },
      { name: 'Drawer Lock Sliding Cam Type', category: 'Hardware', stock: 12, unit: 'Piece', price: 75, status: 'low-stock' },
      { name: 'Gas Lift Support 60N', category: 'Hardware', stock: 180, unit: 'Piece', price: 125, status: 'available' },
      { name: 'Magnetic Door Catch Heavy Duty', category: 'Hardware', stock: 540, unit: 'Piece', price: 28, status: 'available' },
      
      // Glass (10 items)
      { name: 'Clear Float Glass 5mm Standard', category: 'Glass', stock: 50, unit: 'Sheet', price: 850, status: 'available' },
      { name: 'Frosted Glass 6mm Acid Etched', category: 'Glass', stock: 30, unit: 'Sheet', price: 985, status: 'available' },
      { name: 'Tinted Glass 8mm Bronze', category: 'Glass', stock: 5, unit: 'Sheet', price: 1150, status: 'low-stock' },
      { name: 'Mirror Glass 4mm Silver Back', category: 'Glass', stock: 25, unit: 'Sheet', price: 720, status: 'available' },
      { name: 'Textured Glass 6mm Pattern', category: 'Glass', stock: 42, unit: 'Sheet', price: 1050, status: 'available' },
      { name: 'Tempered Glass 10mm Safety', category: 'Glass', stock: 35, unit: 'Sheet', price: 1650, status: 'available' },
      { name: 'Laminated Glass 6.38mm Clear', category: 'Glass', stock: 18, unit: 'Sheet', price: 1420, status: 'low-stock' },
      { name: 'Tinted Glass 6mm Grey', category: 'Glass', stock: 28, unit: 'Sheet', price: 950, status: 'available' },
      { name: 'Decorative Glass 5mm Painted', category: 'Glass', stock: 55, unit: 'Sheet', price: 1280, status: 'available' },
      { name: 'Low Iron Glass 8mm Ultra Clear', category: 'Glass', stock: 15, unit: 'Sheet', price: 1850, status: 'low-stock' },
      
      // Fabric (10 items)
      { name: 'Cotton Upholstery Fabric Plain Weave', category: 'Fabric', stock: 80, unit: 'Meter', price: 280, status: 'available' },
      { name: 'Velvet Fabric Royal Blue Premium', category: 'Fabric', stock: 40, unit: 'Meter', price: 485, status: 'available' },
      { name: 'Genuine Leather Brown Full Grain', category: 'Fabric', stock: 15, unit: 'Meter', price: 850, status: 'low-stock' },
      { name: 'Linen Fabric Grey Natural', category: 'Fabric', stock: 60, unit: 'Meter', price: 385, status: 'available' },
      { name: 'Synthetic Leather Black Textured', category: 'Fabric', stock: 95, unit: 'Meter', price: 595, status: 'available' },
      { name: 'Chenille Fabric Beige Luxury', category: 'Fabric', stock: 52, unit: 'Meter', price: 420, status: 'available' },
      { name: 'Suede Fabric Tan Soft Touch', category: 'Fabric', stock: 38, unit: 'Meter', price: 650, status: 'available' },
      { name: 'Polyester Blend Navy Blue', category: 'Fabric', stock: 12, unit: 'Meter', price: 295, status: 'low-stock' },
      { name: 'Jacquard Fabric Gold Pattern', category: 'Fabric', stock: 45, unit: 'Meter', price: 525, status: 'available' },
      { name: 'Microfiber Fabric Charcoal Grey', category: 'Fabric', stock: 70, unit: 'Meter', price: 365, status: 'available' },
      
      // Aluminum (10 items)
      { name: 'Aluminum Profile 20x20mm Anodized', category: 'Aluminum', stock: 150, unit: 'Meter', price: 135, status: 'available' },
      { name: 'Aluminum Channel 30x30mm Silver', category: 'Aluminum', stock: 90, unit: 'Meter', price: 195, status: 'available' },
      { name: 'Anodized Aluminum Strip 25mm', category: 'Aluminum', stock: 10, unit: 'Meter', price: 225, status: 'low-stock' },
      { name: 'Aluminum Frame 40x40mm Heavy Duty', category: 'Aluminum', stock: 70, unit: 'Meter', price: 275, status: 'available' },
      { name: 'Aluminum Angle 25x25mm L-Shape', category: 'Aluminum', stock: 120, unit: 'Meter', price: 165, status: 'available' },
      { name: 'Aluminum T-Section 20mm Profile', category: 'Aluminum', stock: 85, unit: 'Meter', price: 145, status: 'available' },
      { name: 'Aluminum U-Channel 35mm Wide', category: 'Aluminum', stock: 14, unit: 'Meter', price: 185, status: 'low-stock' },
      { name: 'Aluminum Square Tube 25x25mm', category: 'Aluminum', stock: 95, unit: 'Meter', price: 205, status: 'available' },
      { name: 'Aluminum Flat Bar 50x6mm', category: 'Aluminum', stock: 110, unit: 'Meter', price: 155, status: 'available' },
      { name: 'Aluminum Round Tube 25mm Dia', category: 'Aluminum', stock: 75, unit: 'Meter', price: 175, status: 'available' },
      
      // Processed Panel (10 items)
      { name: 'Laminated MDF Panel White 18mm', category: 'Processed Panel', stock: 100, unit: 'Sheet', price: 2350, status: 'available' },
      { name: 'Pre-cut Kitchen Cabinet Panel Set', category: 'Processed Panel', stock: 50, unit: 'Piece', price: 1650, status: 'available' },
      { name: 'Edge Banded Shelf Oak Finish', category: 'Processed Panel', stock: 8, unit: 'Piece', price: 850, status: 'low-stock' },
      { name: 'Finished Wardrobe Panel Walnut', category: 'Processed Panel', stock: 30, unit: 'Piece', price: 2650, status: 'available' },
      { name: 'CNC Cut Decorative Panel Jali', category: 'Processed Panel', stock: 22, unit: 'Piece', price: 3200, status: 'available' },
      { name: 'UV Coated MDF Panel High Gloss', category: 'Processed Panel', stock: 65, unit: 'Sheet', price: 2850, status: 'available' },
      { name: 'Acrylic Finish Panel Glossy White', category: 'Processed Panel', stock: 38, unit: 'Sheet', price: 3450, status: 'available' },
      { name: 'Membrane Pressed Door Shutter', category: 'Processed Panel', stock: 12, unit: 'Piece', price: 1950, status: 'low-stock' },
      { name: 'PU Painted Panel Matte Finish', category: 'Processed Panel', stock: 45, unit: 'Sheet', price: 3850, status: 'available' },
      { name: 'Veneer Finished Panel Teak', category: 'Processed Panel', stock: 28, unit: 'Sheet', price: 4200, status: 'available' },
      
      // Handles (10 items)
      { name: 'Stainless Steel Handle 128mm Modern', category: 'Handles', stock: 300, unit: 'Piece', price: 52, status: 'available' },
      { name: 'Brass Handle 96mm Antique Finish', category: 'Handles', stock: 150, unit: 'Piece', price: 75, status: 'available' },
      { name: 'Aluminum Handle 160mm Sleek Design', category: 'Handles', stock: 12, unit: 'Piece', price: 62, status: 'low-stock' },
      { name: 'Chrome Handle 192mm Contemporary', category: 'Handles', stock: 200, unit: 'Piece', price: 78, status: 'available' },
      { name: 'Black Matte Handle 128mm Minimalist', category: 'Handles', stock: 185, unit: 'Piece', price: 68, status: 'available' },
      { name: 'Gold Finish Handle 256mm Luxury', category: 'Handles', stock: 100, unit: 'Piece', price: 135, status: 'available' },
      { name: 'Rose Gold Handle 160mm Premium', category: 'Handles', stock: 15, unit: 'Piece', price: 125, status: 'low-stock' },
      { name: 'Brushed Nickel Handle 192mm', category: 'Handles', stock: 220, unit: 'Piece', price: 85, status: 'available' },
      { name: 'Copper Finish Handle 128mm Vintage', category: 'Handles', stock: 95, unit: 'Piece', price: 95, status: 'available' },
      { name: 'Titanium Handle 224mm Industrial', category: 'Handles', stock: 140, unit: 'Piece', price: 115, status: 'available' },
    ];

    // Add organizationId to all items
    const materialsWithOrg = rawMaterialsData.map(item => ({
      ...item,
      organizationId: organization._id,
      createdAt: new Date(),
    }));

    // Insert into database
    const result = await RawMaterial.insertMany(materialsWithOrg);
    console.log(`✅ Successfully seeded ${result.length} raw materials`);

    // Display summary
    const categoryCounts = rawMaterialsData.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📊 Category Summary:');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} items`);
    });

    console.log('\n✨ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedRawMaterials();
