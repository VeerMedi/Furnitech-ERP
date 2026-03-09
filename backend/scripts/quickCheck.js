require('dotenv').config();
const mongoose = require('mongoose');

async function checkStatus() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const RawMaterial = require('../models/vlite/RawMaterial');
        const InventorySuggestion = require('../models/vlite/InventorySuggestion');
        const TENANT_ID = '6935417d57433de522df0bbe';

        // Check materials
        const lowStock = await RawMaterial.find({
            organizationId: TENANT_ID,
            $expr: { $lte: ['$currentStock', '$reorderPoint'] }
        });

        console.log('LOW STOCK MATERIALS:', lowStock.length);
        lowStock.forEach(m => {
            console.log(`- ${m.name}: ${m.currentStock}/${m.reorderPoint}`);
        });

        // Check suggestions
        const suggestions = await InventorySuggestion.find({
            organizationId: TENANT_ID,
            status: 'pending'
        });

        console.log('\nPENDING SUGGESTIONS:', suggestions.length);
        suggestions.forEach(s => {
            console.log(`- ${s.materialName}: ${s.priority} - ${s.message}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkStatus();
