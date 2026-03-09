const fs = require('fs');
const path = require('path');

// Function to convert array JSON to proper wrapped structure
function convertArrayToWrapped(arrayData, filename) {
  const totalItems = arrayData.length;
  const totalQuantity = arrayData.reduce((sum, item) => sum + (item.count || 0), 0);

  const pdfName = filename.replace('_result.json', '.pdf');

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

// Get filename from command line argument
const filename = process.argv[2];
if (!filename) {
  console.error('Usage: node convert_json.js <filename>');
  process.exit(1);
}

try {
  // Read the file
  const data = JSON.parse(fs.readFileSync(filename, 'utf8'));

  // Check if it's already in correct format
  if (data.pages && Array.isArray(data.pages)) {
    console.log(`✅ ${filename} is already in correct format`);
    process.exit(0);
  }

  // Check if it's an array (wrong format)
  if (!Array.isArray(data)) {
    console.error(`❌ Unknown format for ${filename}`);
    process.exit(1);
  }

  // Convert to proper structure
  const basename = path.basename(filename);
  const wrapped = convertArrayToWrapped(data, basename);

  // Backup original file
  const backupPath = filename + '.backup';
  fs.copyFileSync(filename, backupPath);
  console.log(`📄 Created backup: ${backupPath}`);

  // Write converted file
  fs.writeFileSync(filename, JSON.stringify(wrapped, null, 2));

  console.log(`✅ Converted ${filename}`);
  console.log(`   - Items: ${wrapped.pages[0].analysis.data.summary.total_items}`);
  console.log(`   - Total Quantity: ${wrapped.pages[0].analysis.data.summary.total_quantity}`);

} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
