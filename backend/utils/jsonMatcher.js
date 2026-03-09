const fs = require('fs').promises;
const path = require('path');

/**
 * Sanitize filename: Remove timestamp, extension, special chars
 * Example: "1770593416245_Furniture_layount.pdf" → "furniture_layount"
 */
function sanitizeFilename(filename) {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.(pdf|PDF)$/, '');

  // Remove timestamp prefix if present (pattern: {digits}_)
  const withoutTimestamp = nameWithoutExt.replace(/^\d+_/, '');

  // Convert to lowercase for case-insensitive matching
  return withoutTimestamp.toLowerCase();
}

/**
 * Find matching JSON files in scan_results directory
 * @param {string} pdfName - Original PDF filename
 * @param {string} scanResultsDir - Path to scan_results directory
 * @returns {Array} Array of matching file objects with timestamp, filename, fullPath
 */
async function findMatchingJson(pdfName, scanResultsDir) {
  const sanitized = sanitizeFilename(pdfName);

  try {
    const files = await fs.readdir(scanResultsDir);

    const matches = files
      .filter(file => file.endsWith('_result.json'))
      .filter(file => {
        // Remove '_result.json' suffix
        const fileBase = file.replace('_result.json', '');

        // Check for both formats:
        // 1. Direct match: {name}_result.json
        // 2. Timestamp match: {timestamp}_{name}_result.json

        const sanitizedFileBase = sanitizeFilename(fileBase);

        return sanitizedFileBase === sanitized;
      })
      .map(file => {
        // Extract timestamp from filename if present
        const match = file.match(/^(\d+)_/);
        const timestamp = match ? parseInt(match[1]) : 0;

        return {
          filename: file,
          timestamp: timestamp,
          fullPath: path.join(scanResultsDir, file)
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp); // Most recent first

    return matches;
  } catch (error) {
    console.error('Error reading scan results directory:', error);
    return [];
  }
}

/**
 * Get most recent matching JSON file
 */
async function getMostRecentMatch(pdfName, scanResultsDir) {
  const matches = await findMatchingJson(pdfName, scanResultsDir);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Read and parse JSON file
 */
async function readJsonFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read JSON file: ${error.message}`);
  }
}

/**
 * Validate scan result JSON structure
 */
function validateScanResult(jsonData) {
  if (!jsonData.pages || !Array.isArray(jsonData.pages)) {
    return { valid: false, error: 'Missing or invalid "pages" array' };
  }

  if (jsonData.pages.length === 0) {
    return { valid: false, error: 'Empty pages array' };
  }

  const firstPage = jsonData.pages[0];
  if (!firstPage.analysis || !firstPage.analysis.data) {
    return { valid: false, error: 'Missing analysis data in first page' };
  }

  return { valid: true };
}

module.exports = {
  sanitizeFilename,
  findMatchingJson,
  getMostRecentMatch,
  readJsonFile,
  validateScanResult
};
