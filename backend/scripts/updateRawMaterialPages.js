/**
 * Script to update all Raw Material category pages with Height field
 * Updates: LaminatePage, HBDPage, HardwarePage, GlassPage, FabricPage, AluminumPage, HandlesPage, ProcessedPanelPage
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

function updatePage(filename) {
    const filePath = path.join(pagesDir, filename);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filename}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Update formData state - add height field
    if (content.includes("status: 'ACTIVE',\n  });") && !content.includes("height: '',")) {
        content = content.replace(
            /(costPrice: '',)\s*\n(\s*status: 'ACTIVE',)/,
            "$1\n    height: '',\n$2"
        );
        modified = true;
        console.log(`  ✓ Added height to formData state`);
    }

    // 2. Update handleEdit - add height field
    if (content.includes('costPrice: material.costPrice,') && !content.includes('height: material.specifications?.height')) {
        content = content.replace(
            /(costPrice: material\.costPrice,)\s*\n(\s*status: material\.status,)/,
            "$1\n      height: material.specifications?.height || '',\n$2"
        );
        modified = true;
        console.log(`  ✓ Added height to handleEdit`);
    }

    // 3. Update resetForm - add height field
    if (content.match(/setFormData\(\{ name: '', currentStock: '', uom:.*?costPrice: ''.*?status: 'ACTIVE' \}\);/) && !content.includes("costPrice: '', height: ''")) {
        content = content.replace(
            /(costPrice: ''),(\s*status: 'ACTIVE')/,
            "$1, height: '',$2"
        );
        modified = true;
        console.log(`  ✓ Added height to resetForm`);
    }

    // 4. Update handleSubmit - use explicit object with specifications
    if (content.includes('const materialData = { ...formData, category:') && !content.includes('specifications: {')) {
        const categoryMatch = content.match(/category: '([A-Z_]+)'/);
        if (categoryMatch) {
            const category = categoryMatch[1];
            const replacement = `const materialData = { 
        name: formData.name,
        currentStock: formData.currentStock,
        uom: formData.uom,
        costPrice: formData.costPrice,
        status: formData.status,
        category: '${category}',
        specifications: {
          height: formData.height
        }
      };`;

            content = content.replace(
                /const materialData = \{ \.\.\.formData, category: '[A-Z_]+' \};/,
                replacement
            );
            modified = true;
            console.log(`  ✓ Updated handleSubmit with specifications`);
        }
    }

    // 5. Add Height input field in form (after Price input)
    if (content.includes('<Input\n                label="Price"') && !content.includes('label="Height"')) {
        content = content.replace(
            /(<Input\s+label="Price"[\s\S]*?required\s*\/>\s*\n)/,
            `$1              <Input
                label="Height"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                placeholder="e.g., 750, 900, 1050"
              />
`
        );
        modified = true;
        console.log(`  ✓ Added Height input field`);
    }

    // 6. Add Height column in table header
    if (content.includes('<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>')
        && !content.includes('uppercase">Height</th>')) {
        content = content.replace(
            /(<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price<\/th>\s*\n)/,
            `$1                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Height</th>
`
        );
        modified = true;
        console.log(`  ✓ Added Height column in table header`);
    }

    // 7. Add Height data in table body
    if (content.includes('<td className="px-6 py-4 text-sm text-gray-500">₹{material.costPrice}</td>')
        && !content.includes('material.specifications?.height')) {
        content = content.replace(
            /(<td className="px-6 py-4 text-sm text-gray-500">₹\{material\.costPrice\}<\/td>\s*\n)/,
            `$1                  <td className="px-6 py-4 text-sm text-gray-500">{material.specifications?.height || '-'}</td>
`
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

console.log('🚀 Starting Raw Material Pages Update...\n');

pagesToUpdate.forEach(filename => {
    console.log(`📄 Processing: ${filename}`);
    try {
        updatePage(filename);
    } catch (error) {
        console.error(`❌ Error updating ${filename}:`, error.message);
    }
});

console.log('✨ Update complete!');
