/**
 * Script to properly fix all Raw Material category pages with Height field
 * This fixes the remaining issues from the first attempt
 */

const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '../../frontend-org/src/pages/rawMaterial');

const pagesToUpdate = [
    'LaminatePage.jsx',
    'HBDPage.jsx',
    'HardwarePage.jsx',
    'GlassPage.jsx',
    'FabricPage.jsx',
    'AluminumPage.jsx',
    'HandlesPage.jsx',
    'ProcessedPanelPage.jsx'
];

function fixPage(filename) {
    const filePath = path.join(pagesDir, filename);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filename}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix 1: Fix formData state - ensure height is on separate line
    if (content.includes("costPrice: '', height: '',")) {
        content = content.replace(
            /costPrice: '', height: '',/,
            "costPrice: '',\n    height: '',"
        );
        modified = true;
        console.log(`  ✓ Fixed formData state formatting`);
    } else if (content.includes("costPrice: '',") && !content.includes("height: '',")) {
        content = content.replace(
            /(costPrice: '',)\s*\n(\s*status: 'ACTIVE',)/,
            "$1\n    height: '',\n$2"
        );
        modified = true;
        console.log(`  ✓ Added height to formData state`);
    }

    // Fix 2: Fix resetForm - ensure height field is included
    if (content.match(/setFormData\(\{ name: '', currentStock: '', uom:.*?costPrice: ''.*?status: 'ACTIVE' \}\);/)
        && !content.match(/setFormData\(\{.*?height: ''.*?\}\);/)) {
        content = content.replace(
            /setFormData\(\{ name: '', currentStock: '', uom: '.*?', costPrice: '', status: 'ACTIVE' \}\);/,
            (match) => {
                const uom = match.match(/uom: '([A-Z]+)'/)[1];
                return `setFormData({ name: '', currentStock: '', uom: '${uom}', costPrice: '', height: '', status: 'ACTIVE' });`;
            }
        );
        modified = true;
        console.log(`  ✓ Fixed resetForm with height`);
    }

    // Fix 3: Add Height input field in form (after Price input, before Status div)
    const heightInputPattern = /<Input\s+label="Height"/;
    if (!heightInputPattern.test(content)) {
        content = content.replace(
            /(<Input\s+label="Price"[\s\S]*?required\s*\/>\s*\n)(\s*)(<div>\s*\n\s*<label className="block text-sm font-medium text-gray-700 mb-1">Status<\/label>)/,
            `$1$2<Input
$2  label="Height"
$2  value={formData.height}
$2  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
$2  placeholder="e.g., 750, 900, 1050"
$2/>
$2$3`
        );
        modified = true;
        console.log(`  ✓ Added Height input field in form`);
    }

    // Fix 4: Add Height data in table body (after Price, before Status)
    const heightColumnPattern = /<td className="px-6 py-4 text-sm text-gray-500">\{material\.specifications\?\.height/;
    if (!heightColumnPattern.test(content)) {
        content = content.replace(
            /(<td className="px-6 py-4 text-sm text-gray-500">₹\{material\.costPrice\}<\/td>\s*\n)(\s*)(<td className="px-6 py-4 text-sm">\s*\n\s*<span)/,
            `$1$2<td className="px-6 py-4 text-sm text-gray-500">{material.specifications?.height || '-'}</td>
$2$3`
        );
        modified = true;
        console.log(`  ✓ Added Height data in table body`);
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated: ${filename}\n`);
    } else {
        console.log(`ℹ️  No changes needed: ${filename}\n`);
    }
}

console.log('🚀 Starting Raw Material Pages Fix...\n');

pagesToUpdate.forEach(filename => {
    console.log(`📄 Processing: ${filename}`);
    try {
        fixPage(filename);
    } catch (error) {
        console.error(`❌ Error fixing ${filename}:`, error.message);
    }
});

console.log('✨ Fix complete!');
