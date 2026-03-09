const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';
const TENANT_ID = '677d3c5e7b0c9c001f8e4b8a'; // Vlite organization ID

// Helper to make authenticated API calls
async function apiCall(method, endpoint, data = null) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': TENANT_ID,
            },
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`Error calling ${endpoint}:`, error.response?.data || error.message);
        throw error;
    }
}

async function testAISuggestions() {
    console.log('='.repeat(60));
    console.log('AI SUGGESTIONS SYSTEM TEST');
    console.log('='.repeat(60));

    try {
        // Step 1: Check current suggestions
        console.log('\n1. Checking current suggestions...');
        const currentSuggestions = await apiCall('GET', '/inventory/suggestions');
        console.log(`   Found ${currentSuggestions.count} active suggestions`);
        if (currentSuggestions.count > 0) {
            console.log('   Suggestions:');
            currentSuggestions.data.forEach(s => {
                console.log(`   - ${s.materialName} (${s.materialCode}): ${s.currentStock} ${s.unit} (Priority: ${s.priority})`);
            });
        }

        // Step 2: Check low stock items
        console.log('\n2. Checking low stock items...');
        const lowStockItems = await apiCall('GET', '/inventory/low-stock');
        console.log(`   Found ${lowStockItems.count} low stock items`);
        if (lowStockItems.count > 0) {
            console.log('   Low stock items:');
            lowStockItems.data.slice(0, 5).forEach(item => {
                console.log(`   - ${item.name} (${item.materialCode}): ${item.currentStock} ${item.uom} (Min: ${item.minStockLevel}, Reorder: ${item.reorderPoint})`);
            });
        }

        // Step 3: Trigger manual stock check
        console.log('\n3. Triggering manual stock check...');
        const stockCheckResult = await apiCall('POST', '/inventory/check-stock');
        console.log(`   Result: ${stockCheckResult.message}`);
        console.log(`   Suggestions created: ${stockCheckResult.suggestionsCreated}`);

        // Step 4: Check suggestions again
        console.log('\n4. Checking suggestions after stock check...');
        const newSuggestions = await apiCall('GET', '/inventory/suggestions');
        console.log(`   Found ${newSuggestions.count} active suggestions`);
        if (newSuggestions.count > 0) {
            console.log('   Suggestions:');
            newSuggestions.data.forEach(s => {
                console.log(`   - ${s.materialName} (${s.materialCode}): ${s.currentStock} ${s.unit} (Priority: ${s.priority})`);
                console.log(`     Message: ${s.message}`);
            });
        } else {
            console.log('   ⚠️  No suggestions found. This means:');
            console.log('      - All raw materials have stock above their reorder point');
            console.log('      - OR raw materials don\'t have reorderPoint/minStockLevel configured');
        }

        console.log('\n' + '='.repeat(60));
        console.log('TEST COMPLETED');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testAISuggestions();
