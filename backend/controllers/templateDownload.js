const xlsx = require('xlsx');
const logger = require('../utils/logger');

/**
 * Generate and download Excel template for Raw Material import
 */
const downloadTemplate = async (req, res) => {
    try {
        // Create workbook
        const wb = xlsx.utils.book_new();

        // Define headers (case-sensitive - MUST match exactly)
        const headers = ['material_name', 'category', 'stock', 'unit', 'price', 'status'];

        // Add sample data rows
        const sampleData = [
            ['18mm MDF Board', 'PANEL', 100, 'PCS', 1250, 'Active'],
            ['Laminate Oak Finish', 'LAMINATE', 50, 'SQM', 450, 'Active'],
            ['PVC Edgeband White', 'EDGEBAND', 200, 'MTR', 25, 'Active'],
            ['Door Handle Chrome', 'HARDWARE', 75, 'PCS', 150, 'Active'],
            ['5mm Clear Glass', 'GLASS', 30, 'SQM', 800, 'Active'],
        ];

        // Combine headers and data
        const wsData = [headers, ...sampleData];

        // Create worksheet
        const ws = xlsx.utils.aoa_to_sheet(wsData);

        // Set column widths
        ws['!cols'] = [
            { wch: 25 }, // material_name
            { wch: 18 }, // category
            { wch: 10 }, // stock
            { wch: 10 }, // unit
            { wch: 10 }, // price
            { wch: 15 }, // status
        ];

        // Add worksheet to workbook with REQUIRED sheet name
        xlsx.utils.book_append_sheet(wb, ws, 'Raw_Material_Import');

        // Create instructions sheet
        const instructionsData = [
            ['RAW MATERIAL IMPORT TEMPLATE - INSTRUCTIONS'],
            [''],
            ['IMPORTANT RULES:'],
            ['1. Sheet name MUST be "Raw_Material_Import" (case-sensitive)'],
            ['2. First row MUST contain exact headers (case-sensitive)'],
            ['3. Do NOT modify header names'],
            [''],
            ['REQUIRED HEADERS (case-sensitive):'],
            ['material_name - Name of the material (required, text)'],
            ['category - Material category (required, text)'],
            ['stock - Current stock quantity (required, number)'],
            ['unit - Unit of measurement (required, text)'],
            ['price - Cost price (optional, number, default 0)'],
            ['status - Active or Discontinued (required)'],
            [''],
            ['VALID CATEGORIES:'],
            ['PANEL, LAMINATE, EDGEBAND, HARDWARE, GLASS, FABRIC, ALUMINIUM, PROCESSED_PANEL, HANDLES, OTHER'],
            [''],
            ['VALID STATUS VALUES:'],
            ['Active, Discontinued'],
            [''],
            ['DATA VALIDATION RULES:'],
            ['- material_name: Cannot be empty'],
            ['- category: Must match one of the valid categories (case-insensitive)'],
            ['- stock: Must be a non-negative number'],
            ['- unit: Cannot be empty (e.g., PCS, SQM, MTR, KG, LTR)'],
            ['- price: Optional number, defaults to 0 if not provided'],
            ['- status: Must be "Active" or "Discontinued"'],
            [''],
            ['EXAMPLE DATA:'],
            ['See "Raw_Material_Import" sheet for sample data format'],
            [''],
            ['ERRORS AND SKIPPED ROWS:'],
            ['- Completely empty rows will be ignored'],
            ['- Rows with missing required fields will be skipped'],
            ['- Invalid data types will cause rows to be skipped'],
            ['- Detailed error report will be provided after import'],
        ];

        const wsInstructions = xlsx.utils.aoa_to_sheet(instructionsData);
        wsInstructions['!cols'] = [{ wch: 80 }];
        xlsx.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

        // Generate buffer
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Raw_Material_Import_Template.xlsx');

        logger.info('✅ Template downloaded successfully');

        // Send file
        res.send(buffer);

    } catch (error) {
        logger.error('❌ Template download error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate template',
            error: error.message
        });
    }
};

module.exports = { downloadTemplate };
