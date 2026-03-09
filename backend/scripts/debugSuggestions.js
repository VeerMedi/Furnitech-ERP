require('dotenv').config();
const mongoose = require('mongoose');

async function debugSuggestions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const InventorySuggestion = require('../models/vlite/InventorySuggestion');
        const TENANT_ID = '6935417d57433de522df0bbe';

        // Check ALL suggestions
        const allSuggestions = await InventorySuggestion.find({
            organizationId: TENANT_ID
        }).sort({ createdAt: -1 });

        console.log('ALL SUGGESTIONS:', allSuggestions.length);
        allSuggestions.forEach(s => {
            console.log(`\n- ${s.materialName} (${s.materialCode})`);
            console.log(`  Status: ${s.status}`);
            console.log(`  Priority: ${s.priority}`);
            console.log(`  Created: ${s.createdAt}`);
            console.log(`  Expires: ${s.expiresAt}`);
            console.log(`  Message: ${s.message}`);
        });

        // Delete all suggestions to start fresh
        console.log('\n\nDeleting all suggestions...');
        const deleteResult = await InventorySuggestion.deleteMany({ organizationId: TENANT_ID });
        console.log(`Deleted ${deleteResult.deletedCount} suggestions`);

        // Now trigger monitoring
        console.log('\nTriggering stock monitoring...');
        const inventoryMonitoringService = require('../services/inventoryMonitoringService');
        const result = await inventoryMonitoringService.checkOrganization(TENANT_ID);
        console.log(`Created ${result} new suggestions`);

        // Check again
        const newSuggestions = await InventorySuggestion.find({
            organizationId: TENANT_ID,
            status: 'pending'
        });

        console.log('\nNEW PENDING SUGGESTIONS:', newSuggestions.length);
        newSuggestions.forEach(s => {
            console.log(`- ${s.materialName}: ${s.priority} - ${s.message}`);
        });

        await mongoose.disconnect();
        console.log('\nDone!');
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
    }
}

debugSuggestions();
