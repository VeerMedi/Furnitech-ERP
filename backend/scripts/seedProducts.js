require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/vlite/Product');
const Organization = require('../models/shared/Organization');
const connectDB = require('../config/database');

const productsData = {
    nonSharingWorkstations: [
        { sku: 'NSW-1200-PLB-001', category: 'NON_SHARING_WORKSTATION', length: 1200, width: 600, height: 750, material: 'PLB', seats: 1, type: 'Standard', price: 12500, specs: '1200x600x750mm workstation with PLB finish' },
        { sku: 'NSW-1400-MDF-002', category: 'NON_SHARING_WORKSTATION', length: 1400, width: 700, height: 750, material: 'MDF', seats: 1, type: 'Standard', price: 15800, specs: '1400x700x750mm workstation with MDF finish' },
        { sku: 'NSW-1600-PLY-003', category: 'NON_SHARING_WORKSTATION', length: 1600, width: 750, height: 750, material: 'PLY', seats: 1, type: 'Executive', price: 19200, specs: '1600x750x750mm executive workstation with plywood' },
        { sku: 'NSW-1800-VENEER-004', category: 'NON_SHARING_WORKSTATION', length: 1800, width: 800, height: 750, material: 'VENEER', seats: 1, type: 'Executive', price: 24500, specs: '1800x800x750mm executive workstation with veneer finish' },
        { sku: 'NSW-1200-LAMINATE-005', category: 'NON_SHARING_WORKSTATION', length: 1200, width: 600, height: 750, material: 'LAMINATE', seats: 1, type: 'Standard', price: 13800, specs: '1200x600x750mm workstation with laminate top' },
        { sku: 'NSW-1500-PLB-006', category: 'NON_SHARING_WORKSTATION', length: 1500, width: 700, height: 750, material: 'PLB', seats: 1, type: 'Standard', price: 16500, specs: '1500x700x750mm standard workstation' },
        { sku: 'NSW-2000-PLY-007', category: 'NON_SHARING_WORKSTATION', length: 2000, width: 900, height: 750, material: 'PLY', seats: 1, type: 'Director', price: 32000, specs: '2000x900x750mm director workstation' },
        { sku: 'NSW-1400-PLB-008', category: 'NON_SHARING_WORKSTATION', length: 1400, width: 650, height: 750, material: 'PLB', seats: 1, type: 'Standard', price: 14200, specs: '1400x650x750mm compact workstation' },
    ],
    sharingWorkstations: [
        { sku: 'SW-2400-PLB-001', category: 'SHARING_WORKSTATION', length: 2400, width: 1200, height: 750, material: 'PLB', seats: 2, type: 'Linear', price: 24000, specs: '2400x1200x750mm 2-seater linear workstation' },
        { sku: 'SW-3600-MDF-002', category: 'SHARING_WORKSTATION', length: 3600, width: 1200, height: 750, material: 'MDF', seats: 3, type: 'Linear', price: 35500, specs: '3600x1200x750mm 3-seater linear workstation' },
        { sku: 'SW-4800-PLY-003', category: 'SHARING_WORKSTATION', length: 4800, width: 1200, height: 750, material: 'PLY', seats: 4, type: 'Linear', price: 48000, specs: '4800x1200x750mm 4-seater linear workstation' },
        { sku: 'SW-2400-LAMINATE-004', category: 'SHARING_WORKSTATION', length: 2400, width: 2400, height: 750, material: 'LAMINATE', seats: 4, type: 'Cluster', price: 52000, specs: '2400x2400x750mm 4-seater cluster workstation' },
        { sku: 'SW-3000-PLB-005', category: 'SHARING_WORKSTATION', length: 3000, width: 3000, height: 750, material: 'PLB', seats: 6, type: 'Cluster', price: 68000, specs: '3000x3000x750mm 6-seater cluster workstation' },
        { sku: 'SW-6000-MDF-006', category: 'SHARING_WORKSTATION', length: 6000, width: 1200, height: 750, material: 'MDF', seats: 6, type: 'Linear', price: 65000, specs: '6000x1200x750mm 6-seater linear workstation' },
        { sku: 'SW-2400-PLY-007', category: 'SHARING_WORKSTATION', length: 2400, width: 1400, height: 750, material: 'PLY', seats: 2, type: 'Face-to-Face', price: 28500, specs: '2400x1400x750mm face-to-face workstation' },
        { sku: 'SW-3600-VENEER-008', category: 'SHARING_WORKSTATION', length: 3600, width: 1400, height: 750, material: 'VENEER', seats: 3, type: 'Face-to-Face', price: 45000, specs: '3600x1400x750mm premium face-to-face workstation' },
    ],
    nonSharingPartitions: [
        { sku: 'NSP-1200-PLB-001', category: 'NON_SHARING_PARTITION', height: 1200, width: 600, material: 'PLB', type: 'Side Panel', price: 3500, specs: '1200H x 600W side partition panel' },
        { sku: 'NSP-1500-FABRIC-002', category: 'NON_SHARING_PARTITION', height: 1500, width: 800, material: 'FABRIC', type: 'Acoustic', price: 5800, specs: '1500H x 800W acoustic fabric partition' },
        { sku: 'NSP-1800-GLASS-003', category: 'NON_SHARING_PARTITION', height: 1800, width: 1000, material: 'GLASS', type: 'Frosted', price: 12000, specs: '1800H x 1000W frosted glass partition' },
        { sku: 'NSP-1200-MDF-004', category: 'NON_SHARING_PARTITION', height: 1200, width: 700, material: 'MDF', type: 'Side Panel', price: 4200, specs: '1200H x 700W MDF side panel' },
        { sku: 'NSP-1400-PLB-005', category: 'NON_SHARING_PARTITION', height: 1400, width: 600, material: 'PLB', type: 'Side Panel', price: 3800, specs: '1400H x 600W standard partition' },
        { sku: 'NSP-1600-FABRIC-006', category: 'NON_SHARING_PARTITION', height: 1600, width: 900, material: 'FABRIC', type: 'Acoustic', price: 6500, specs: '1600H x 900W acoustic panel with sound absorption' },
    ],
    sharingPartitions: [
        { sku: 'SP-1200-PLB-001', category: 'SHARING_PARTITION', height: 1200, width: 1200, material: 'PLB', type: 'Divider', price: 6000, specs: '1200H x 1200W desk divider panel' },
        { sku: 'SP-1500-FABRIC-002', category: 'SHARING_PARTITION', height: 1500, width: 1400, material: 'FABRIC', type: 'Acoustic', price: 9500, specs: '1500H x 1400W acoustic divider' },
        { sku: 'SP-1800-GLASS-003', category: 'SHARING_PARTITION', height: 1800, width: 1600, material: 'GLASS', type: 'Clear', price: 18000, specs: '1800H x 1600W clear glass divider' },
        { sku: 'SP-1200-MDF-004', category: 'SHARING_PARTITION', height: 1200, width: 1200, material: 'MDF', type: 'Divider', price: 6800, specs: '1200H x 1200W MDF divider panel' },
        { sku: 'SP-1400-PLB-005', category: 'SHARING_PARTITION', height: 1400, width: 1400, material: 'PLB', type: 'Divider', price: 7200, specs: '1400H x 1400W standard divider' },
    ],
    foldingTables: [
        { sku: 'FT-1200-600-PLB-001', category: 'FOLDING_TABLE', length: 1200, width: 600, height: 750, material: 'PLB', price: 4500, specs: '1200x600x750mm folding training table' },
        { sku: 'FT-1500-600-PLB-002', category: 'FOLDING_TABLE', length: 1500, width: 600, height: 750, material: 'PLB', price: 5200, specs: '1500x600x750mm folding training table' },
        { sku: 'FT-1800-600-PLB-003', category: 'FOLDING_TABLE', length: 1800, width: 600, height: 750, material: 'PLB', price: 6000, specs: '1800x600x750mm folding training table' },
        { sku: 'FT-1200-600-MDF-004', category: 'FOLDING_TABLE', length: 1200, width: 600, height: 750, material: 'MDF', price: 5000, specs: '1200x600x750mm MDF folding table' },
        { sku: 'FT-1500-600-MDF-005', category: 'FOLDING_TABLE', length: 1500, width: 600, height: 750, material: 'MDF', price: 5800, specs: '1500x600x750mm MDF folding table' },
        { sku: 'FT-1800-600-MDF-006', category: 'FOLDING_TABLE', length: 1800, width: 600, height: 750, material: 'MDF', price: 6800, specs: '1800x600x750mm MDF folding table' },
        { sku: 'FT-1200-750-PLB-007', category: 'FOLDING_TABLE', length: 1200, width: 750, height: 750, material: 'PLB', price: 5500, specs: '1200x750x750mm wide folding table' },
        { sku: 'FT-1500-750-PLB-008', category: 'FOLDING_TABLE', length: 1500, width: 750, height: 750, material: 'PLB', price: 6200, specs: '1500x750x750mm wide folding table' },
        { sku: 'FT-1800-750-MDF-009', category: 'FOLDING_TABLE', length: 1800, width: 750, height: 750, material: 'MDF', price: 7500, specs: '1800x750x750mm wide MDF folding table' },
        { sku: 'FT-1200-600-LAMINATE-010', category: 'FOLDING_TABLE', length: 1200, width: 600, height: 750, material: 'LAMINATE', price: 5200, specs: '1200x600x750mm laminate folding table' },
        { sku: 'FT-1500-750-LAMINATE-011', category: 'FOLDING_TABLE', length: 1500, width: 750, height: 750, material: 'LAMINATE', price: 6800, specs: '1500x750x750mm laminate folding table' },
    ],
    cafeTables: [
        { sku: 'CT-600-ROUND-PLB-001', category: 'CAFE_TABLE', diameter: 600, height: 750, material: 'PLB', shape: 'Round', price: 3500, specs: 'Ø600x750mm round café table' },
        { sku: 'CT-750-ROUND-MDF-002', category: 'CAFE_TABLE', diameter: 750, height: 750, material: 'MDF', shape: 'Round', price: 4200, specs: 'Ø750x750mm round café table' },
        { sku: 'CT-900-ROUND-LAMINATE-003', category: 'CAFE_TABLE', diameter: 900, height: 750, material: 'LAMINATE', shape: 'Round', price: 5500, specs: 'Ø900x750mm round café table with laminate top' },
        { sku: 'CT-600-600-SQ-PLB-004', category: 'CAFE_TABLE', length: 600, width: 600, height: 750, material: 'PLB', shape: 'Square', price: 3200, specs: '600x600x750mm square café table' },
        { sku: 'CT-750-750-SQ-MDF-005', category: 'CAFE_TABLE', length: 750, width: 750, height: 750, material: 'MDF', shape: 'Square', price: 4000, specs: '750x750x750mm square café table' },
        { sku: 'CT-800-ROUND-GLASS-006', category: 'CAFE_TABLE', diameter: 800, height: 750, material: 'GLASS', shape: 'Round', price: 8500, specs: 'Ø800x750mm glass top café table' },
        { sku: 'CT-600-ROUND-VENEER-007', category: 'CAFE_TABLE', diameter: 600, height: 750, material: 'VENEER', shape: 'Round', price: 4800, specs: 'Ø600x750mm veneer finish café table' },
    ],
    conferenceTables: [
        { sku: 'CONF-2400-1200-PLB-001', category: 'CONFERENCE_TABLE', length: 2400, width: 1200, height: 750, material: 'PLB', seats: 6, price: 28000, specs: '2400x1200x750mm conference table for 6' },
        { sku: 'CONF-3000-1200-MDF-002', category: 'CONFERENCE_TABLE', length: 3000, width: 1200, height: 750, material: 'MDF', seats: 8, price: 35000, specs: '3000x1200x750mm conference table for 8' },
        { sku: 'CONF-3600-1400-PLY-003', category: 'CONFERENCE_TABLE', length: 3600, width: 1400, height: 750, material: 'PLY', seats: 10, price: 52000, specs: '3600x1400x750mm conference table for 10' },
        { sku: 'CONF-4800-1400-VENEER-004', category: 'CONFERENCE_TABLE', length: 4800, width: 1400, height: 750, material: 'VENEER', seats: 12, price: 85000, specs: '4800x1400x750mm executive conference table for 12' },
        { sku: 'CONF-6000-1600-VENEER-005', category: 'CONFERENCE_TABLE', length: 6000, width: 1600, height: 750, material: 'VENEER', seats: 16, price: 125000, specs: '6000x1600x750mm large conference table for 16' },
        { sku: 'CONF-2400-1200-LAMINATE-006', category: 'CONFERENCE_TABLE', length: 2400, width: 1200, height: 750, material: 'LAMINATE', seats: 6, price: 32000, specs: '2400x1200x750mm laminate conference table' },
    ],
    cabinTables: [
        { sku: 'CAB-1200-600-PLB-001', category: 'CABIN_TABLE', length: 1200, width: 600, height: 750, material: 'PLB', type: 'Standard', price: 8500, specs: '1200x600x750mm cabin table' },
        { sku: 'CAB-1400-700-MDF-002', category: 'CABIN_TABLE', length: 1400, width: 700, height: 750, material: 'MDF', type: 'Standard', price: 10200, specs: '1400x700x750mm cabin table' },
        { sku: 'CAB-1600-800-PLY-003', category: 'CABIN_TABLE', length: 1600, width: 800, height: 750, material: 'PLY', type: 'Executive', price: 16500, specs: '1600x800x750mm executive cabin table' },
        { sku: 'CAB-1800-900-VENEER-004', category: 'CABIN_TABLE', length: 1800, width: 900, height: 750, material: 'VENEER', type: 'Executive', price: 24000, specs: '1800x900x750mm premium executive cabin table' },
        { sku: 'CAB-2000-1000-VENEER-005', category: 'CABIN_TABLE', length: 2000, width: 1000, height: 750, material: 'VENEER', type: 'Director', price: 32000, specs: '2000x1000x750mm director cabin table' },
        { sku: 'CAB-1500-750-LAMINATE-006', category: 'CABIN_TABLE', length: 1500, width: 750, height: 750, material: 'LAMINATE', type: 'Standard', price: 12500, specs: '1500x750x750mm laminate cabin table' },
    ],
    storage: [
        { sku: 'STG-800-400-PLB-PED-001', category: 'STORAGE', type: 'Pedestal', length: 800, width: 400, height: 600, material: 'PLB', capacity: '3 Drawers', price: 4500, specs: '800x400x600mm mobile pedestal with 3 drawers' },
        { sku: 'STG-900-450-MDF-CAB-002', category: 'STORAGE', type: 'Cabinet', length: 900, width: 450, height: 1800, material: 'MDF', capacity: 'Half Height', price: 12000, specs: '900x450x1800mm half-height cabinet' },
        { sku: 'STG-1200-450-PLB-CAB-003', category: 'STORAGE', type: 'Cabinet', length: 1200, width: 450, height: 2100, material: 'PLB', capacity: 'Full Height', price: 18000, specs: '1200x450x2100mm full-height storage cabinet' },
        { sku: 'STG-800-400-PLY-PED-004', category: 'STORAGE', type: 'Pedestal', length: 800, width: 400, height: 600, material: 'PLY', capacity: '3 Drawers', price: 5500, specs: '800x400x600mm plywood pedestal' },
        { sku: 'STG-1500-500-MDF-OH-005', category: 'STORAGE', type: 'Overhead', length: 1500, width: 500, height: 700, material: 'MDF', capacity: 'Overhead Unit', price: 8500, specs: '1500x500x700mm overhead storage unit' },
        { sku: 'STG-1000-450-PLB-SIDE-006', category: 'STORAGE', type: 'Side Unit', length: 1000, width: 450, height: 1050, material: 'PLB', capacity: 'Side Storage', price: 9500, specs: '1000x450x1050mm side storage unit' },
        { sku: 'STG-800-400-METAL-PED-007', category: 'STORAGE', type: 'Pedestal', length: 800, width: 400, height: 600, material: 'METAL', capacity: '3 Drawers', price: 6500, specs: '800x400x600mm metal mobile pedestal' },
    ],
    accessories: [
        { sku: 'ACC-CPU-HOLDER-001', category: 'ACCESSORIES', name: 'CPU Holder', subcategory: 'Hardware', material: 'METAL', price: 850, specs: 'Under-desk CPU holder, adjustable' },
        { sku: 'ACC-CABLE-TRAY-002', category: 'ACCESSORIES', name: 'Cable Tray', subcategory: 'Cable Management', material: 'METAL', price: 650, specs: 'Horizontal cable management tray' },
        { sku: 'ACC-GROMMET-80-003', category: 'ACCESSORIES', name: 'Cable Grommet 80mm', subcategory: 'Cable Management', material: 'METAL', price: 250, specs: '80mm cable grommet with cover' },
        { sku: 'ACC-GROMMET-100-004', category: 'ACCESSORIES', name: 'Cable Grommet 100mm', subcategory: 'Cable Management', material: 'METAL', price: 300, specs: '100mm cable grommet with cover' },
        { sku: 'ACC-MONITOR-ARM-005', category: 'ACCESSORIES', name: 'Monitor Arm', subcategory: 'Hardware', material: 'METAL', price: 3500, specs: 'Adjustable monitor arm, single screen' },
        { sku: 'ACC-KEYBOARD-TRAY-006', category: 'ACCESSORIES', name: 'Keyboard Tray', subcategory: 'Hardware', material: 'METAL', price: 1200, specs: 'Under-desk keyboard tray with mouse pad' },
        { sku: 'ACC-MODESTY-PANEL-007', category: 'ACCESSORIES', name: 'Modesty Panel', subcategory: 'Privacy', material: 'PLB', price: 1800, specs: 'Front modesty panel for workstation' },
        { sku: 'ACC-WIRE-MANAGER-008', category: 'ACCESSORIES', name: 'Wire Manager', subcategory: 'Cable Management', material: 'METAL', price: 450, specs: 'Vertical wire management spine' },
        { sku: 'ACC-DRAWER-DIVIDER-009', category: 'ACCESSORIES', name: 'Drawer Divider', subcategory: 'Organization', material: 'PLB', price: 350, specs: 'Adjustable drawer divider set' },
        { sku: 'ACC-LEG-LEVELER-010', category: 'ACCESSORIES', name: 'Leg Leveler', subcategory: 'Hardware', material: 'METAL', price: 120, specs: 'Adjustable leg leveler, set of 4' },
    ]
};

const allProducts = [
    ...productsData.nonSharingWorkstations,
    ...productsData.sharingWorkstations,
    ...productsData.nonSharingPartitions,
    ...productsData.sharingPartitions,
    ...productsData.foldingTables,
    ...productsData.cafeTables,
    ...productsData.conferenceTables,
    ...productsData.cabinTables,
    ...productsData.storage,
    ...productsData.accessories
];

const seedProducts = async () => {
    try {
        await connectDB();
        console.log('Connected to MongoDB');

        // Find the organization
        const orgSlug = 'vlite-furnitures';
        const organization = await Organization.findOne({ slug: orgSlug });

        if (!organization) {
            console.error(`Organization not found: ${orgSlug}`);
            process.exit(1);
        }
        console.log(`Found organization: ${organization.name} (${organization._id})`);

        // Prepare products for insertion
        const productsToInsert = allProducts.map(p => {
            // Map dimensions. Logic: 
            // Workstations/Tables: Length x Width x Height -> Width x Depth x Height
            // Cafe Tables (Round): Diameter -> Width/Depth

            let width = p.length || p.diameter || 0;
            let depth = p.width || p.diameter || 0; // For round tables, width/depth = diameter
            let height = p.height || 0;

            return {
                productCode: p.sku,
                name: p.name || `${p.category.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')} ${p.sku}`,
                category: p.category,
                subCategory: p.subcategory || p.type,
                specifications: {
                    dimensions: {
                        width,
                        depth,
                        height,
                        unit: 'MM',
                    },
                    material: p.material,
                    finish: p.finish || 'Standard',
                    color: p.color || 'Standard',
                    seats: p.seats,
                    type: p.type,
                    shape: p.shape,
                    capacity: p.capacity,
                    customSpecs: p.specs,
                },
                pricing: {
                    sellingPrice: p.price,
                    currency: 'INR',
                },
                description: p.specs,
                status: 'ACTIVE',
                organizationId: organization._id,
            };
        });

        console.log(`Preparing to seed ${productsToInsert.length} products...`);

        // Use bulkWrite for efficient upserts to avoid duplicates
        const operations = productsToInsert.map(product => ({
            updateOne: {
                filter: { productCode: product.productCode, organizationId: product.organizationId },
                update: { $set: product },
                upsert: true
            }
        }));

        if (operations.length > 0) {
            const result = await Product.bulkWrite(operations);
            console.log(`✅ Seeded products result: Matched ${result.matchedCount}, Modified ${result.modifiedCount}, Upserted ${result.upsertedCount}`);
        } else {
            console.log('No products to seed.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedProducts();
