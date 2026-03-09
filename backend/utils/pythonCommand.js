/**
 * Cross-platform Python command resolver
 * Uses virtual environment (venv) for isolated dependencies
 */
const { execSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

let cachedPythonCommand = null;

/**
 * Get the correct Python command for the current platform
 * Prioritizes venv Python, falls back to system Python
 * @returns {string} Full path to Python executable
 */
function getPythonCommand() {
    // Return cached result if available
    if (cachedPythonCommand) {
        return cachedPythonCommand;
    }

    // Try to use venv Python first
    const projectRoot = path.join(__dirname, '../..');
    const venvPaths = [
        path.join(projectRoot, 'AI', '.venv', 'Scripts', 'python.exe'), // Windows .venv
        path.join(projectRoot, 'AI', '.venv', 'bin', 'python3'),        // Unix/Mac .venv
        path.join(projectRoot, 'AI', '.venv', 'bin', 'python'),         // Unix/Mac .venv fallback
        path.join(projectRoot, 'AI', 'venv', 'Scripts', 'python.exe'), // Windows venv
        path.join(projectRoot, 'AI', 'venv', 'bin', 'python3'),        // Unix/Mac venv
        path.join(projectRoot, 'AI', 'venv', 'bin', 'python')          // Unix/Mac venv fallback
    ];

    // Check if venv Python exists
    for (const venvPath of venvPaths) {
        if (fs.existsSync(venvPath)) {
            cachedPythonCommand = venvPath;
            console.log(`✅ Using venv Python: ${venvPath}`);
            return venvPath;
        }
    }

    // Fall back to system Python
    try {
        // Try python3 first (preferred on Mac/Linux)
        execSync('python3 --version', { stdio: 'ignore' });
        cachedPythonCommand = 'python3';
        console.log('⚠️  venv not found, using system python3');
        return 'python3';
    } catch (error) {
        // Fall back to python (Windows default)
        try {
            execSync('python --version', { stdio: 'ignore' });
            cachedPythonCommand = 'python';
            console.log('⚠️  venv not found, using system python');
            return 'python';
        } catch (error) {
            // Last resort: use platform-based detection
            const platform = os.platform();
            cachedPythonCommand = platform === 'win32' ? 'python' : 'python3';
            console.log(`⚠️  Python not found, using ${cachedPythonCommand} based on platform`);
            return cachedPythonCommand;
        }
    }
}

module.exports = { getPythonCommand };

