require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vlite-erp';
const TENANT_ID = '6935417d57433de522df0bbe'; // Vlite organization ID from .env

async function checkRawMaterials() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        const RawMaterial = require('../models/vlite/RawMaterial');
        const InventorySuggestion = require('../models/vlite/InventorySuggestion');

        console.log('='.repeat(60));
        console.log('RAW MATERIALS & AI SUGGESTIONS ANALYSIS');
        console.log('='.repeat(60));

        // Check total raw materials
        const totalMaterials = await RawMaterial.countDocuments({ organizationId: TENANT_ID });
        console.log(`\n📦 Total Raw Materials: ${totalMaterials}`);

        // Check materials with reorder settings
        const materialsWithReorder = await RawMaterial.countDocuments({
            organizationId: TENANT_ID,
            $or: [
                { reorderPoint: { $exists: true, $ne: null, $gt: 0 } },
                { minStockLevel: { $exists: true, $ne: null, $gt: 0 } }
            ]
        });
        console.log(`⚙️  Materials with reorder settings: ${materialsWithReorder}`);

        // Check low stock materials
        const lowStockMaterials = await RawMaterial.find({
            organizationId: TENANT_ID,
            status: 'ACTIVE',
            $or: [
                { $expr: { $lte: ['$currentStock', '$reorderPoint'] } },
                { $expr: { $lte: ['$currentStock', '$minStockLevel'] } }
            ]
        }).limit(10);

        console.log(`\n🔴 Low Stock Materials: ${lowStockMaterials.length}`);
        if (lowStockMaterials.length > 0) {
            console.log('\nDetails:');
            lowStockMaterials.forEach(m => {
                console.log(`  - ${m.name} (${m.materialCode})`);
                console.log(`    Current: ${m.currentStock} ${m.uom}`);
                console.log(`    Min Level: ${m.minStockLevel || 'Not set'}`);
                console.log(`    Reorder Point: ${m.reorderPoint || 'Not set'}`);
                console.log('');
            });
        } else {
            console.log('  ℹ️  No materials below reorder point');

            // Show some sample materials
            console.log('\n📋 Sample Raw Materials (first 5):');
            const sampleMaterials = await RawMaterial.find({ organizationId: TENANT_ID }).limit(5);
            sampleMaterials.forEach(m => {
                console.log(`  - ${m.name} (${m.materialCode})`);
                console.log(`    Current: ${m.currentStock || 0} ${m.uom}`);
                console.log(`    Min Level: ${m.minStockLevel || 'Not set'}`);
                console.log(`    Reorder Point: ${m.reorderPoint || 'Not set'}`);
                console.log('');
            });
        }

        // Check existing suggestions
        const suggestions = await InventorySuggestion.find({
            organizationId: TENANT_ID,
            status: 'pending'
        });

        console.log(`\n💡 Active Suggestions: ${suggestions.length}`);
        if (suggestions.length > 0) {
            console.log('\nDetails:');
            suggestions.forEach(s => {
                console.log(`  - ${s.materialName} (${s.materialCode})`);
                console.log(`    Priority: ${s.priority}`);
                console.log(`    Message: ${s.message}`);
                console.log('');
            });
        }

        console.log('\n' + '='.repeat(60));
        console.log('ANALYSIS COMPLETE');
        console.log('='.repeat(60));

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

checkRawMaterials();
