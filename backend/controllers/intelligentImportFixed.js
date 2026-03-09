const RawMaterial = require('../models/vlite/RawMaterial');
const logger = require('../utils/logger');
const xlsx = require('xlsx');

/**
 * INTELLIGENT EXCEL PRE-PROCESSOR AND IMPORTER
 * 
 * Analyzes unstructured/messy Excel files and automatically detects,
 * normalizes, and imports raw material data.
 * 
 * Features:
 * - Content-based detection (not column index)
 * - Auto-categorization
 * - Data normalization
 * - Intelligent filtering of non-material data
 */

// Valid category mappings
const CATEGORY_KEYWORDS = {
    'PANEL': ['PANEL', 'PLN', 'HDF', 'MDF', 'PLYWOOD', 'BOARD', 'TOP', 'GABLE', 'SHELF'],
    'LAMINATE': ['LAMINATE', 'LAM', 'VENEER', 'FINISH'],
    'EDGEBAND': ['EDGE', 'EDGEBAND', 'BANDING'],
    'HARDWARE': ['HANDLE', 'HINGE', 'BRACKET', 'SCREW', 'FITTING', 'LOCK', 'KNOB', 'PULL'],
    'GLASS': ['GLASS', 'MIRROR'],
    'FABRIC': ['FABRIC', 'CLOTH', 'LEATHER'],
    'ALUMINIUM': ['ALUMINIUM', 'ALUMINUM', 'AL', 'METAL'],
};

// Standardize unit variations to match database enum
const UNIT_NORMALIZATIONS = {
    'SQF': ['SQFT', 'SQ FT', 'SQFT', 'SQ.FT', 'SQ FEET', 'SQUARE FEET', 'SQ.FEET'],
    'PCS': ['NOS', 'NO', 'PCS', 'PC', 'PIECE', 'PIECES', 'NUMBERS', 'QTY'],
    'METER': ['MTR', 'M', 'METER', 'METRE', 'METERS'],
    'KG': ['KG', 'KILOGRAM', 'KILOGRAMS'],
    'LITER': ['LTR', 'L', 'LITER', 'LITRE', 'LITERS'],
    'SQM': ['SQM', 'SQ M', 'SQ.M', 'SQUARE METER'],
    'SHEET': ['SHEET', 'SHEETS'],
    'FEET': ['FEET', 'FT', 'FOOT'],
    'BOX': ['BOX', 'BOXES'],
    'SET': ['SET', 'SETS'],
};

/**
 * Normalize unit to standard format
 */
const normalizeUnit = (rawUnit) => {
    if (!rawUnit) return 'PCS'; // Default to PCS (matches DB enum)
    const upper = rawUnit.toString().toUpperCase().trim();

    for (const [standard, variations] of Object.entries(UNIT_NORMALIZATIONS)) {
        if (variations.some(v => upper.includes(v) || v.includes(upper))) {
            return standard;
        }
    }
    return upper || 'PCS';
};

/**
 * Infer category from material name
 */
const inferCategory = (materialName) => {
    if (!materialName) return 'OTHER';
    const nameUpper = materialName.toUpperCase();

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(keyword => nameUpper.includes(keyword))) {
            return category;
        }
    }
    return 'OTHER';
};

/**
 * Check if a row contains raw material data
 */
const isRawMaterialRow = (row) => {
    if (!row || !Array.isArray(row)) return false;

    let hasName = false;
    let hasNumeric = false;
    let hasUnit = false;

    for (let i = 0; i < row.length; i++) {
        const cell = (row[i] || '').toString().trim();
        if (!cell) continue;

        // Check for item name (at least 2 characters, not just numbers)
        if (cell.length >= 2 && !/^\d+(\.\d+)?$/.test(cell)) {
            hasName = true;
        }

        // Check for numeric value
        if (!isNaN(parseFloat(cell)) && parseFloat(cell) > 0) {
            hasNumeric = true;
        }

        // Check for unit
        const cellUpper = cell.toUpperCase();
        for (const variations of Object.values(UNIT_NORMALIZATIONS)) {
            if (variations.some(v => cellUpper.includes(v) || v.includes(cellUpper))) {
                hasUnit = true;
                break;
            }
        }
    }

    return hasName && hasNumeric;
};

/**
 * Check if row is likely a header/title/note
 */
const isNonMaterialRow = (row) => {
    if (!row || !Array.isArray(row)) return true;

    const rowText = row.join(' ').toUpperCase().trim();

    // Common non-material patterns
    const excludePatterns = [
        /^TABLE\s*\d+/,
        /^SECTION\s*\d+/,
        /^NOTES?$/,
        /^DIMENSION/,
        /^HEIGHT.*WIDTH.*LENGTH/,
        /^MM.*FEET/,
        /^TOTAL/,
        /^GRAND TOTAL/,
        /^SUBTOTAL/,
        /^SUMMARY/,
        /^DESCRIPTION.*RATE.*AMOUNT/,
    ];

    return excludePatterns.some(pattern => pattern.test(rowText));
};

/**
 * Extract material data from a row
 */
const extractMaterialFromRow = (row, rowIndex) => {
    if (!row || !Array.isArray(row)) return null;

    let materialName = '';
    let stock = 0;
    let unit = 'NOS';
    let price = 0;

    // Find material name (first non-numeric text with >2 chars)
    for (let i = 0; i < row.length; i++) {
        const cell = (row[i] || '').toString().trim();
        if (cell.length >= 2 && !/^\d+(\.\d+)?$/.test(cell) && !materialName) {
            materialName = cell;
            break;
        }
    }

    // Find numeric values
    const numbers = [];
    for (let i = 0; i < row.length; i++) {
        const cell = (row[i] || '').toString().trim();
        const num = parseFloat(cell);
        if (!isNaN(num) && num > 0) {
            numbers.push({ value: num, index: i });
        }
    }

    // Find unit
    for (let i = 0; i < row.length; i++) {
        const cell = (row[i] || '').toString().trim();
        const normalized = normalizeUnit(cell);
        if (normalized !== cell.toUpperCase() || cell.toUpperCase() === 'NOS' || cell.toUpperCase() === 'SQFT') {
            unit = normalized;
            break;
        }
    }

    // Assign numbers: first is likely stock, second (if larger) is likely price
    if (numbers.length > 0) {
        stock = numbers[0].value;
    }
    if (numbers.length > 1) {
        // If second number is much larger than first, it's likely price
        if (numbers[1].value > numbers[0].value * 5) {
            price = numbers[1].value;
        } else {
            stock = numbers[0].value;
            price = numbers[1].value;
        }
    }

    if (!materialName || stock <= 0) {
        return null;
    }

    return {
        materialName: materialName.trim(),
        stock,
        unit,
        price,
        category: inferCategory(materialName),
    };
};

const importFromExcelIntelligent = async (req, res) => {
    try {
        const { organizationId } = req.user;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        logger.info('🧠 Starting INTELLIGENT Excel pre-processing...');

        // Read workbook
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const allRows = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });

        if (!allRows || allRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Excel file is empty'
            });
        }

        logger.info(`📊 Total rows scanned: ${allRows.length}`);

        // STEP 1: Analyze and detect raw material rows
        const detectedMaterials = [];
        const skippedRows = [];
        const assumptions = [];

        allRows.forEach((row, index) => {
            const rowNum = index + 1;

            // Skip completely empty rows
            const isEmpty = !row || row.every(cell => !cell || cell.toString().trim() === '');
            if (isEmpty) {
                logger.info(`Row ${rowNum}: Empty, skipping`);
                return;
            }

            // Skip non-material rows (headers, notes, dimensions, etc.)
            if (isNonMaterialRow(row)) {
                logger.info(`Row ${rowNum}: Non-material data (header/note/dimension), skipping`);
                skippedRows.push({ row: rowNum, reason: 'Non-material data (header/note/dimension)' });
                return;
            }

            // Check if row contains material data
            if (!isRawMaterialRow(row)) {
                logger.info(`Row ${rowNum}: Does not match raw material pattern, skipping`);
                skippedRows.push({ row: rowNum, reason: 'Does not match raw material pattern' });
                return;
            }

            // Extract material data
            const material = extractMaterialFromRow(row, rowNum);
            if (!material) {
                logger.info(`Row ${rowNum}: Could not extract valid material data, skipping`);
                skippedRows.push({ row: rowNum, reason: 'Could not extract material name or stock' });
                return;
            }

            logger.info(`✅ Row ${rowNum}: Detected material - ${material.materialName} (${material.stock} ${material.unit})`);
            detectedMaterials.push({
                ...material,
                sourceRow: rowNum,
            });

            // Track assumptions
            if (material.price === 0) {
                assumptions.push(`Row ${rowNum}: Price set to 0 (not found in row)`);
            }
            if (material.category === 'OTHER') {
                assumptions.push(`Row ${rowNum}: Category set to OTHER (could not infer from name)`);
            }
        });

        logger.info(`🔍 Raw materials detected: ${detectedMaterials.length}`);
        logger.info(`⏭️ Rows skipped: ${skippedRows.length}`);

        if (detectedMaterials.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid raw material data found in the uploaded file.',
                details: {
                    total_rows_scanned: allRows.length,
                    skipped_rows: skippedRows,
                }
            });
        }

        // STEP 2: Normalize and prepare for database insertion
        const normalizedMaterials = detectedMaterials.map(mat => ({
            organizationId,
            name: mat.materialName,
            category: mat.category,
            currentStock: mat.stock,
            uom: mat.unit,
            costPrice: mat.price,
            status: 'ACTIVE',
            specifications: {},
        }));

        // STEP 3: Insert into database
        const insertedMaterials = [];
        const insertErrors = [];

        for (const material of normalizedMaterials) {
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

        logger.info(`✅ Import completed: ${insertedMaterials.length} inserted, ${insertErrors.length} failed`);

        // STEP 4: Return comprehensive summary
        res.status(200).json({
            success: true,
            message: `Successfully imported ${insertedMaterials.length} raw materials using intelligent pre-processing`,
            data: {
                total_rows_scanned: allRows.length,
                total_raw_materials_detected: detectedMaterials.length,
                total_rows_inserted: insertedMaterials.length,
                total_rows_skipped: skippedRows.length,
                database_errors: insertErrors.length,
                assumptions_made: assumptions,
                materials: insertedMaterials,
            },
            errors: [
                ...skippedRows.map(s => `Row ${s.row}: ${s.reason}`),
                ...insertErrors.map(e => `Database error for '${e.material}': ${e.error}`)
            ]
        });

    } catch (error) {
        logger.error('❌ Intelligent import error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during import',
            error: error.message
        });
    }
};

module.exports = { importFromExcelIntelligent };
