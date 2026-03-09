const RawMaterial = require('../models/vlite/RawMaterial');
const logger = require('../utils/logger');
const xlsx = require('xlsx');

/**
 * Simple import optimized for complex Excel files
 */
exports.importFromExcelSimple = async (req, res) => {
    try {
        const { organizationId } = req.user;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded',
            });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Get ALL rows as arrays
        const allRows = xlsx.utils.sheet_to_json(worksheet, {
            header: 1,
            raw: false,
            defval: ''
        });

        logger.info(`Total rows: ${allRows.length}`);

        // Find row with "ITEM" column
        let headerRowIndex = -1;
        let itemColumnIndex = -1;
        let priceColumnIndex = -1;

        for (let i = 0; i < Math.min(allRows.length, 20); i++) {
            const row = allRows[i];
            for (let j = 0; j < row.length; j++) {
                const cell = row[j]?.toString().toUpperCase().trim();
                if (cell === 'ITEM' || cell === 'ITEMS') {
                    headerRowIndex = i;
                    itemColumnIndex = j;
                    logger.info(`Found ITEM at row ${i}, column ${j}`);
                }
                if (cell === 'PRICE' || cell.includes('PRICE') || cell === 'RATE' || cell === 'AMOUNT') {
                    priceColumnIndex = j;
                    logger.info(`Found PRICE at row ${i}, column ${j}`);
                }
            }
            if (itemColumnIndex >= 0) break;
        }

        if (itemColumnIndex === -1) {
            return res.status(400).json({
                success: false,
                message: 'Could not find ITEM column in Excel file. Please ensure first column is named "ITEM"',
            });
        }

        // Get data rows
        const dataRows = allRows.slice(headerRowIndex + 1).filter(row =>
            row && row[itemColumnIndex] && row[itemColumnIndex].toString().trim()
        );

        logger.info(`Found ${dataRows.length} data rows starting from row ${headerRowIndex + 2}`);

        const materials = [];
        const errors = [];

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            try {
                const name = row[itemColumnIndex]?.toString().trim();
                if (!name) {
                    errors.push(`Row ${headerRowIndex + i + 2}: Name is empty`);
                    continue;
                }

                // Find price - try known column or scan for first big number
                let costPrice = null;
                if (priceColumnIndex >= 0 && row[priceColumnIndex]) {
                    costPrice = parseFloat(row[priceColumnIndex].toString().replace(/[^0-9.]/g, ''));
                }

                // If no price column found, scan for numbers > 100
                if (!costPrice || isNaN(costPrice)) {
                    for (let j = 0; j < row.length; j++) {
                        if (j === itemColumnIndex) continue;
                        const val = row[j]?.toString().trim();
                        if (val) {
                            const num = parseFloat(val.replace(/[^0-9.]/g, ''));
                            if (!isNaN(num) && num > 100 && num < 100000) {
                                costPrice = num;
                                break;
                            }
                        }
                    }
                }

                if (!costPrice || costPrice <= 0) {
                    errors.push(`Row ${headerRowIndex + i + 2}: No valid price found`);
                    continue;
                }

                // Determine category from name
                const nameUpper = name.toUpperCase();
                let category = 'OTHER';
                if (nameUpper.includes('PLN') || nameUpper.includes('HDF') ||
                    nameUpper.includes('MDF') || nameUpper.includes('BOARD') ||
                    nameUpper.includes('TABLE')) {
                    category = 'PANEL';
                } else if (nameUpper.includes('LAM')) {
                    category = 'LAMINATE';
                } else if (nameUpper.includes('EDGE')) {
                    category = 'EDGEBAND';
                }

                materials.push({
                    organizationId,
                    name,
                    category,
                    costPrice,
                    uom: 'PCS',
                    currentStock: 0,
                    status: 'ACTIVE',
                    specifications: {},
                });

            } catch (error) {
                errors.push(`Row ${headerRowIndex + i + 2}: ${error.message}`);
            }
        }

        if (materials.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid materials found',
                errors,
            });
        }

        // Insert into database
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
            message: `Successfully imported ${inserted.length} materials`,
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

module.exports = { importFromExcelSimple };
