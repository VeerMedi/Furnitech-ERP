const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.initialized = false;
  }

  /**
   * Initialize Google Sheets API with service account credentials
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Path to service account credentials
      const credentialsPath = path.join(__dirname, '../config/google-credentials.json');

      // Check if credentials file exists
      if (!fs.existsSync(credentialsPath)) {
        throw new Error('Google credentials file not found. Please add google-credentials.json in backend/config/');
      }

      // Load credentials
      const credentials = require(credentialsPath);

      // Create auth client
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      // Create sheets client
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.initialized = true;

      console.log('✅ Google Sheets Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Sheets Service:', error.message);
      throw error;
    }
  }

  /**
   * @param {string} spreadsheetId - Google Sheet ID
   * @param {string} sheetName - Name of the sheet tab
   * @param {number} [headerRowIndex=1] - Index of the header row (0-based). Default to 1 (Row 2).
   * @returns {Promise<Array>} - Array of row data
   */
  async fetchSheetData(spreadsheetId, sheetName, headerRowIndex = 1) {
    await this.initialize();

    try {
      // Wrap sheet name in single quotes to handle spaces and special characters
      const escapedSheetName = `'${sheetName.replace(/'/g, "''")}'`;
      const range = `${escapedSheetName}!A:Z`;

      console.log(`📡 Fetching from sheet: ${sheetName}`);
      console.log(`   Range: ${range}`);
      console.log(`   Using Header Row Index: ${headerRowIndex} (Row ${headerRowIndex + 1})`);
      logger.info(`📡 Fetching sheet data: ${sheetName} (Index: ${headerRowIndex})`);

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: range,
      });

      const rows = response.data.values;

      if (!rows || rows.length === 0) {
        return [];
      }

      // Use dynamic header index
      if (rows.length <= headerRowIndex) {
        console.warn(`⚠️ Sheet "${sheetName}" has fewer rows (${rows.length}) than header index (${headerRowIndex})`);
        return [];
      }

      const headers = rows[headerRowIndex];
      const dataRows = rows.slice(headerRowIndex + 1); // Start from row after header

      console.log('📋 Headers from Row 2:', headers);
      logger.info('📋 Headers found: ' + JSON.stringify(headers));
      console.log(`📊 Data rows from Row 3 onwards: ${dataRows.length} rows`);

      // Convert to array of objects
      const data = dataRows.map((row, index) => {
        const obj = {};
        headers.forEach((header, colIndex) => {
          obj[header] = row[colIndex] || '';
        });
        // Add original row index (1-based)
        // Row 1: Merged Header
        // Row 2: Column Headers
        // Row 3: First Data Row (index 0) => So index + 3
        obj._rowIndex = index + 3;
        return obj;
      });

      return data;
    } catch (error) {
      console.error('Error fetching sheet data:', error.message);
      throw error;
    }
  }

  /**
   * Mark rows as imported by changing background color to green
   * @param {string} spreadsheetId - Google Sheet ID
   * @param {string} sheetName - Sheet name
   * @param {Array} rowIndices - Array of row indices to mark (1-based, Row 3 = index 2)
   */
  async markRowsAsImported(spreadsheetId, sheetName, rowIndices) {
    await this.initialize();

    if (!rowIndices || rowIndices.length === 0) {
      console.log('⚠️ No rows to mark as imported');
      return;
    }

    try {
      console.log(`🎨 Marking ${rowIndices.length} rows as imported (green color) in "${sheetName}"`);

      // Get sheet metadata to find sheet ID
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });

      const sheet = response.data.sheets.find((s) => s.properties.title === sheetName);
      if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      const sheetId = sheet.properties.sheetId;

      // Create batch update requests to change row background color
      const requests = rowIndices.map((rowIndex) => ({
        repeatCell: {
          range: {
            sheetId: sheetId,
            startRowIndex: rowIndex - 1, // Convert 1-based to 0-based index
            endRowIndex: rowIndex, // End is exclusive
            startColumnIndex: 0,
            endColumnIndex: 20, // Cover columns A-T (adjust if needed)
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: {
                red: 0.85,   // Light green
                green: 0.95,
                blue: 0.85,
              },
            },
          },
          fields: 'userEnteredFormat.backgroundColor',
        },
      }));

      // Execute batch update
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });

      console.log(`✅ Successfully marked ${rowIndices.length} rows as imported with green color`);
    } catch (error) {
      console.error('❌ Error marking rows as imported:', error.message);
      throw error;
    }
  }

  /**
   * Move rows to a different sheet tab
   * @param {string} spreadsheetId - Google Sheet ID
   * @param {string} sourceSheet - Source sheet name
   * @param {string} targetSheet - Target sheet name
   * @param {Array} rowIndices - Array of row indices to move (1-based)
   */
  async moveRowsToSheet(spreadsheetId, sourceSheet, targetSheet, rowIndices) {
    await this.initialize();

    try {
      // First, check if target sheet exists, if not create it
      await this.ensureSheetExists(spreadsheetId, targetSheet);

      // Get source data
      const sourceData = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sourceSheet}!A:Z`,
      });

      const allRows = sourceData.data.values || [];
      const headers = allRows[0];

      // Get rows to move (convert 1-based to 0-based index)
      const rowsToMove = rowIndices.map((index) => allRows[index]).filter(Boolean);

      if (rowsToMove.length === 0) {
        return { moved: 0 };
      }

      // Get current data in target sheet
      let targetData;
      try {
        targetData = await this.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${targetSheet}!A:Z`,
        });
      } catch (error) {
        // Target sheet might be empty
        targetData = { data: { values: [] } };
      }

      const targetRows = targetData.data.values || [];
      const targetHasHeaders = targetRows.length > 0;

      // Prepare data to append
      const dataToAppend = targetHasHeaders ? rowsToMove : [headers, ...rowsToMove];

      // Append to target sheet
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${targetSheet}!A:A`,
        valueInputOption: 'RAW',
        requestBody: {
          values: dataToAppend,
        },
      });

      // Delete from source sheet (in reverse order to maintain indices)
      const sortedIndices = [...rowIndices].sort((a, b) => b - a);

      for (const rowIndex of sortedIndices) {
        await this.deleteRow(spreadsheetId, sourceSheet, rowIndex);
      }

      return { moved: rowsToMove.length };
    } catch (error) {
      console.error('Error moving rows:', error.message);
      throw error;
    }
  }

  /**
   * Ensure a sheet tab exists, create if not
   */
  async ensureSheetExists(spreadsheetId, sheetName) {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });

      const sheets = response.data.sheets || [];
      const sheetExists = sheets.some((sheet) => sheet.properties.title === sheetName);

      if (!sheetExists) {
        // Create the sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetName,
                  },
                },
              },
            ],
          },
        });
        console.log(`✅ Created new sheet tab: ${sheetName}`);
      }
    } catch (error) {
      console.error('Error ensuring sheet exists:', error.message);
      throw error;
    }
  }

  /**
   * Delete a row from sheet
   */
  async deleteRow(spreadsheetId, sheetName, rowIndex) {
    try {
      // Get sheet ID
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });

      const sheet = response.data.sheets.find((s) => s.properties.title === sheetName);
      if (!sheet) {
        throw new Error(`Sheet ${sheetName} not found`);
      }

      const sheetId = sheet.properties.sheetId;

      // Delete the row
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1,
                },
              },
            },
          ],
        },
      });
    } catch (error) {
      console.error('Error deleting row:', error.message);
      throw error;
    }
  }

  /**
   * Get list of all tabs in a spreadsheet
   * @param {string} spreadsheetId
   * @returns {Promise<Array<string>>}
   */
  async getTabs(spreadsheetId) {
    await this.initialize();
    try {
      const metadata = await this.getSheetMetadata(spreadsheetId);
      return metadata.sheets.map(s => s.name);
    } catch (error) {
      console.error('Error fetching tabs:', error.message);
      throw error;
    }
  }

  /**
   * Scan all tabs in a spreadsheet and fetch data from relevant ones
   * @param {string} spreadsheetId - Google Sheet ID
   * @param {Array<string>} [allowedTabs] - Optional list of specific tabs to scan
   * @returns {Promise<Object>} - Aggregated data and metadata
   */
  async scanAndFetchAllTabs(spreadsheetId, allowedTabs = null) {
    await this.initialize();

    try {
      // 1. Get all tab names
      const metadata = await this.getSheetMetadata(spreadsheetId);
      const allTabs = metadata.sheets.map(s => s.name);

      console.log(`🔍 Scanning ${allTabs.length} tabs in spreadsheet: ${metadata.title}`);

      const aggregatedData = [];
      const processedTabs = [];

      // Define flexible column keywords
      const COLUMN_KEYWORDS = {
        name: ['customer name', 'name', 'client name', 'person', 'full name', 'your name'],
        contact: ['contact number', 'contact', 'mobile', 'phone', 'cell', 'whatsapp', 'number'],
        email: ['email', 'email address', 'mail'],
        date: ['enquiry date & time', 'enquiry date', 'date', 'timestamp', 'time'],
        platform: ['lead platform', 'source', 'platform', 'how did you hear'],
        message: ['message', 'comment', 'query', 'requirement', 'demand']
      };

      // 2. Iterate through each tab
      for (const tabName of allTabs) {
        // FILTER: If user specified allowedTabs, skip if not in list
        // Use normalization (trim + lowercase) to ensure matching works even with minor differences
        if (allowedTabs && allowedTabs.length > 0) {
          const normalize = (str) => str ? str.toString().trim().toLowerCase() : '';
          const normalizedAllowed = allowedTabs.map(normalize);
          const normalizedCurrent = normalize(tabName);

          if (!normalizedAllowed.includes(normalizedCurrent)) {
            continue;
          }
        }

        try {
          // Escaping tab name
          const escapedTabName = `'${tabName.replace(/'/g, "''")}'`;

          // Fetch first 3 rows to check headers (sometimes header is on row 2 or 3)
          const headerResponse = await this.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${escapedTabName}!A1:Z3`,
          });

          const rows = headerResponse.data.values;
          if (!rows || rows.length === 0) continue;

          // Find header row - look for row containing ANY match for key columns
          let headerRowIndex = -1;
          let headerRow = null;

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowStr = row.join(' ').toLowerCase();

            // Check if this row looks like a header (contains at least one key field)
            const hasContact = COLUMN_KEYWORDS.contact.some(k => rowStr.includes(k));
            const hasName = COLUMN_KEYWORDS.name.some(k => rowStr.includes(k));
            const hasEmail = COLUMN_KEYWORDS.email.some(k => rowStr.includes(k));

            // Header found if it has Name OR Contact
            if (hasName || hasContact || hasEmail) {
              headerRowIndex = i;
              headerRow = row;
              break;
            }
          }

          if (!headerRow) {
            console.log(`⏩ Skipping tab "${tabName}": No header row identifying Name, Contact, or Email found`);
            processedTabs.push({
              name: tabName,
              status: 'no_header_found',
              reason: 'No row matched keywords: name, contact, email',
              rowsScanned: rows.length
            });
            continue;
          }

          console.log(`✅ Found relevant data in tab: "${tabName}" (Header at row ${headerRowIndex + 1})`);

          // 3. Fetch full data from this valid tab using the detected header row
          const fullData = await this.fetchSheetData(spreadsheetId, tabName, headerRowIndex);

          // Add tab name to each row for tracking
          // Add tab name to each row for tracking
          const dataWithSource = fullData.map(row => {
            // Normalize keys: Map "Your Name" -> "customerName", "Phone Number" -> "contact", etc.
            const normalizedRow = {
              _sourceTab: tabName,
              _headerRowIndex: headerRowIndex + 1,
              _rowIndex: row._rowIndex
            };

            // Helper to find matching value from row based on keywords
            const findValue = (keywords) => {
              for (const key of Object.keys(row)) {
                if (keywords.some(k => key.toLowerCase().includes(k))) {
                  return row[key];
                }
              }
              return '';
            };

            normalizedRow.customerName = findValue(COLUMN_KEYWORDS.name);
            normalizedRow.contact = findValue(COLUMN_KEYWORDS.contact);
            normalizedRow.email = findValue(COLUMN_KEYWORDS.email);
            normalizedRow.platform = findValue(COLUMN_KEYWORDS.platform) || 'Google Sheet';
            // Store all other raw data in 'meta' or flat (optional, depending on requirement)
            // For now, let's keep original keys too just in case
            return { ...row, ...normalizedRow };
          });

          aggregatedData.push(...dataWithSource);
          processedTabs.push({
            name: tabName,
            status: 'matched',
            headerRowIndex: headerRowIndex,
            columnsFound: Object.keys(dataWithSource[0] || {}),
            rowCount: dataWithSource.length
          });

        } catch (err) {
          console.error(`⚠️ Error scanning tab "${tabName}":`, err.message);
          // Continue to next tab even if one fails
        }
      }

      return {
        data: aggregatedData,
        tabsScanned: allTabs,
        tabsUsed: processedTabs,
        totalRows: aggregatedData.length,
        debug: {
          allTabsAvailable: allTabs,
          allowedTabsReceived: allowedTabs,
          filteredTabs: allTabs.filter(t => !allowedTabs || allowedTabs.length === 0 || allowedTabs.includes(t)),
          tabDetails: processedTabs // Detailed info on why a tab was matched or skipped
        }
      };

    } catch (error) {
      console.error('Error scanning tabs:', error.message);
      throw error;
    }
  }

  /**
   * Get sheet metadata (sheet names, etc.)
   */
  async getSheetMetadata(spreadsheetId) {
    await this.initialize();

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });

      return {
        title: response.data.properties.title,
        sheets: response.data.sheets.map((sheet) => ({
          name: sheet.properties.title,
          id: sheet.properties.sheetId,
          index: sheet.properties.index,
        })),
      };
    } catch (error) {
      console.error('Error getting sheet metadata:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new GoogleSheetsService();
