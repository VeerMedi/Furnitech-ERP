const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * AI-Powered Quotation Import Service
 * Analyzes user description + scanned layout to intelligently match products and materials
 */

// Constants
// Assuming process.cwd() is the backend folder
const PROJECT_ROOT = path.resolve(process.cwd(), '..');
const PYTHON_SCRIPT_PATH = path.join(PROJECT_ROOT, 'AI/inventory_scanner/quotation_matcher.py');

// Platform-specific Python paths
const isWindows = process.platform === 'win32';
const VENV_PYTHON_PATH = isWindows
    ? path.join(PROJECT_ROOT, 'AI/inventory_scanner/venv/Scripts/python.exe')
    : path.join(PROJECT_ROOT, 'AI/inventory_scanner/venv/bin/python3');
const SPAWN_CWD = path.join(PROJECT_ROOT, 'AI/inventory_scanner');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
const AI_MODEL = 'arcee-ai/trinity-large-preview:free';

/**
 * Analyze user description and map scanned items to products/materials
 * Uses Python script for AI processing
 */
async function analyzeQuotationRequirements(userDescription, scannedItems, productCategories, materialCategories) {
    return new Promise((resolve, reject) => {
        // Log to file for debugging (cross-platform)
        const os = require('os');
        const logFile = path.join(os.tmpdir(), 'node_debug.log');
        const log = (msg) => fs.appendFileSync(logFile, new Date().toISOString() + ': ' + msg + '\n');

        log('--- Starting Analysis ---');
        log('CWD: ' + process.cwd());
        log('PROJECT_ROOT: ' + PROJECT_ROOT);
        log('PYTHON_SCRIPT: ' + PYTHON_SCRIPT_PATH);
        log('VENV_PYTHON: ' + VENV_PYTHON_PATH);

        // Determine which python executable to use
        console.log('📂 Current __dirname:', __dirname);
        console.log('🔍 Checking VENV path:', VENV_PYTHON_PATH);

        // Default fallback: 'python' on Windows, 'python3' on Unix-like systems
        let pythonExecutable = isWindows ? 'python' : 'python3';
        if (fs.existsSync(VENV_PYTHON_PATH)) {
            pythonExecutable = VENV_PYTHON_PATH;
            log('Using VENV Python');
            console.log('🐍 Using Virtual Environment Python:', pythonExecutable);
        } else {
            log(`Using System Python (VENV not found) - ${pythonExecutable}`);
            console.warn(`⚠️ Virtual Environment Python NOT found at expected path. Using system ${pythonExecutable}.`);
        }

        console.log('🤖 Starting AI analysis via Python script...');
        log('Spawning process...');

        const inputData = {
            userDescription,
            scannedItems,
            productCategories,
            materialCategories
        };

        const pythonProcess = spawn(pythonExecutable, [PYTHON_SCRIPT_PATH], {
            cwd: SPAWN_CWD,
            env: { ...process.env } // Explicitly pass environment variables
        });

        let resultData = '';
        let errorData = '';

        pythonProcess.on('spawn', () => {
            log('Process spawned PID: ' + pythonProcess.pid);
            console.log('✅ Python process spawned successfully PID:', pythonProcess.pid);
        });

        // Send data to python script via stdin
        try {
            const inputStr = JSON.stringify(inputData);
            pythonProcess.stdin.write(inputStr);
            pythonProcess.stdin.end();
            log('Input sent (' + inputStr.length + ' bytes)');
            console.log('📤 Input data sent to Python script (' + inputStr.length + ' bytes)');
        } catch (inputError) {
            log('Error sending input: ' + inputError.message);
            console.error('❌ Error writing to Python stdin:', inputError);
            resolve({ success: false, error: 'Failed to send data to Python script' });
            return;
        }

        pythonProcess.stdout.on('data', (data) => {
            resultData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorData += data.toString();
            log('STDERR: ' + data.toString());
            console.error('⚠️ Python STDERR:', data.toString());
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error('❌ Python Script Error:', errorData);
                return resolve({
                    success: false,
                    error: `Python script exited with code ${code}: ${errorData}`
                });
            }

            try {
                // Find JSON in the output (in case there are other logs)
                const jsonMatch = resultData.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error('No JSON found in Python output');
                }

                const result = JSON.parse(jsonMatch[0]);
                console.log('✅ Python AI Analysis Complete');

                if (result.error) {
                    return resolve({ success: false, error: result.error });
                }

                return resolve({
                    success: true,
                    mappings: result.mappings || []
                });

            } catch (e) {
                console.error('❌ JSON Parse Error:', e);
                console.error('Raw Output:', resultData);
                return resolve({
                    success: false,
                    error: 'Failed to parse Python script output: ' + e.message
                });
            }
        });

        pythonProcess.on('error', (err) => {
            console.error('❌ process error:', err);
            resolve({ success: false, error: err.message });
        });
    });
}

/**
 * Fetch specific products from a category
 */
async function fetchProductsFromCategory(categoryName, Product) {
    try {
        const products = await Product.find({
            category: categoryName,
            isActive: { $ne: false }
        }).limit(20);

        return products.map(p => ({
            _id: p._id,
            name: p.name,
            category: p.category,
            price: p.pricing?.sellingPrice || p.price || 0,
            description: p.description,
            specifications: p.specifications
        }));
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

/**
 * Fetch raw materials from category
 */
async function fetchMaterialsFromCategory(categoryName, RawMaterial) {
    try {
        const materials = await RawMaterial.find({
            category: categoryName,
            $or: [
                { costPrice: { $gt: 0 } },
                { sellingPrice: { $gt: 0 } }
            ]
        })
            .sort({ costPrice: -1 }) // Prefer higher cost items (usually better quality)
            .limit(20);

        return materials.map(m => ({
            _id: m._id,
            name: m.name,
            category: m.category,
            price: m.sellingPrice || m.costPrice || 0,
            unit: m.uom || 'unit', // Use correct field UOM
            specifications: m.specifications
        }));
    } catch (error) {
        console.error('Error fetching materials:', error);
        return [];
    }
}

/**
 * Select best matching product using AI
 */
async function selectBestProduct(scannedItem, products, userDescription) {
    if (products.length === 0) return null;
    if (products.length === 1) return products[0];

    try {
        const prompt = `Select the most appropriate product for this requirement.

SCANNED ITEM: ${scannedItem.name} (${scannedItem.count} units)
USER INSTRUCTIONS: "${userDescription}"

AVAILABLE PRODUCTS:
${products.map((p, i) => `${i + 1}. ${p.name} - ₹${p.price} - ${p.description || ''}`).join('\n')}

Return ONLY the index number (1-${products.length}) of the best match.`;

        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: AI_MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
                max_tokens: 10
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const answer = response.data.choices[0].message.content.trim();
        const index = parseInt(answer) - 1;

        if (index >= 0 && index < products.length) {
            return products[index];
        }
    } catch (error) {
        console.error('Error selecting product:', error);
    }

    // Fallback: return first product
    return products[0];
}

module.exports = {
    analyzeQuotationRequirements,
    fetchProductsFromCategory,
    fetchMaterialsFromCategory,
    selectBestProduct
};
