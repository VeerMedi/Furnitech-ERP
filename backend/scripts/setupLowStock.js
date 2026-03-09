require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI;
const TENANT_ID = '6935417d57433de522df0bbe';

async function setupLowStockMaterials() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected successfully\n');

        const RawMaterial = require('../models/vlite/RawMaterial');
        const inventoryMonitoringService = require('../services/inventoryMonitoringService');

        // Find some materials to update
        const materials = await RawMaterial.find({
            organizationId: TENANT_ID,
            status: 'ACTIVE'
        }).limit(5);

        console.log(`Found ${materials.length} materials\n`);

        if (materials.length === 0) {
            console.log('No materials found. Please seed the database first.');
            await mongoose.disconnect();
            return;
        }

        // Update 3 materials to have low stock
        const updates = [];
        for (let i = 0; i < Math.min(3, materials.length); i++) {
            const material = materials[i];

            // Set reorder point and min stock level
            const reorderPoint = 100;
            const minStockLevel = 50;
            const currentStock = 30; // Below both thresholds

            material.reorderPoint = reorderPoint;
            material.minStockLevel = minStockLevel;
            material.currentStock = currentStock;
            material.reorderQuantity = 200;

            await material.save();
            updates.push(material.name);

            console.log(`Updated: ${material.name} (${material.materialCode})`);
            console.log(`  Current Stock: ${currentStock} ${material.uom}`);
            console.log(`  Min Level: ${minStockLevel}`);
            console.log(`  Reorder Point: ${reorderPoint}`);
            console.log(`  Status: LOW STOCK\n`);
        }

        console.log(`\nUpdated ${updates.length} materials to low stock status`);
        console.log('Materials:', updates.join(', '));

        // Trigger stock monitoring
        console.log('\nTriggering stock monitoring...');
        const result = await inventoryMonitoringService.checkOrganization(TENANT_ID);
        console.log(`Created ${result} new suggestions`);

        console.log('\nDone! Check the Inventory Dashboard to see AI suggestions.');

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');

    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

setupLowStockMaterials();
