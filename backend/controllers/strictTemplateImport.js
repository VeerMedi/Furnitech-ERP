const RawMaterial = require('../models/vlite/RawMaterial');
const logger = require('../utils/logger');
const xlsx = require('xlsx');

/**
 * STRICT TEMPLATE-BASED RAW MATERIAL IMPORT
 * 
 * Rules:
 * - Excel MUST have sheet named "Raw_Material_Import"
 * - First row MUST be headers (case-sensitive)
 * - Required headers: material_name, category, stock, unit, price, status
 * - NO column index fallback - header-based mapping ONLY
 * - Strict validation for all fields
 */

const REQUIRED_SHEET_NAME = 'Raw_Material_Import';
const REQUIRED_HEADERS = ['material_name', 'category', 'stock', 'unit', 'price', 'status'];

// Valid values for specific fields
const VALID_CATEGORIES = ['PANEL', 'LAMINATE', 'EDGEBAND', 'HARDWARE', 'GLASS', 'FABRIC', 'ALUMINIUM', 'PROCESSED_PANEL', 'HANDLES', 'OTHER'];
const VALID_STATUSES = ['Active', 'Discontinued'];

const importFromExcelStrict = async (req, res) => {
    try {
        const { organizationId } = req.user;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Read workbook
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

        // ✅ STEP 1: Validate sheet name
        if (!workbook.SheetNames.includes(REQUIRED_SHEET_NAME)) {
            logger.error(`❌ Invalid sheet name. Expected: "${REQUIRED_SHEET_NAME}", Found: ${workbook.SheetNames.join(', ')}`);
            return res.status(400).json({
                success: false,
                message: 'Invalid Excel template. Please use the standard Raw Material import template.',
                error: `Sheet "${REQUIRED_SHEET_NAME}" not found. Available sheets: ${workbook.SheetNames.join(', ')}`
            });
        }

        const worksheet = workbook.Sheets[REQUIRED_SHEET_NAME];
        const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });

        if (!rows || rows.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Excel file is empty or has no data rows'
            });
        }

        // ✅ STEP 2: Validate headers (case-sensitive)
        const headerRow = rows[0];
        const normalizedHeaders = headerRow.map(h => h.toString().trim());

        logger.info(`📋 Headers found: ${normalizedHeaders.join(', ')}`);

        // Check if ALL required headers are present
        const missingHeaders = REQUIRED_HEADERS.filter(reqHeader =>
            !normalizedHeaders.includes(reqHeader)
        );

        if (missingHeaders.length > 0) {
            logger.error(`❌ Missing required headers: ${missingHeaders.join(', ')}`);
            return res.status(400).json({
                success: false,
                message: 'Invalid Excel template. Please use the standard Raw Material import template.',
                error: `Missing required headers: ${missingHeaders.join(', ')}. Required headers (case-sensitive): ${REQUIRED_HEADERS.join(', ')}`
            });
        }

        // ✅ STEP 3: Create header index mapping
        const headerMap = {};
        REQUIRED_HEADERS.forEach(reqHeader => {
            const index = normalizedHeaders.indexOf(reqHeader);
            headerMap[reqHeader] = index;
        });

        logger.info(`✅ Header mapping: ${JSON.stringify(headerMap)}`);

        // ✅ STEP 4: Process data rows
        const dataRows = rows.slice(1); // Skip header row
        const validMaterials = [];
        const skippedRows = [];
        const errors = [];

        dataRows.forEach((row, index) => {
            const rowNumber = index + 2; // +2 because: 1-indexed + 1 header row

            // Ignore completely empty rows
            const isCompletelyEmpty = row.every(cell => !cell || cell.toString().trim() === '');
            if (isCompletelyEmpty) {
                logger.info(`ℹ️ Row ${rowNumber}: Completely empty, skipping`);
                return;
            }

            try {
                // Extract values using header mapping
                const material_name = row[headerMap['material_name']]?.toString().trim() || '';
                const category = row[headerMap['category']]?.toString().trim() || '';
                const stockStr = row[headerMap['stock']]?.toString().trim() || '';
                const unit = row[headerMap['unit']]?.toString().trim() || '';
                const priceStr = row[headerMap['price']]?.toString().trim() || '0';
                const status = row[headerMap['status']]?.toString().trim() || '';

                // ✅ VALIDATE: material_name (required, string)
                if (!material_name) {
                    skippedRows.push(rowNumber);
                    errors.push(`Row ${rowNumber}: Missing required field 'material_name'`);
                    return;
                }

                // ✅ VALIDATE: category (required, string, must be valid)
                if (!category) {
                    skippedRows.push(rowNumber);
                    errors.push(`Row ${rowNumber}: Missing required field 'category'`);
                    return;
                }
                const categoryUpper = category.toUpperCase();
                if (!VALID_CATEGORIES.includes(categoryUpper)) {
                    skippedRows.push(rowNumber);
                    errors.push(`Row ${rowNumber}: Invalid category '${category}'. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
                    return;
                }

                // ✅ VALIDATE: stock (required, number)
                if (!stockStr) {
                    skippedRows.push(rowNumber);
                    errors.push(`Row ${rowNumber}: Missing required field 'stock'`);
                    return;
                }
                const stock = parseFloat(stockStr);
                if (isNaN(stock) || stock < 0) {
                    skippedRows.push(rowNumber);
                    errors.push(`Row ${rowNumber}: Invalid stock value '${stockStr}'. Must be a non-negative number`);
                    return;
                }

                // ✅ VALIDATE: unit (required, string)
                if (!unit) {
                    skippedRows.push(rowNumber);
                    errors.push(`Row ${rowNumber}: Missing required field 'unit'`);
                    return;
                }

                // ✅ VALIDATE: price (optional, number, default 0)
                let price = parseFloat(priceStr);
                if (isNaN(price) || price < 0) {
                    price = 0; // Default to 0 if invalid
                }

                // ✅ VALIDATE: status (required, must be Active or Discontinued)
                if (!status) {
                    skippedRows.push(rowNumber);
                    errors.push(`Row ${rowNumber}: Missing required field 'status'`);
                    return;
                }
                if (!VALID_STATUSES.includes(status)) {
                    skippedRows.push(rowNumber);
                    errors.push(`Row ${rowNumber}: Invalid status '${status}'. Must be either 'Active' or 'Discontinued'`);
                    return;
                }

                // ✅ All validations passed - add to valid materials
                validMaterials.push({
                    organizationId,
                    name: material_name,
                    category: categoryUpper,
                    currentStock: stock,
                    uom: unit,
                    costPrice: price,
                    status: status === 'Active' ? 'ACTIVE' : 'DISCONTINUED',
                    specifications: {},
                });

                logger.info(`✅ Row ${rowNumber}: Valid - ${material_name}`);

            } catch (err) {
                skippedRows.push(rowNumber);
                errors.push(`Row ${rowNumber}: ${err.message}`);
                logger.error(`❌ Row ${rowNumber} error:`, err.message);
            }
        });

        logger.info(`📊 Processing summary: Total=${dataRows.length}, Valid=${validMaterials.length}, Skipped=${skippedRows.length}`);

        // ✅ STEP 5: Insert valid materials into database
        const insertedMaterials = [];
        const insertErrors = [];

        for (const material of validMaterials) {
            try {
                const inserted = await RawMaterial.create(material);
                insertedMaterials.push(inserted);
            } catch (err) {
                insertErrors.push({
                    material: material.name,
                    error: err.message
                });
                logger.error(`❌ DB Insert failed for ${material.name}:`, err.message);
            }
        }

        // ✅ STEP 6: Return comprehensive summary
        const response = {
            success: true,
            message: `Successfully imported ${insertedMaterials.length} out of ${validMaterials.length} valid materials`,
            data: {
                total_rows_read: dataRows.length,
                total_rows_inserted: insertedMaterials.length,
                total_rows_skipped: skippedRows.length + insertErrors.length,
                error_summary: {
                    validation_errors: errors.length,
                    database_errors: insertErrors.length,
                },
                materials: insertedMaterials,
            },
            errors: [
                ...errors,
                ...insertErrors.map(e => `Database error for '${e.material}': ${e.error}`)
            ]
        };

        logger.info(`✅ Import completed: ${insertedMaterials.length} inserted, ${skippedRows.length} skipped`);

        res.status(200).json(response);

    } catch (error) {
        logger.error('❌ Critical import error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during import',
            error: error.message
        });
    }
};

module.exports = { importFromExcelStrict };
