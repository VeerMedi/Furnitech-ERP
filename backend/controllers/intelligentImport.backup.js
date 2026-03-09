const RawMaterial = require('../models/vlite/RawMaterial');
const logger = require('../utils/logger');
const xlsx = require('xlsx');

/**
 * @desc    Import raw materials from Excel file with AI-powered intelligent parsing
 * @route   POST /api/rawmaterial/import
 * @access  Private
 */
exports.importFromExcelIntelligent = async (req, res) => {
    try {
        const { organizationId } = req.user;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded',
            });
        }

        // Read the Excel file from buffer - Read ALL data including potential headers
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Get raw data with header:1 to catch all rows including potential multi-headers
        const allRows = xlsx.utils.sheet_to_json(worksheet, {
            header: 1,  // Get as array of arrays
            raw: false,
            defval: ''
        });

        if (!allRows || allRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Excel file is empty or invalid',
            });
        }

        logger.info(`Reading ${allRows.length} total rows from Excel file`);

        // ========== FUZZY STRING MATCHING ==========
        const fuzzyMatch = (str1, str2) => {
            if (!str1 || !str2) return 0;
            const s1 = str1.toString().toLowerCase().trim();
            const s2 = str2.toString().toLowerCase().trim();

            // Exact match
            if (s1 === s2) return 100;

            // Contains match
            if (s1.includes(s2) || s2.includes(s1)) return 80;

            // Normalize and compare
            const normalize = (s) => s.replace(/[^a-z0-9]/g, '');
            const n1 = normalize(s1);
            const n2 = normalize(s2);

            if (n1 === n2) return 90;
            if (n1.includes(n2) || n2.includes(n1)) return 70;

            // Character overlap
            const chars1 = new Set(n1.split(''));
            const chars2 = new Set(n2.split(''));
            const intersection = [...chars1].filter(c => chars2.has(c)).length;
            const union = new Set([...chars1, ...chars2]).size;

            return Math.floor((intersection / union) * 100);
        };

        // ========== INTELLIGENT HEADER DETECTION ==========
        const detectHeaderRow = (rows) => {
            let bestHeaderIndex = 0;
            let bestScore = 0;

            const headerKeywords = [
                'name', 'type', 'category', 'price', 'cost', 'rate', 'qty', 'quantity',
                'stock', 'unit', 'uom', 'brand', 'material', 'item', 'product', 'description'
            ];

            for (let i = 0; i < Math.min(rows.length, 10); i++) {
                const row = rows[i];
                if (!row || row.length === 0) continue;

                let score = 0;
                let textCells = 0;

                for (const cell of row) {
                    const cellStr = cell?.toString().toLowerCase().trim() || '';
                    if (!cellStr) continue;

                    // Check keywords
                    if (headerKeywords.some(k => cellStr.includes(k))) score += 10;

                    // Short text cells
                    if (cellStr.length > 0 && cellStr.length < 30) textCells++;

                    // Penalize numbers
                    if (/^\d+(\.\d+)?$/.test(cellStr)) score -= 5;
                }

                if (textCells >= row.length * 0.5) score += 15;

                if (score > bestScore) {
                    bestScore = score;
                    bestHeaderIndex = i;
                }
            }

            return bestHeaderIndex;
        };

        const headerRowIndex = detectHeaderRow(allRows);
        const headerRow = allRows[headerRowIndex];
        const dataRows = allRows.slice(headerRowIndex + 1).filter(row =>
            row && row.some(cell => cell && cell.toString().trim())
        );

        if (dataRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No data rows found',
            });
        }

        logger.info(`Header at row ${headerRowIndex + 1}, processing ${dataRows.length} data rows`);

        // ========== COLUMN MAPPING ==========
        const columnMapping = {};
        const columnPatterns = {
            name: ['name', 'item', 'product', 'material', 'description'],
            category: ['category', 'type', 'class', 'group'],
            brand: ['brand', 'manufacturer', 'make'],
            thickness: ['thickness', 'thick'],
            width: ['width', 'breadth'],
            length: ['length', 'long', 'size'],
            color: ['color', 'colour', 'shade'],
            finish: ['finish', 'finishing', 'surface'],
            grade: ['grade', 'quality'],
            uom: ['uom', 'unit', 'measure', 'um'],
            costPrice: ['cost', 'price', 'rate', 'purchase', 'cp'],
            sellingPrice: ['selling', 'sale', 'mrp', 'sp'],
            currentStock: ['stock', 'quantity', 'qty', 'available'],
            status: ['status', 'state', 'active'],
        };

        headerRow.forEach((header, index) => {
            if (!header) return;
            const headerStr = header.toString().toLowerCase().trim();
            if (!headerStr) return;

            let bestMatch = null;
            let bestScore = 0;

            for (const [field, keywords] of Object.entries(columnPatterns)) {
                for (const keyword of keywords) {
                    const score = fuzzyMatch(headerStr, keyword);
                    if (score > bestScore && score >= 50) {
                        bestScore = score;
                        bestMatch = field;
                    }
                }
            }

            if (bestMatch) {
                columnMapping[index] = bestMatch;
                logger.info(`Column ${index} "${header}" → ${bestMatch} (${bestScore}%)`);
            }
        });

        // Auto-detect name column from content if not found
        if (!Object.values(columnMapping).includes('name')) {
            for (let i = 0; i < headerRow.length; i++) {
                if (columnMapping[i]) continue;
                const samples = dataRows.slice(0, 5).map(row => row[i]).filter Boolean;
                const avgLen = samples.reduce((sum, v) => sum + v.toString().length, 0) / (samples.length || 1);
                if (avgLen > 10 && samples.every(v => /^[a-zA-Z0-9\s]+$/.test(v.toString()))) {
                    columnMapping[i] = 'name';
                    logger.info(`Auto-detected column ${i} as 'name'`);
                    break;
                }
            }
        }

        // ========== PARSE DATA ==========
        const parseCategory = (val) => {
            if (!val) return 'OTHER';
            const v = val.toString().toUpperCase();
            const map = {
                PANEL: ['PANEL', 'BOARD', 'PLYWOOD', 'HBD', 'MDF'],
                LAMINATE: ['LAMINATE', 'LAMINATION'],
                EDGEBAND: ['EDGEBAND', 'EDGE'],
                HARDWARE: ['HARDWARE', 'FITTING'],
                GLASS: ['GLASS'],
                FABRIC: ['FABRIC', 'CLOTH'],
                ALUMINIUM: ['ALUMINIUM', 'ALUMINUM', 'AL'],
                HANDLES: ['HANDLE'],
                HINGES: ['HINGE'],
            };
            for (const [cat, keys] of Object.entries(map)) {
                if (keys.some(k => v.includes(k))) return cat;
            }
            return 'OTHER';
        };

        const parseUOM = (val) => {
            if (!val) return 'PCS';
            const v = val.toString().toUpperCase();
            const map = {
                PCS: ['PCS', 'PIECE', 'NOS'],
                SHEET: ['SHEET'],
                SQM: ['SQM', 'SQ.M', 'M2'],
                SQF: ['SQF', 'SQFT', 'FT2'],
                METER: ['METER', 'MTR', 'M'],
                FEET: ['FEET', 'FT'],
            };
            for (const [uom, keys] of Object.entries(map)) {
                if (keys.some(k => v.includes(k))) return uom;
            }
            return 'PCS';
        };

        const materials = [];
        const errors = [];

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            try {
                const getValue = (field) => {
                    const colIndex = Object.keys(columnMapping).find(k => columnMapping[k] === field);
                    return colIndex !== undefined ? row[colIndex] : null;
                };

                const name = getValue('name');
                if (!name || !name.toString().trim()) {
                    errors.push(`Row ${i + headerRowIndex + 2}: Name required`);
                    continue;
                }

                const costPriceVal = getValue('costPrice');
                const costPrice = costPriceVal ? parseFloat(costPriceVal.toString().replace(/[^0-9.]/g, '')) : null;

                if (!costPrice || costPrice <= 0) {
                    errors.push(`Row ${i + headerRowIndex + 2}: Valid price required`);
                    continue;
                }

                const material = {
                    organizationId,
                    name: name.toString().trim(),
                    category: parseCategory(getValue('category')),
                    uom: parseUOM(getValue('uom')),
                    costPrice,
                    currentStock: parseFloat(getValue('currentStock')?.toString().replace(/[^0-9.]/g, '') || '0') || 0,
                    status: 'ACTIVE',
                    specifications: {},
                };

                const sellingPriceVal = getValue('sellingPrice');
                if (sellingPriceVal) {
                    material.sellingPrice = parseFloat(sellingPriceVal.toString().replace(/[^0-9.]/g, ''));
                }

                ['brand', 'thickness', 'width', 'length', 'color', 'finish', 'grade'].forEach(field => {
                    const val = getValue(field);
                    if (val) material.specifications[field] = val.toString().trim();
                });

                materials.push(material);
            } catch (error) {
                errors.push(`Row ${i + headerRowIndex + 2}: ${error.message}`);
            }
        }

        if (materials.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid materials found',
                errors,
            });
        }

        // ========== INSERT TO DATABASE ==========
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

        res.status(200).json({
            success: true,
            message: `Imported ${inserted.length} materials`,
            data: {
                totalRows: dataRows.length,
                validRows: materials.length,
                imported: inserted.length,
                failed: insertErrors.length,
                materials: inserted,
            },
            errors: [...errors, ...insertErrors.map(e => `${e.material}: ${e.error}`)],
        });

    } catch (error) {
        logger.error('Import error:', error);
        res.status(500).json({
            success: false,
            message: 'Import failed',
            error: error.message,
        });
    }
};

module.exports = { importFromExcelIntelligent };
