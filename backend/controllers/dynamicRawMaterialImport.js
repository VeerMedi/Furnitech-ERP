const RawMaterial = require('../models/vlite/RawMaterial');
const logger = require('../utils/logger');
const xlsx = require('xlsx');

/**
 * TRULY DYNAMIC Intelligent Excel Import
 * Automatically detects and maps ALL columns from Excel
 */
exports.dynamicImportFromExcel = async (req, res) => {
    try {
        const { organizationId } = req.user;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded',
            });
        }

        // Read Excel
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = xlsx.utils.sheet_to_json(worksheet, { raw: false, defval: null });

        if (!rawData || rawData.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Excel file is empty',
            });
        }

        logger.info(`Processing ${rawData.length} rows with DYNAMIC parser`);

        // Normalize column name
        const normalize = (str) => str?.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');

        // Find column value with flexible matching
        const findValue = (row, possibleNames) => {
            for (const name of possibleNames) {
                const normalized = normalize(name);
                for (const key in row) {
                    if (normalize(key) === normalized) {
                        return row[key];
                    }
                }
            }
            return null;
        };

        // Smart category parser - Save exact value if not in mapping
        const parseCategory = (value) => {
            if (!value) return 'GENERAL'; // Only empty values get default
            const val = value.toString().toUpperCase().trim();

            // Common category aliases for standardization
            const categoryMap = {
                'PANEL': ['PANEL', 'PANELS', 'BOARD', 'PLYWOOD', 'PLB', 'PLY'],
                'LAMINATE': ['LAMINATE', 'LAMINATES', 'LAM'],
                'EDGEBAND': ['EDGEBAND', 'EDGE', 'HBD', 'EDGE BAND'],
                'HARDWARE': ['HARDWARE', 'HARDWARES'],
                'GLASS': ['GLASS'],
                'FABRIC': ['FABRIC', 'FABRICS'],
                'ALUMINIUM': ['ALUMINIUM', 'ALUMINUM', 'AL'],
                'PROCESSED_PANEL': ['PROCESSED', 'PROCESSED PANEL'],
                'HANDLES': ['HANDLE', 'HANDLES'],
            };

            // Check if matches known category (EXACT MATCH to avoid false positives like METAL->AL)
            for (const [category, keywords] of Object.entries(categoryMap)) {
                if (keywords.some(kw => val === kw)) return category; // Exact match only
            }

            // 🚀 SAVE EXACT CATEGORY from Excel (no OTHER conversion)
            return val;
        };

        // Smart UOM parser
        const parseUOM = (value) => {
            if (!value) return 'PCS';
            const val = value.toString().toUpperCase().trim();
            const uomMap = {
                'PCS': ['PCS', 'PIECE', 'NOS'],
                'SHEET': ['SHEET', 'SHEETS'],
                'METER': ['METER', 'METRE', 'M', 'MTR'],
                'LITER': ['LITER', 'LITRE', 'L'],
            };
            for (const [uom, keywords] of Object.entries(uomMap)) {
                if (keywords.some(kw => val === kw || val.includes(kw))) return uom;
            }
            return 'PCS';
        };

        // Smart status parser  
        const parseStatus = (value) => {
            if (!value) return 'ACTIVE';
            const val = value.toString().toUpperCase();
            if (val.includes('DISCONTINUED') || val.includes('INACTIVE')) return 'DISCONTINUED';
            if (val.includes('OUT')) return 'OUT_OF_STOCK';
            return 'ACTIVE';
        };

        // 🆔 GENERATE UNIQUE BATCH ID for this entire import session
        const importBatchId = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const importedAt = new Date();

        const materials = [];
        const errors = [];

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];

            try {
                // REQUIRED FIELDS
                const name = findValue(row, ['name', 'material name', 'item', 'item name']);
                if (!name || name.toString().trim() === '') {
                    errors.push(`Row ${i + 2}: Material name required`);
                    continue;
                }

                const priceValue = findValue(row, ['price', 'cost', 'cost price', 'rate']);
                const price = priceValue ? parseFloat(priceValue.toString().replace(/[^0-9.]/g, '')) : null;
                if (!price || price < 0) {
                    errors.push(`Row ${i + 2}: Valid price required`);
                    continue;
                }

                // CORE FIELDS
                const stock = parseFloat(findValue(row, ['stock', 'quantity', 'qty']) || 0);
                const unit = findValue(row, ['unit', 'uom', 'measure']);
                const categoryVal = findValue(row, ['category', 'type']);
                const statusVal = findValue(row, ['status', 'state']);

                // PARSE
                const category = parseCategory(categoryVal);
                // 🔥 SAVE UOM AS-IS from Excel (no conversion)
                const uom = unit ? unit.toString().trim().toUpperCase() : 'PCS';
                const status = parseStatus(statusVal);

                // BUILD MATERIAL OBJECT
                const material = {
                    organizationId,
                    name: name.toString().trim(),
                    costPrice: price,
                    currentStock: stock,
                    uom,
                    category,
                    status,
                    specifications: {},
                    importBatchId,  // 🚀 Track import batch
                    importedAt,     // 🚀 Track import time
                };

                // DYNAMIC SPECIFICATIONS - Auto-detect ALL other columns
                const knownFields = ['name', 'material name', 'item', 'item name', 'price', 'cost',
                    'cost price', 'rate', 'stock', 'quantity', 'qty', 'unit', 'uom', 'measure',
                    'category', 'type', 'status', 'state'];

                // Map ALL remaining columns to specifications automatically
                for (const [key, value] of Object.entries(row)) {
                    const normalizedKey = normalize(key);

                    // Skip known/mapped fields
                    if (knownFields.some(f => normalize(f) === normalizedKey)) continue;

                    // Skip empty values
                    if (!value || value.toString().trim() === '') continue;

                    // Auto-map to specifications
                    const cleanKey = key.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                    material.specifications[cleanKey] = value.toString().trim();
                }

                materials.push(material);
            } catch (error) {
                errors.push(`Row ${i + 2}: ${error.message}`);
            }
        }

        if (materials.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid materials found',
                errors,
            });
        }

        // INSERT INTO DATABASE
        const inserted = [];
        const insertErrors = [];

        for (const mat of materials) {
            try {
                const created = await RawMaterial.create(mat);
                inserted.push(created);
            } catch (error) {
                insertErrors.push({ material: mat.name, error: error.message });
            }
        }

        logger.info(`DYNAMIC import: ${inserted.length}/${materials.length} materials imported`);

        res.status(200).json({
            success: true,
            message: `Successfully imported ${inserted.length} materials using DYNAMIC parser`,
            data: {
                totalRows: rawData.length,
                validRows: materials.length,
                imported: inserted.length,
                failed: insertErrors.length,
            },
            errors: [...errors, ...insertErrors.map(e => `${e.material}: ${e.error}`)],
        });
    } catch (error) {
        logger.error('Dynamic import error:', error);
        res.status(500).json({
            success: false,
            message: 'Error importing materials',
            error: error.message,
        });
    }
};
