const fs = require('fs');
const path = require('path');

console.log('🔍 Checking all JSON files in scan_results...\n');

const scanResultsDir = __dirname;
const files = fs.readdirSync(scanResultsDir);

let totalFixed = 0;
let alreadyCorrect = 0;
let errors = 0;

// Function to convert array JSON to proper wrapped structure
function convertArrayToWrapped(arrayData, originalFilename) {
  const totalItems = arrayData.length;
  const totalQuantity = arrayData.reduce((sum, item) => sum + (item.count || 0), 0);

  const pdfName = originalFilename.replace('.json', '.pdf').replace('_result.json', '.pdf');

  return {
    file_name: pdfName,
    pages: [{
      page_number: 1,
      analysis: {
        success: true,
        data: {
          items: arrayData,
          summary: {
            total_items: totalItems,
            total_quantity: totalQuantity,
            total_pages_scanned: 1
          },
          metadata: {
            file_name: pdfName,
            total_pages: 1,
            scan_timestamp: new Date().toISOString()
          }
        }
      }
    }]
  };
}

files.forEach(file => {
  // Skip non-JSON files and backups
  if (!file.endsWith('.json') || file.includes('.backup') || file === 'convert_all.js') {
    return;
  }

  const filePath = path.join(scanResultsDir, file);

  try {
    console.log(`📄 Checking: ${file}`);

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let needsRename = false;
    let needsConvert = false;
    let newFilename = file;

    // Check 1: Filename must end with _result.json
    if (!file.endsWith('_result.json')) {
      needsRename = true;
      newFilename = file.replace('.json', '_result.json');
      console.log(`   ⚠️  Needs rename: ${file} → ${newFilename}`);
    }

    // Check 2: Structure must have 'pages' array
    if (Array.isArray(data)) {
      // Wrong format - it's an array
      needsConvert = true;
      console.log(`   ⚠️  Wrong format: Array detected, needs conversion`);
    } else if (!data.pages || !Array.isArray(data.pages)) {
      // Also wrong format
      needsConvert = true;
      console.log(`   ⚠️  Wrong format: Missing pages array`);
    }

    // Fix the file
    if (needsConvert || needsRename) {
      let finalData = data;

      // Convert if needed
      if (needsConvert) {
        if (Array.isArray(data)) {
          finalData = convertArrayToWrapped(data, file);
          console.log(`   🔧 Converting array to wrapped structure...`);
        }
      }

      // Create backup
      const backupPath = filePath + '.backup';
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(filePath, backupPath);
        console.log(`   💾 Backup created: ${file}.backup`);
      }

      // Write fixed data
      fs.writeFileSync(filePath, JSON.stringify(finalData, null, 2));

      // Rename if needed
      if (needsRename) {
        const newFilePath = path.join(scanResultsDir, newFilename);
        fs.renameSync(filePath, newFilePath);
        console.log(`   ✅ Renamed to: ${newFilename}`);

        // Also rename backup
        if (fs.existsSync(backupPath)) {
          fs.renameSync(backupPath, newFilePath + '.backup');
        }
      } else {
        console.log(`   ✅ Fixed: ${file}`);
      }

      if (needsConvert) {
        const items = finalData.pages[0].analysis.data.summary.total_items;
        const quantity = finalData.pages[0].analysis.data.summary.total_quantity;
        console.log(`   📊 Items: ${items}, Total Quantity: ${quantity}`);
      }

      totalFixed++;
    } else {
      console.log(`   ✅ Already correct format`);
      alreadyCorrect++;
    }

    console.log('');

  } catch (error) {
    console.error(`   ❌ Error processing ${file}:`, error.message);
    console.log('');
    errors++;
  }
});

console.log('\n' + '='.repeat(60));
console.log('📊 Summary:');
console.log(`   ✅ Already correct: ${alreadyCorrect}`);
console.log(`   🔧 Fixed: ${totalFixed}`);
console.log(`   ❌ Errors: ${errors}`);
console.log('='.repeat(60) + '\n');

if (totalFixed > 0) {
  console.log('✨ All JSON files are now in correct format!');
  console.log('📝 Original files backed up with .backup extension\n');
}
