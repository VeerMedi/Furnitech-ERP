console.log('='.repeat(80));
console.log('DEBUG: Testing Bargarh_result.json matching');
console.log('='.repeat(80));

const jsonMatcher = require('./backend/utils/jsonMatcher');
const path = require('path');

const scanResultsDir = path.join(__dirname, 'AI/inventory_scanner/scan_results');

// Test different PDF names
const testNames = [
  'Bargarh.pdf',
  'bargarh.pdf',
  'Bargarh - layout (1).pdf',
  'Bargarh - Layout (1).pdf',
  'BARGARH.pdf'
];

async function test() {
  for (const pdfName of testNames) {
    console.log(`\nTesting: "${pdfName}"`);
    console.log('-'.repeat(60));

    const match = await jsonMatcher.getMostRecentMatch(pdfName, scanResultsDir);

    if (match) {
      console.log(`✅ FOUND: ${match.filename}`);

      // Try to read it
      try {
        const data = await jsonMatcher.readJsonFile(match.fullPath);
        const validation = jsonMatcher.validateScanResult(data);

        if (validation.valid) {
          const items = data.pages[0].analysis.data.summary.total_items;
          const quantity = data.pages[0].analysis.data.summary.total_quantity;
          console.log(`📊 Items: ${items}, Quantity: ${quantity}`);
        } else {
          console.log(`❌ Validation failed: ${validation.error}`);
        }
      } catch (err) {
        console.log(`❌ Read error: ${err.message}`);
      }
    } else {
      console.log('❌ NOT FOUND');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('All tests complete');
  console.log('='.repeat(80));
}

test().catch(console.error);
