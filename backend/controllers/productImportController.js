const Product = require('../models/vlite/Product');
const xlsx = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

/**
 * Helper function to normalize column names (case-insensitive matching)
 */
const normalizeColumnName = (str) => {
    return str?.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
};

/**
 * Helper function to find column value by possible names
 */
const findColumnValue = (row, possibleNames) => {
    for (const name of possibleNames) {
        const normalized = normalizeColumnName(name);
        for (const key in row) {
            if (normalizeColumnName(key) === normalized) {
                return row[key];
            }
        }
    }
    return null;
};

/**
 * Helper function to parse category
 */
const parseCategory = (value) => {
    if (!value) return 'CUSTOM';
    const val = value.toString().toUpperCase().trim().replace(/[\s-]/g, '_');

    const categoryMap = {
        'NON_SHARING_WORKSTATION': ['NON_SHARING_WORKSTATION', 'NONSHARING_WORKSTATION', 'NON SHARING WORKSTATION'],
        'SHARING_WORKSTATION': ['SHARING_WORKSTATION', 'SHARINGWORKSTATION', 'SHARING WORKSTATION'],
        'NON_SHARING_PARTITION': ['NON_SHARING_PARTITION', 'NONSHARING_PARTITION', 'NON SHARING PARTITION'],
        'SHARING_PARTITION': ['SHARING_PARTITION', 'SHARINGPARTITION', 'SHARING PARTITION'],
        'FOLDING_TABLE': ['FOLDING_TABLE', 'FOLDINGTABLE', 'FOLDING TABLE'],
        'CAFE_TABLE': ['CAFE_TABLE', 'CAFETABLE', 'CAFE TABLE'],
        'CONFERENCE_TABLE': ['CONFERENCE_TABLE', 'CONFERENCETABLE', 'CONFERENCE TABLE'],
        'CABIN_TABLE': ['CABIN_TABLE', 'CABINTABLE', 'CABIN TABLE'],
        'STORAGE': ['STORAGE', 'STORAGE_UNIT', 'STORAGE UNIT'],
        'ACCESSORIES': ['ACCESSORIES', 'ACCESSORY'],
    };

    for (const [category, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(keyword => val.includes(keyword))) {
            return category;
        }
    }

    return 'CUSTOM';
};

/**
 * @desc    Import products from Excel (Intelligent Mode)
 * @route   POST /api/products/import
 * @access  Private
 */
exports.importProducts = async (req, res) => {
    try {
        console.log('=== Product Import Started ===');
        console.log('User Type:', req.userType);
        console.log('User Object:', JSON.stringify(req.user, null, 2));
        console.log('Tenant ID from header:', req.headers['x-tenant-id']);

        const organizationId = new mongoose.Types.ObjectId(req.headers['x-tenant-id']);

        // For ORG_ADMIN, use organization ID; for USER, use user._id
        // Make userId optional since ORG_ADMIN doesn't have a User document
        const userId = req.userType === 'USER' && req.user._id ? req.user._id : null;

        console.log('Organization ID:', organizationId);
        console.log('User ID for import tracking:', userId);

        if (!req.file) {
            console.error('No file uploaded in request');
            return res.status(400).json({
                success: false,
                message: 'No file uploaded',
            });
        }

        console.log('File received:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rawData = xlsx.utils.sheet_to_json(worksheet, {
            raw: false,
            defval: null
        });

        if (!rawData || rawData.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Excel file is empty or invalid',
            });
        }

        console.log(`Processing ${rawData.length} rows from Excel file`);

        // Log column names from first row to help debug
        if (rawData.length > 0) {
            const columnNames = Object.keys(rawData[0]);
            console.log('Column names found in Excel:', columnNames);
        }

        // Get category from request body (from frontend selection)
        const forcedCategory = req.body.category;
        if (forcedCategory) {
            console.log('Using forced category from UI:', forcedCategory);
        }

        const products = [];
        const errors = [];
        const batchId = uuidv4();

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];

            try {
                // Extract name (required) - can be SKU if no separate name column
                const name = findColumnValue(row, [
                    'name', 'product name', 'productname', 'item name', 'itemname', 'sku', 'product code', 'code'
                ]);

                if (!name || name.toString().trim() === '') {
                    errors.push(`Row ${i + 2}: Product name or SKU is required`);
                    continue;
                }

                // Extract category - use forced category if provided, otherwise parse from Excel
                let category;
                if (forcedCategory) {
                    category = forcedCategory;
                } else {
                    const categoryValue = findColumnValue(row, [
                        'category', 'type', 'product type', 'producttype'
                    ]);
                    category = parseCategory(categoryValue);
                }

                // Extract selling price (required)
                const sellingPriceValue = findColumnValue(row, [
                    'selling price', 'sellingprice', 'price', 'cost', 'amount'
                ]);
                const sellingPrice = sellingPriceValue ? parseFloat(sellingPriceValue.toString().replace(/[^0-9.]/g, '')) : null;

                if (!sellingPrice || isNaN(sellingPrice) || sellingPrice < 0) {
                    errors.push(`Row ${i + 2}: Valid selling price is required`);
                    continue;
                }

                // Extract optional fields
                const productCode = findColumnValue(row, ['product code', 'productcode', 'code', 'sku']);
                const subCategory = findColumnValue(row, ['sub category', 'subcategory', 'sub type']);
                const description = findColumnValue(row, ['description', 'desc', 'details']);

                // Extract dimensions
                // Note: LENGTH is same as WIDTH in furniture context
                const length = findColumnValue(row, ['length', 'length mm', 'lengthmm', 'length(mm)']);
                const width = findColumnValue(row, ['width', 'width mm', 'widthmm', 'width(mm)']);
                const height = findColumnValue(row, ['height', 'height mm', 'heightmm', 'height(mm)']);
                const depth = findColumnValue(row, ['depth', 'depth mm', 'depthmm', 'depth(mm)']);

                // Extract specifications
                const material = findColumnValue(row, ['material', 'materials']);
                const finish = findColumnValue(row, ['finish', 'finishing']);
                const color = findColumnValue(row, ['color', 'colour']);
                const seats = findColumnValue(row, ['seats', 'seating', 'capacity', 'seating capacity']);
                const type = findColumnValue(row, ['type', 'product type', 'style']);

                // Extract status
                const statusValue = findColumnValue(row, ['status', 'state']);
                const status = statusValue && statusValue.toString().toUpperCase().includes('DISCONTINUED')
                    ? 'DISCONTINUED'
                    : 'ACTIVE';

                // Build product object
                // Prepare import batch info
                const importBatch = {
                    batchId,
                    importedAt: new Date(),
                };

                // Only include importedBy if userId exists AND is a valid ObjectId
                if (userId && mongoose.Types.ObjectId.isValid(userId)) {
                    importBatch.importedBy = userId;
                }

                // Build product object
                const product = {
                    organizationId,
                    name: name.toString().trim(),
                    category,
                    pricing: {
                        sellingPrice,
                        currency: 'INR'
                    },
                    status,
                    importBatch
                };

                // Add optional fields
                // Use SKU from Excel as productCode if available
                // If not provided, pre-save hook will auto-generate unique code
                if (productCode && productCode.toString().trim()) {
                    product.productCode = productCode.toString().trim();
                }
                if (subCategory) product.subCategory = subCategory.toString().trim();
                if (description) product.description = description.toString().trim();

                // Add specifications
                product.specifications = {};

                // Add dimensions correctly:
                // Excel: LENGTH(MM) → DB: dimensions.width (shown as LENGTH in table)
                // Excel: WIDTH(MM) → DB: dimensions.depth (shown as WIDTH in table)  
                // Excel: HEIGHT(MM) → DB: dimensions.height
                if (length || width || height || depth) {
                    product.specifications.dimensions = {
                        unit: 'MM'
                    };
                    // LENGTH from Excel → width field (this displays as LENGTH in frontend)
                    if (length) product.specifications.dimensions.width = parseFloat(length);
                    // WIDTH from Excel → depth field (this displays as WIDTH in frontend)
                    if (width) product.specifications.dimensions.depth = parseFloat(width);
                    // HEIGHT from Excel → height field
                    if (height) product.specifications.dimensions.height = parseFloat(height);
                    // If separate depth column exists, use it
                    if (depth && !width) product.specifications.dimensions.depth = parseFloat(depth);
                }

                if (material) product.specifications.material = material.toString().trim();
                if (finish) product.specifications.finish = finish.toString().trim();
                if (color) product.specifications.color = color.toString().trim();

                // Parse SEATS as integer, handle any value
                if (seats !== null && seats !== undefined && seats !== '') {
                    const parsedSeats = parseInt(seats);
                    if (!isNaN(parsedSeats)) {
                        product.specifications.seats = parsedSeats;
                    }
                }

                // Parse TYPE as string, handle any value
                if (type !== null && type !== undefined && type !== '') {
                    product.specifications.type = type.toString().trim();
                }

                products.push(product);
            } catch (error) {
                errors.push(`Row ${i + 2}: ${error.message}`);
                console.error(`Error processing row ${i + 2}:`, error);
            }
        }

        if (products.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid products found in Excel file',
                errors,
            });
        }

        //Insert products into database
        const insertedProducts = [];
        const insertErrors = [];

        // Get last product code to determine starting point
        const lastProduct = await Product.findOne(
            { organizationId },
            { productCode: 1 }
        ).sort({ createdAt: -1, productCode: -1 });

        let nextNum = 1;
        if (lastProduct && lastProduct.productCode) {
            const match = lastProduct.productCode.match(/^PRD(\d+)$/);
            if (match) {
                nextNum = parseInt(match[1], 10) + 1;
            }
        }

        console.log(`Starting import with Product Code sequence: PRD${String(nextNum).padStart(6, '0')}`);

        for (let i = 0; i < products.length; i++) {
            try {
                // Manually set product code if not present
                if (!products[i].productCode) {
                    products[i].productCode = `PRD${String(nextNum).padStart(6, '0')}`;
                    nextNum++;
                }

                const product = new Product(products[i]);
                await product.save();
                console.log(`✅ SAVED Product: ${product._id} | Code: ${product.productCode} | Org: ${product.organizationId}`);
                insertedProducts.push(product);
            } catch (error) {
                console.error(`❌ Error inserting product ${products[i].name}:`, {
                    message: error.message,
                    name: error.name,
                    code: error.code,
                    errors: error.errors
                });

                // Log validation errors in detail
                if (error.errors) {
                    console.error('Validation errors:');
                    Object.keys(error.errors).forEach(key => {
                        console.error(`  - ${key}: ${error.errors[key].message}`);
                    });
                }

                insertErrors.push({
                    product: products[i].name,
                    error: error.message,
                });
            }
        }

        console.log(`Successfully imported ${insertedProducts.length} products out of ${products.length}`);

        res.status(200).json({
            success: true,
            message: `Successfully imported ${insertedProducts.length} products`,
            data: {
                batchId,
                totalRows: rawData.length,
                validRows: products.length,
                imported: insertedProducts.length,
                failed: insertErrors.length,
            },
            errors: [...errors, ...insertErrors.map(e => `${e.product}: ${e.error}`)],
        });
    } catch (error) {
        console.error('=== ERROR IMPORTING PRODUCTS ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        if (error.errors) {
            console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
        }
        res.status(500).json({
            success: false,
            message: 'Error importing products from Excel file',
            error: error.message,
        });
    }
};

/**
 * @desc    Get last import information
 * @route   GET /api/products/last-import
 * @access  Private
 */
exports.getLastImport = async (req, res) => {
    try {
        const organizationId = new mongoose.Types.ObjectId(req.headers['x-tenant-id']);

        // Find the most recent import batch
        const lastImportProduct = await Product.findOne({
            organizationId,
            'importBatch.batchId': { $exists: true }
        })
            .sort({ 'importBatch.importedAt': -1 })
            .select('importBatch')
            .lean();

        if (!lastImportProduct || !lastImportProduct.importBatch) {
            return res.status(404).json({
                success: false,
                message: 'No import history found',
            });
        }

        const batchId = lastImportProduct.importBatch.batchId;

        // Count products in this batch
        const count = await Product.countDocuments({
            organizationId,
            'importBatch.batchId': batchId
        });

        res.status(200).json({
            success: true,
            data: {
                batchId,
                count,
                importedAt: lastImportProduct.importBatch.importedAt,
                importedBy: lastImportProduct.importBatch.importedBy,
            },
        });
    } catch (error) {
        console.error('Error fetching last import:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching last import information',
            error: error.message,
        });
    }
};

/**
 * @desc    Undo last import
 * @route   DELETE /api/products/undo-last-import
 * @access  Private
 */
exports.undoLastImport = async (req, res) => {
    try {
        const organizationId = new mongoose.Types.ObjectId(req.headers['x-tenant-id']);

        // Find the most recent import batch
        const lastImportProduct = await Product.findOne({
            organizationId,
            'importBatch.batchId': { $exists: true }
        })
            .sort({ 'importBatch.importedAt': -1 })
            .select('importBatch')
            .lean();

        if (!lastImportProduct || !lastImportProduct.importBatch) {
            return res.status(404).json({
                success: false,
                message: 'No import history found',
            });
        }

        const batchId = lastImportProduct.importBatch.batchId;

        // Delete all products from this batch
        const result = await Product.deleteMany({
            organizationId,
            'importBatch.batchId': batchId
        });

        res.status(200).json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} products from last import`,
            data: {
                deletedCount: result.deletedCount,
                batchId,
            },
        });
    } catch (error) {
        console.error('Error undoing last import:', error);
        res.status(500).json({
            success: false,
            message: 'Error undoing last import',
            error: error.message,
        });
    }
};

/**
 * @desc    Download Excel template
 * @route   GET /api/products/download-template
 * @access  Private
 */
exports.downloadTemplate = async (req, res) => {
    try {
        const { category } = req.query; // Get category from query params

        // Category-specific example data
        const categoryExamples = {
            'NON_SHARING_WORKSTATION': {
                'Name': 'Executive Workstation Single',
                'Sub Category': 'Premium Series',
                'Selling Price': '25000',
                'LENGTH (MM)': '1800',
                'WIDTH (MM)': '900',
                'HEIGHT (MM)': '750',
                'MATERIAL': 'Engineered Wood',
                'SEATS': '1',
                'TYPE': 'Executive',
                'Finish': 'Laminate',
                'Color': 'Walnut Brown',
                'Description': 'Premium single-seater executive workstation'
            },
            'SHARING_WORKSTATION': {
                'Name': '4-Seater Sharing Workstation',
                'Sub Category': 'Team Series',
                'Selling Price': '65000',
                'LENGTH (MM)': '2400',
                'WIDTH (MM)': '1200',
                'HEIGHT (MM)': '750',
                'MATERIAL': 'Laminated MDF',
                'SEATS': '4',
                'TYPE': 'Team',
                'Finish': 'Laminate',
                'Color': 'White',
                'Description': '4-seater team workstation'
            },
            'NON_SHARING_PARTITION': {
                'Name': 'Executive Partition Panel',
                'Sub Category': 'Privacy Series',
                'Selling Price': '8000',
                'LENGTH (MM)': '1200',
                'WIDTH (MM)': '50',
                'HEIGHT (MM)': '1500',
                'MATERIAL': 'Fabric Panel',
                'TYPE': 'Full Height',
                'Finish': 'Fabric',
                'Color': 'Grey',
                'Description': 'Full height privacy partition'
            },
            'SHARING_PARTITION': {
                'Name': 'Team Divider Partition',
                'Sub Category': 'Shared Space',
                'Selling Price': '12000',
                'LENGTH (MM)': '2400',
                'WIDTH (MM)': '50',
                'HEIGHT (MM)': '1200',
                'MATERIAL': 'Glass Panel',
                'TYPE': 'Half Height',
                'Finish': 'Tempered Glass',
                'Color': 'Transparent',
                'Description': 'Half height glass partition for shared spaces'
            },
            'FOLDING_TABLE': {
                'Name': 'Folding Training Table',
                'Sub Category': 'Training Series',
                'Selling Price': '6500',
                'LENGTH (MM)': '1800',
                'WIDTH (MM)': '600',
                'HEIGHT (MM)': '750',
                'MATERIAL': 'Plywood',
                'SEATS': '2',
                'TYPE': 'Foldable',
                'Finish': 'Laminate',
                'Color': 'Beech Wood',
                'Description': 'Mobile folding table with wheels'
            },
            'CAFE_TABLE': {
                'Name': 'Round Café Table',
                'Sub Category': 'Cafeteria',
                'Selling Price': '4500',
                'LENGTH (MM)': '900',
                'WIDTH (MM)': '900',
                'HEIGHT (MM)': '750',
                'MATERIAL': 'Solid Wood',
                'SEATS': '4',
                'TYPE': 'Round',
                'Finish': 'Polish',
                'Color': 'Natural Wood',
                'Description': 'Round café table for 4 people'
            },
            'CONFERENCE_TABLE': {
                'Name': 'Conference Table - 12 Seater',
                'Sub Category': 'Meeting Room',
                'Selling Price': '85000',
                'LENGTH (MM)': '4200',
                'WIDTH (MM)': '1500',
                'HEIGHT (MM)': '750',
                'MATERIAL': 'Solid Wood',
                'SEATS': '12',
                'TYPE': 'Boardroom',
                'Finish': 'Veneer',
                'Color': 'Dark Walnut',
                'Description': 'Large boardroom conference table'
            },
            'CABIN_TABLE': {
                'Name': 'Executive Cabin Table',
                'Sub Category': 'Executive',
                'Selling Price': '35000',
                'LENGTH (MM)': '1800',
                'WIDTH (MM)': '900',
                'HEIGHT (MM)': '750',
                'MATERIAL': 'Solid Wood',
                'SEATS': '1',
                'TYPE': 'Executive',
                'Finish': 'Veneer',
                'Color': 'Cherry Wood',
                'Description': 'Premium executive cabin table'
            },
            'STORAGE': {
                'Name': 'Mobile Pedestal 3-Drawer',
                'Sub Category': 'Under Desk Storage',
                'Selling Price': '5500',
                'LENGTH (MM)': '450',
                'WIDTH (MM)': '500',
                'HEIGHT (MM)': '600',
                'MATERIAL': 'Steel',
                'Capacity': '3 Drawers',
                'TYPE': 'Mobile',
                'Finish': 'Powder Coated',
                'Color': 'Grey',
                'Description': 'Mobile pedestal with 3 drawers'
            },
            'ACCESSORIES': {
                'Name': 'Monitor Arm',
                'Sub Category': 'Desk Accessories',
                'Selling Price': '2500',
                'LENGTH (MM)': '500',
                'WIDTH (MM)': '150',
                'HEIGHT (MM)': '450',
                'MATERIAL': 'Aluminum',
                'TYPE': 'Adjustable',
                'Finish': 'Anodized',
                'Color': 'Black',
                'Description': 'Adjustable monitor arm with gas spring'
            }
        };

        // If category specified, use category-specific example, otherwise use generic
        let templateData = [];

        if (category && categoryExamples[category]) {
            // Single category template with 2 examples
            const example = { ...categoryExamples[category], Category: category, Status: 'ACTIVE' };
            templateData = [
                example,
                { ...example, Name: example.Name + ' - Variant 2', 'Selling Price': parseInt(example['Selling Price']) + 5000 }
            ];
        } else {
            // All categories template with one example per category
            templateData = Object.keys(categoryExamples).map(cat => ({
                ...categoryExamples[cat],
                Category: cat,
                Status: 'ACTIVE'
            }));
        }

        // Create workbook
        const worksheet = xlsx.utils.json_to_sheet(templateData);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Products');

        // Generate buffer
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set headers with category name if specified
        const filename = category
            ? `Product_Template_${category}.xlsx`
            : 'Product_Import_Template_All_Categories.xlsx';

        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        res.send(buffer);
    } catch (error) {
        console.error('Error generating template:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating template',
            error: error.message,
        });
    }
};


/**
 * @desc    Export selected products as Excel template
 * @route   POST /api/products/export-template
 * @access  Private
 */
exports.exportSelectedProducts = async (req, res) => {
    try {
        const organizationId = new mongoose.Types.ObjectId(req.headers['x-tenant-id']);
        const { productIds } = req.body;

        // Validate productIds
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of product IDs',
            });
        }

        console.log(`Exporting ${productIds.length} products as Excel template`);

        // Fetch products by IDs and organizationId
        const products = await Product.find({
            _id: { $in: productIds.map(id => new mongoose.Types.ObjectId(id)) },
            organizationId
        }).lean();

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No products found with the provided IDs',
            });
        }

        console.log(`Found ${products.length} products to export`);

        // Define category-specific columns
        const categoryColumns = {
            'NON_SHARING_WORKSTATION': ['SKU', 'Name', 'Category', 'Sub Category', 'LENGTH (MM)', 'WIDTH (MM)', 'HEIGHT (MM)', 'MATERIAL', 'SEATS', 'TYPE', 'Finish', 'Color', 'Selling Price', 'Description', 'Status'],
            'SHARING_WORKSTATION': ['SKU', 'Name', 'Category', 'Sub Category', 'LENGTH (MM)', 'WIDTH (MM)', 'HEIGHT (MM)', 'MATERIAL', 'SEATS', 'TYPE', 'Finish', 'Color', 'Selling Price', 'Description', 'Status'],
            'NON_SHARING_PARTITION': ['SKU', 'Name', 'Category', 'Sub Category', 'LENGTH (MM)', 'WIDTH (MM)', 'HEIGHT (MM)', 'MATERIAL', 'TYPE', 'Finish', 'Color', 'Selling Price', 'Description', 'Status'],
            'SHARING_PARTITION': ['SKU', 'Name', 'Category', 'Sub Category', 'LENGTH (MM)', 'WIDTH (MM)', 'HEIGHT (MM)', 'MATERIAL', 'TYPE', 'Finish', 'Color', 'Selling Price', 'Description', 'Status'],
            'FOLDING_TABLE': ['SKU', 'Name', 'Category', 'Sub Category', 'LENGTH (MM)', 'WIDTH (MM)', 'HEIGHT (MM)', 'MATERIAL', 'SEATS', 'TYPE', 'Finish', 'Color', 'Selling Price', 'Description', 'Status'],
            'CAFE_TABLE': ['SKU', 'Name', 'Category', 'Sub Category', 'LENGTH (MM)', 'WIDTH (MM)', 'HEIGHT (MM)', 'MATERIAL', 'SEATS', 'TYPE', 'Finish', 'Color', 'Selling Price', 'Description', 'Status'],
            'CONFERENCE_TABLE': ['SKU', 'Name', 'Category', 'Sub Category', 'LENGTH (MM)', 'WIDTH (MM)', 'HEIGHT (MM)', 'MATERIAL', 'SEATS', 'TYPE', 'Finish', 'Color', 'Selling Price', 'Description', 'Status'],
            'CABIN_TABLE': ['SKU', 'Name', 'Category', 'Sub Category', 'LENGTH (MM)', 'WIDTH (MM)', 'HEIGHT (MM)', 'MATERIAL', 'SEATS', 'TYPE', 'Finish', 'Color', 'Selling Price', 'Description', 'Status'],
            'STORAGE': ['SKU', 'Name', 'Category', 'Sub Category', 'LENGTH (MM)', 'WIDTH (MM)', 'HEIGHT (MM)', 'MATERIAL', 'Capacity', 'TYPE', 'Finish', 'Color', 'Selling Price', 'Description', 'Status'],
            'ACCESSORIES': ['SKU', 'Name', 'Category', 'Sub Category', 'LENGTH (MM)', 'WIDTH (MM)', 'HEIGHT (MM)', 'MATERIAL', 'TYPE', 'Finish', 'Color', 'Selling Price', 'Description', 'Status'],
        };

        // Group products by category
        const productsByCategory = products.reduce((acc, product) => {
            const category = product.category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(product);
            return acc;
        }, {});

        // Create a workbook with separate sheets for each category
        const workbook = xlsx.utils.book_new();

        Object.keys(productsByCategory).forEach(category => {
            const categoryProducts = productsByCategory[category];
            const columns = categoryColumns[category] || categoryColumns['NON_SHARING_WORKSTATION']; // fallback to default

            // Transform products to Excel format with only relevant columns
            const excelData = categoryProducts.map(product => {
                const rowData = {};

                columns.forEach(column => {
                    switch (column) {
                        case 'SKU':
                            rowData[column] = product.sku || product.productCode || '';
                            break;
                        case 'Name':
                            rowData[column] = product.name || '';
                            break;
                        case 'Category':
                            rowData[column] = product.category || '';
                            break;
                        case 'Sub Category':
                            rowData[column] = product.subCategory || '';
                            break;
                        case 'Selling Price':
                            rowData[column] = product.pricing?.sellingPrice || 0;
                            break;
                        case 'LENGTH (MM)':
                            rowData[column] = product.specifications?.dimensions?.width || '';
                            break;
                        case 'WIDTH (MM)':
                            rowData[column] = product.specifications?.dimensions?.depth || '';
                            break;
                        case 'HEIGHT (MM)':
                            rowData[column] = product.specifications?.dimensions?.height || '';
                            break;
                        case 'MATERIAL':
                            rowData[column] = product.specifications?.material || '';
                            break;
                        case 'SEATS':
                            rowData[column] = product.specifications?.seats || '';
                            break;
                        case 'TYPE':
                            rowData[column] = product.specifications?.type || '';
                            break;
                        case 'Finish':
                            rowData[column] = product.specifications?.finish || '';
                            break;
                        case 'Color':
                            rowData[column] = product.specifications?.color || '';
                            break;
                        case 'Capacity':
                            rowData[column] = product.specifications?.capacity || '';
                            break;
                        case 'Description':
                            rowData[column] = product.description || '';
                            break;
                        case 'Status':
                            rowData[column] = product.status || 'ACTIVE';
                            break;
                        default:
                            rowData[column] = '';
                    }
                });

                return rowData;
            });

            // Create worksheet for this category
            const worksheet = xlsx.utils.json_to_sheet(excelData, { header: columns });

            // Format category name for sheet name (max 31 chars for Excel)
            const sheetName = category.replace(/_/g, ' ').substring(0, 31);
            xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
        });

        // Generate buffer
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set headers with timestamp in filename
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `Products_Export_${timestamp}.xlsx`;

        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        res.send(buffer);
    } catch (error) {
        console.error('Error exporting products:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting products',
            error: error.message,
        });
    }
};

