const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const googleSheetsService = require('../services/googleSheetsService');
const Inquiry = require('../models/vlite/Inquiry');
const Product = require('../models/vlite/Product');
const User = require('../models/vlite/User');
const EmailService = require('../utils/emailService');
const leadScoring = require('../../AI/lead tracking/leadScoring');

/**
 * Google Sheets Configuration
 */
/**
 * Google Sheets Configuration Registry
 * Define all 8 source sheets here
 */
const SHEET_SOURCES = {
  'sheet1': { name: 'India Meta Leads', spreadsheetId: '1e8tp-4owvKz8VgXeGCjuEMIf1rJm9ahL3JBi5vXfQcE', sheetName: 'India Meta Leads' },
  'sheet2': { name: 'Vlite - SEO (External)', spreadsheetId: '1U9FGraQcZ8NWU9aMZno721WtmHJ2mGmsKuJDAFyfeDI', sheetName: 'Vlite - SEO (External)' },
  'sheet3': { name: 'Vlite Google Ads Landing page + Whatsapp', spreadsheetId: '1XN1mSFBx13sqbUw7dAToXQge5vLfXuZtUnS4ZmFTQck', sheetName: 'Vlite Google Ads Landing page + Whatsapp' },
  'sheet4': { name: 'Vlite Weekly Report Sheet', spreadsheetId: '1YQQR75uXFYiwijhU4x3f-k7V6mHHXEr1vpZF4Pwr_oc', sheetName: 'Vlite Weekly Report Sheet of SEO and Digital Marketing Team' },
  'sheet5': { name: 'Nepal Meta Leads', spreadsheetId: '1NlMA8YgxIm-BvZSkTQUAya9oExPrz4rFJYXdiMfbqTw', sheetName: 'Nepal Meta Leads' },
  'sheet6': { name: 'Meta Lucknow', spreadsheetId: '1i5u8qPYCKOfmO05S5tf5xtvVkUN-YXCVnCqnh0aI504', sheetName: 'Meta Lucknow' },
  'sheet7': { name: 'Meta Indore', spreadsheetId: '1KBU2ZTsUPNxrpGFjf4hr9N51qfPhvh8LwYWqqGF9ePs', sheetName: 'Meta Indore' },
  'sheet8': { name: 'Meta Surat', spreadsheetId: '1N7BPi90_3UeIFzqR7neSvnK8sTkjA5F7gCKVro65GwU', sheetName: 'Meta Surat' },
};

const DEFAULT_SOURCE_KEY = 'sheet1';

/**
 * Get available tabs from a specific Google Sheet source
 */
exports.getTabsFromSheet = async (req, res) => {
  try {
    const sourceKey = req.query.source || DEFAULT_SOURCE_KEY;
    const sourceConfig = SHEET_SOURCES[sourceKey];

    if (!sourceConfig) {
      return res.status(400).json({
        success: false,
        message: `Invalid source key: ${sourceKey}`,
      });
    }

    console.log(`📑 Fetching tabs list for source: ${sourceKey}`);
    const tabs = await googleSheetsService.getTabs(sourceConfig.spreadsheetId);

    return res.status(200).json({
      success: true,
      tabs: tabs
    });
  } catch (error) {
    console.error('Error fetching tabs list:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch tabs list',
      error: error.message
    });
  }
};

/**
 * Preview inquiries from Google Sheets (without creating)
 */
exports.previewInquiriesFromSheet = async (req, res) => {
  try {
    const organization = req.headers['x-tenant-id'] || '6935417d57433de522df0bbe';

    // Get source key from body (POST) or query (GET), default to sheet1
    const sourceKey = req.body.source || req.query.source || DEFAULT_SOURCE_KEY;
    const sourceConfig = SHEET_SOURCES[sourceKey];

    if (!sourceConfig) {
      return res.status(400).json({
        success: false,
        message: `Invalid source key: ${sourceKey}`,
      });
    }

    console.log(`🔍 Previewing inquiries from ${sourceConfig.name} (${sourceKey}) for org: ${organization}`);
    console.log(`📡 Scanning all tabs to find relevant data...`);

    // Get allowed tabs from body (POST) or query (GET)
    const allowedTabs = req.body.tabs || (req.query.tabs ? req.query.tabs.split(',') : null);

    console.log(`📡 Scanning tabs with filter: ${allowedTabs ? allowedTabs.join(', ') : 'ALL TABS'}`);

    // Fetch data from Google Sheets using DYNAMIC SCANNING
    const scanResult = await googleSheetsService.scanAndFetchAllTabs(sourceConfig.spreadsheetId, allowedTabs);

    logger.info('🔍 SCAN RESULT DEBUG: ' + JSON.stringify(scanResult?.debug, null, 2));

    if (!scanResult || scanResult.totalRows === 0) {
      return res.status(200).json({
        success: true,
        message: 'No inquiries found in any relevant tabs',
        data: [],
        count: 0,
        tabsScanned: scanResult?.tabsScanned || [],
        debug: scanResult?.debug || {}
      });
    }

    const sheetData = scanResult.data;
    console.log(`📊 Found total ${sheetData.length} rows across ${scanResult.tabsUsed.length} tabs: ${scanResult.tabsUsed.join(', ')}`);

    // Log first row to see what we're getting
    if (sheetData.length > 0) {
      console.log('First row columns from first match:', Object.keys(sheetData[0]));
      console.log('First row data:', sheetData[0]);
    }

    // Filter out empty rows using NORMALIZED keys
    const validRows = sheetData.filter(row => {
      // Service already normalized 'Your Name' -> 'customerName'
      // We check if customerName exists (or at least contact/email) to consider it valid
      const hasName = row.customerName && row.customerName.toString().trim().length > 0;
      const hasContact = row.contact && row.contact.toString().trim().length > 0;

      // Keep row if it has Name or Contact
      return hasName || hasContact;
    });

    console.log(`✅ Filtered: ${sheetData.length} total rows -> ${validRows.length} valid data rows`);

    // Map data for preview AND check for duplicates
    const previewData = await Promise.all(validRows.map(async (row, index) => {
      // Use NORMALIZED values from service
      const contact = (row.contact || '').toString().trim();
      const email = (row.email || '').toString().trim();
      const customerName = (row.customerName || '').toString().trim();

      // Fallback to fuzzy match only for fields NOT normalized yet
      const KEYWORDS = {
        company: ['company name', 'company', 'business'],
        product: ['product demand', 'product', 'item'],
        quantity: ['demand quantity', 'quantity', 'qty'],
        message: ['message', 'notes', 'comments', 'your comments'],
        address: ['address', 'location', 'city'],
        status: ['status'],
        priority: ['priority']
      };

      const companyName = (getValueByFuzzyKey(row, KEYWORDS.company) || '').trim();
      const productDemand = (getValueByFuzzyKey(row, KEYWORDS.product) || '').trim();
      const demandQuantity = (getValueByFuzzyKey(row, KEYWORDS.quantity) || '').trim();
      const sourceTab = row._sourceTab || 'Unknown Tab';
      const rowAddress = (getValueByFuzzyKey(row, KEYWORDS.address) || '').trim();
      const message = (getValueByFuzzyKey(row, KEYWORDS.message) || '').trim();

      // Use Platform if normalized, else fuzzy
      const leadPlatform = row.platform || (getValueByFuzzyKey(row, ['lead platform', 'platform', 'source', 'how did you hear']) || 'Google Sheet').trim();

      // Use original row values if available for Date/Time (or normalize them in service too)
      // For now, rely on fuzzy or raw
      const rowDate = (getValueByFuzzyKey(row, ['date', 'enquiry date', 'timestamp']) || '').trim();
      const rowTime = (getValueByFuzzyKey(row, ['time', 'enquiry time']) || '').trim();
      const rowMessage = (getValueByFuzzyKey(row, KEYWORDS.message) || '').trim();
      const rowPlatform = (getValueByFuzzyKey(row, KEYWORDS.platform) || 'Other').trim();

      // Check if inquiry already exists
      let existingInquiry = null;
      if (contact) {
        const duplicateQuery = {
          organization,
          'meta.contact': contact
        };
        // Also check name if matches
        if (customerName) {
          duplicateQuery['meta.customerName'] = customerName;
        }

        existingInquiry = await Inquiry.findOne(duplicateQuery)
          .select('_id customerName companyName meta.customerName meta.contact meta.email meta.productDemand meta.demandQuantity createdAt');
      }

      return {
        rowIndex: index + 1, // Just a visual index here
        originalRowIndex: row._rowIndex || index + 3,
        sourceTab: sourceTab, // Show which tab it came from
        customerName: customerName,
        companyName: companyName,
        contact: contact,
        email: email,
        address: rowAddress,
        enquiryDate: rowDate,
        enquiryTime: rowTime,
        status: (getValueByFuzzyKey(row, KEYWORDS.status) || 'OPEN'),
        priority: (getValueByFuzzyKey(row, KEYWORDS.priority) || 'medium'),
        leadStatus: '',
        productName: productDemand,
        quantity: demandQuantity,
        productDetails: '',
        message: rowMessage,
        leadPlatform: rowPlatform,
        isDuplicate: !!existingInquiry,
        existingInquiry: existingInquiry ? {
          id: existingInquiry._id,
          createdAt: existingInquiry.createdAt,
        } : null,
      };
    }));

    const duplicateCount = previewData.filter(item => item.isDuplicate).length;
    console.log(`📊 Preview: ${previewData.length} inquiries ready`);
    console.log(`⚠️ Found ${duplicateCount} duplicate entries`);

    return res.status(200).json({
      success: true,
      message: `Found ${previewData.length} inquiries across ${scanResult.tabsUsed.length} tabs`,
      data: previewData,
      count: previewData.length,
      duplicates: duplicateCount,
      tabsUsed: scanResult.tabsUsed
    });
  } catch (error) {
    console.error('❌ Error previewing inquiries from Google Sheets:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to preview inquiries from Google Sheets',
      error: error.message,
    });
  }
};

/**
 * Fetch and import inquiries from Google Sheets
 */
/**
 * Fetch and import inquiries from Google Sheets
 */
exports.fetchInquiriesFromSheet = async (req, res) => {
  try {
    const organization = req.headers['x-tenant-id'];
    const userId = req.user?.id || req.user?._id || null;

    // Get params from query or body
    const sourceKey = req.query.source || req.body.source || DEFAULT_SOURCE_KEY;
    const allowedTabs = req.body.tabs || (req.query.tabs ? req.query.tabs.split(',') : null);

    const sourceConfig = SHEET_SOURCES[sourceKey];

    if (!sourceConfig) {
      return res.status(400).json({
        success: false,
        message: `Invalid source key: ${sourceKey}`,
      });
    }

    if (!organization) {
      return res.status(400).json({
        success: false,
        message: 'Missing tenant ID',
      });
    }

    console.log(`🔄 Starting inquiry fetch from ${sourceConfig.name} for org: ${organization}`);
    if (allowedTabs && allowedTabs.length > 0) {
      console.log(`🎯 Fetching from specific tabs: ${allowedTabs.join(', ')}`);
    } else {
      console.log(`📡 Scanning all tabs...`);
    }

    // Step 1: scan relevant tabs
    const scanResult = await googleSheetsService.scanAndFetchAllTabs(
      sourceConfig.spreadsheetId,
      allowedTabs
    );

    if (!scanResult || scanResult.totalRows === 0) {
      return res.status(200).json({
        success: true,
        message: 'No inquiries found in any relevant tabs',
        stats: {
          total: 0,
          created: 0,
          skipped: 0,
          failed: 0,
        },
      });
    }

    const sheetData = scanResult.data;
    console.log(`📊 Found ${sheetData.length} rows across ${scanResult.tabsUsed.length} tabs`);

    // Step 2: Process inquiries in batches of 50
    const BATCH_SIZE = 50;
    const batches = [];
    for (let i = 0; i < sheetData.length; i += BATCH_SIZE) {
      batches.push(sheetData.slice(i, i + BATCH_SIZE));
    }

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    const allCreatedInquiries = [];

    // Group rows to mark as imported by TAB NAME
    const rowsToMarkByTab = {};

    // Step 3: Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} rows)`);

      const batchResults = await Promise.allSettled(
        batch.map((row, index) => {
          // Use original row index if available, otherwise fallback (though fallback won't help for marking)
          const originalRowIndex = row._rowIndex;
          return processInquiryRow(row, organization, userId, originalRowIndex);
        })
      );

      // Analyze batch results
      batchResults.forEach((result, index) => {
        const rowData = batch[index];
        const tabName = rowData._sourceTab;

        if (result.status === 'fulfilled') {
          const { status, rowIndex, inquiry } = result.value;
          if (status === 'created') {
            totalCreated++;
            if (inquiry) allCreatedInquiries.push(inquiry);

            // Add to marking list for specific tab
            if (tabName && rowIndex) {
              if (!rowsToMarkByTab[tabName]) {
                rowsToMarkByTab[tabName] = [];
              }
              rowsToMarkByTab[tabName].push(rowIndex);
            }
          } else if (status === 'skipped') {
            totalSkipped++;
          }
        } else {
          totalFailed++;
          console.error(`❌ Failed to process row from tab "${tabName}": ${result.reason}`);
        }
      });
    }

    // --- NOTIFICATION LOGIC FOR BULK IMPORT ---
    if (allCreatedInquiries.length > 0) {
      try {
        // Find Admin users for this organización
        const admins = await User.find({
          organizationId: organization,
          userRole: 'Admin',
          isActive: true
        }).select('email firstName lastName');

        if (admins.length > 0) {
          // 🔥 Redirect admin alerts to mohitrathormohit33@gmail.com for testing/verification
          const redirectedAdmins = admins.map(a => ({
            ...a.toObject(),
            email: 'mohitrathormohit33@gmail.com'
          }));
          await EmailService.sendBulkInquiryNotification(allCreatedInquiries, redirectedAdmins);
          console.log(`✉️ Bulk Inquiry notification redirected to mohitrathormohit33@gmail.com for ${allCreatedInquiries.length} leads`);
        }
      } catch (notifyErr) {
        console.error('Failed to send bulk inquiry notification:', notifyErr.message);
      }
    }
    // ------------------------------------------

    // Step 4: Mark successfully imported rows as green PER TAB
    const tabsToMark = Object.keys(rowsToMarkByTab);
    if (tabsToMark.length > 0) {
      console.log(`🎨 Marking rows as imported in ${tabsToMark.length} tabs...`);

      for (const tabName of tabsToMark) {
        const rowsToMark = rowsToMarkByTab[tabName];
        if (rowsToMark.length > 0) {
          try {
            console.log(`   Processing tab: "${tabName}" (${rowsToMark.length} rows)`);
            await googleSheetsService.markRowsAsImported(
              sourceConfig.spreadsheetId,
              tabName,
              rowsToMark
            );
          } catch (markError) {
            console.error(`⚠️ Warning: Failed to mark rows in "${tabName}":`, markError.message);
          }
        }
      }
      console.log(`✅ Finished marking rows.`);
    }

    // Step 5: Return results
    const stats = {
      total: sheetData.length,
      created: totalCreated,
      skipped: totalSkipped,
      failed: totalFailed,
      tabsProcessed: scanResult.tabsUsed
    };

    console.log(`✅ Import completed:`, stats);

    return res.status(200).json({
      success: true,
      message: `Successfully processed ${stats.total} inquiries from ${scanResult.tabsUsed.length} tabs`,
      stats,
    });
  } catch (error) {
    console.error('❌ Error fetching inquiries from Google Sheets:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch inquiries from Google Sheets',
      error: error.message,
    });
  }
};

/**
 * Generate Customer ID in format CUST-YYYY-NNN
 * Example: CUST-2025-001, CUST-2025-002, etc.
 */
async function generateCustomerId(organization) {
  const currentYear = new Date().getFullYear();
  const prefix = `CUST-${currentYear}-`;

  // Find the latest customer ID for this year
  const latestInquiry = await Inquiry.findOne({
    organization,
    customerId: { $regex: `^${prefix}` }
  })
    .sort({ createdAt: -1 })
    .select('customerId');

  let nextNumber = 1;

  if (latestInquiry && latestInquiry.customerId) {
    // Extract the number from the last customer ID
    const lastNumber = parseInt(latestInquiry.customerId.split('-')[2]) || 0;
    nextNumber = lastNumber + 1;
  }

  // Format with leading zeros (3 digits)
  const formattedNumber = String(nextNumber).padStart(3, '0');
  return `${prefix}${formattedNumber}`;
}

/**
 * Map Google Sheet status values to Inquiry enum values
 */
function mapSheetStatusToEnum(sheetStatus) {
  if (!sheetStatus) return 'OPEN';
  const status = sheetStatus.toUpperCase();
  // Map common sheet values to enum values
  const statusMap = {
    'NEW': 'OPEN',
    'OPEN': 'OPEN',
    'PENDING': 'REQUESTED',
    'REQUESTED': 'REQUESTED',
    'RESPONDED': 'RESPONDED',
    'CLOSED': 'CLOSED',
    'CANCELLED': 'CANCELLED',
    'CANCELED': 'CANCELLED'
  };
  return statusMap[status] || 'OPEN';
}

/**
 * Map Google Sheet lead status values to Inquiry enum values
 */
function mapSheetLeadStatusToEnum(sheetLeadStatus) {
  if (!sheetLeadStatus) return 'NEW';
  const status = sheetLeadStatus.toUpperCase();
  // Map common sheet values to enum values
  const statusMap = {
    'NEW': 'NEW',
    'OPEN': 'NEW',
    'CONTACTED': 'CONTACTED',
    'QUALIFIED': 'QUALIFIED',
    'UNQUALIFIED': 'UNQUALIFIED',
    'CONVERTED': 'CONVERTED',
    'LOST': 'LOST',
    'CLOSED': 'CONVERTED'
  };
  return statusMap[status] || 'NEW';
}

/**
 * Helper to get value from row using flexible keys
 */
function getValueByFuzzyKey(row, keywords) {
  if (!row || !keywords) return '';

  // Try exact match first
  for (const key of Object.keys(row)) {
    const keyLower = key.toLowerCase();
    // Check if key matches any of the keywords
    if (keywords.some(k => keyLower.includes(k))) {
      return row[key] || '';
    }
  }
  return '';
}

/**
 * Process a single inquiry row from Google Sheets
 */
async function processInquiryRow(row, organization, userId, rowIndex) {
  try {
    // Define column keywords for mapping
    const KEYWORDS = {
      name: ['customer name', 'name', 'client name', 'person', 'full name', 'your name'],
      company: ['company name', 'company', 'business'],
      contact: ['contact number', 'contact', 'mobile', 'phone', 'cell', 'whatsapp', 'number'],
      email: ['email', 'mail', 'email address'],
      address: ['address', 'location', 'city'],
      date: ['enquiry date & time', 'enquiry date', 'date', 'timestamp'],
      time: ['enquiry time', 'time'],
      status: ['status'],
      priority: ['priority'],
      leadStatus: ['lead status', 'stage'],
      product: ['product demand', 'product', 'item', 'requirement'],
      quantity: ['demand quantity', 'quantity', 'qty'],
      details: ['product details', 'details', 'specifications'],
      message: ['message', 'notes', 'remarks', 'comment', 'your comments'],
      platform: ['lead platform', 'platform', 'source', 'how did you hear']
    };

    // Helper to get mapped value or fuzzy fallback
    // Prioritize normalized keys that come from the service if they exist on the row
    const getVal = (normKey, fuzzyKeywords) => {
      // 1. Try normalized key from service (if service put it on row object)
      if (row[normKey] !== undefined) return row[normKey].toString().trim();

      // 2. Try fuzzy match
      return (getValueByFuzzyKey(row, fuzzyKeywords) || '').trim();
    };

    // Special handling for Name vs Company
    // If we use fuzzy match for name, we must ensure it doesn't match "Company Name"
    const getNameVal = () => {
      if (row.customerName) return row.customerName.toString().trim();
      const val = getValueByFuzzyKey(row, KEYWORDS.name);
      // If the found value is exactly the same as the found company name, ignore it? 
      // Better: In getValueByFuzzyKey we should exclude keys containing 'company' when looking for 'name'
      return (val || '').trim();
    };

    // Parse Combined Date & Time (e.g. "01/27/2026, 06:09 PM")
    let rawDate = getVal('enquiryDate', KEYWORDS.date);
    let rawTime = getVal('enquiryTime', KEYWORDS.time);

    // If date contains a comma or looks long, try to split
    if (rawDate.includes(',') && !rawTime) {
      const parts = rawDate.split(',');
      if (parts.length >= 2) {
        rawDate = parts[0].trim();
        rawTime = parts.slice(1).join(',').trim();
      }
    }

    // Map Google Sheet columns to Inquiry fields
    const inquiryData = {
      // Customer Information
      customerName: getNameVal(),
      companyName: getVal('companyName', KEYWORDS.company),
      // customerId: Will be auto-generated
      contact: getVal('contact', KEYWORDS.contact),
      email: getVal('email', KEYWORDS.email),
      address: getVal('address', KEYWORDS.address),

      // Inquiry Details
      enquiryDate: rawDate,
      enquiryTime: rawTime,

      status: mapSheetStatusToEnum(getVal('status', KEYWORDS.status)),
      priority: (getVal('priority', KEYWORDS.priority) || 'medium').toLowerCase(),
      leadStatus: mapSheetLeadStatusToEnum(getVal('leadStatus', KEYWORDS.leadStatus)),

      // Product Details
      productName: getVal('productDemand', KEYWORDS.product),
      quantity: getVal('demandQuantity', KEYWORDS.quantity) || '1',
      productDetails: getVal('productDetails', KEYWORDS.details),

      // Message/Notes
      message: getVal('message', KEYWORDS.message),

      // Lead Platform
      leadPlatform: getVal('platform', KEYWORDS.platform) || 'Other',
    };

    // Validation: Require at least customer name OR contact
    // Sometimes name might be missing but contact is there, or vice versa
    if (!inquiryData.customerName && !inquiryData.contact) {
      console.log(`⏭️ Skipping row ${rowIndex}: Missing both customer name and contact`);
      return { status: 'skipped', rowIndex };
    }

    // If name is missing but contact exists, use contact as name placeholder
    if (!inquiryData.customerName) {
      inquiryData.customerName = `Unknown (${inquiryData.contact})`;
    }

    // Check for duplicate inquiry - ALL fields must match
    const duplicateQuery = {
      organization,
      // 'meta.contact': inquiryData.contact,
    };

    // Flexible duplicate check
    if (inquiryData.contact) duplicateQuery['meta.contact'] = inquiryData.contact;
    if (inquiryData.customerName && inquiryData.customerName !== `Unknown (${inquiryData.contact})`) {
      duplicateQuery['meta.customerName'] = inquiryData.customerName;
    }

    // Add optional fields if they exist in new data
    if (inquiryData.email) duplicateQuery['meta.email'] = inquiryData.email;

    const existingInquiry = await Inquiry.findOne(duplicateQuery);

    if (existingInquiry) {
      console.log(`⏭️ Skipping row ${rowIndex}: Duplicate inquiry found for ${inquiryData.customerName}`);
      return { status: 'skipped', rowIndex };
    }

    // NO product creation - items array remains EMPTY
    const items = [];

    // Prepare inquiry object for AI scoring
    const inquiryForScoring = {
      customerName: inquiryData.customerName,
      companyName: inquiryData.companyName,
      contact: inquiryData.contact,
      email: inquiryData.email,
      address: inquiryData.address,
      leadPlatform: inquiryData.leadPlatform,
      items: [],
      notes: inquiryData.message,
      priority: inquiryData.priority,
      leadStatus: inquiryData.leadStatus,
    };

    // Apply AI lead scoring
    let aiScore = null;
    let aiInsights = null;
    let probability = 50; // Default

    try {
      const scoringResult = await leadScoring.scoreInquiry(inquiryForScoring);
      if (scoringResult && scoringResult.score !== undefined) {
        aiScore = {
          validation: { passed: true, issues: [] },
          confidence: scoringResult.confidence || 0.7,
          lastEvaluatedAt: new Date(),
        };
        probability = scoringResult.probability || scoringResult.score;

        if (scoringResult.priority) {
          const priorityMap = {
            HOT: 'high',
            WARM: 'medium',
            COLD: 'low',
          };
          inquiryData.priority = priorityMap[scoringResult.priority] || inquiryData.priority;
        }

        aiInsights = scoringResult.insights || [];
      }
    } catch (scoringError) {
      console.warn(`⚠️ AI scoring failed for row ${rowIndex}:`, scoringError.message);
    }

    // Generate Customer ID in format CUST-YYYY-NNN
    const customerId = await generateCustomerId(organization);

    // Create the inquiry
    const newInquiry = new Inquiry({
      organization,
      createdBy: userId,

      // Customer info
      companyName: inquiryData.companyName || inquiryData.customerName,
      customerId: customerId,

      // Items
      items,

      // Lead tracking - Force Google Sheets if platform is invalid
      leadPlatform: (() => {
        const VALID_PLATFORMS = ['Website', 'Instagram', 'Facebook', 'WhatsApp', 'Google Ads', 'Meta Ads', 'SEO', 'Referral', 'Walk-in', 'Phone Call', 'Email', 'Google Sheets', 'Other'];
        const platform = inquiryData.leadPlatform;
        // If exact match, use it. Else if 'Google Sheet' or not in list, use 'Google Sheets'
        if (VALID_PLATFORMS.includes(platform)) return platform;
        return 'Google Sheets';
      })(),

      leadStatus: inquiryData.leadStatus,
      probability,
      priority: inquiryData.priority,

      // Status
      status: inquiryData.status,

      // Notes
      notes: inquiryData.message,

      // AI scoring
      ai: aiScore,

      // Meta information - Store all customer contact info here
      meta: {
        importedFromGoogleSheets: true,
        importedAt: new Date(),
        sheetRowIndex: rowIndex,
        sourceTab: row._sourceTab || 'Unknown',
        // Customer contact details
        customerName: inquiryData.customerName,
        contact: inquiryData.contact,
        email: inquiryData.email,
        address: inquiryData.address,
        // Product demand details  
        productDemand: inquiryData.productName,
        demandQuantity: inquiryData.quantity,
        // Inquiry timing
        enquiryDate: inquiryData.enquiryDate,
        enquiryTime: inquiryData.enquiryTime,
        aiInsights,
      },
    });

    console.log(`📝 Saving inquiry with meta:`, {
      productDemand: inquiryData.productName,
      demandQuantity: inquiryData.quantity,
      contact: inquiryData.contact,
      email: inquiryData.email,
      itemsCount: items.length
    });

    await newInquiry.save();
    console.log(`✅ Created inquiry for ${inquiryData.customerName} (row ${rowIndex})`);

    return { status: 'created', rowIndex, inquiry: newInquiry };
  } catch (error) {
    // Log explicit validation errors if available
    const errorDetails = error.errors
      ? Object.keys(error.errors).map(k => `${k}: ${error.errors[k].message}`).join(', ')
      : error.message;

    logger.error(`❌ Error processing row ${rowIndex}: ${errorDetails}`);
    console.error(`❌ Error processing row ${rowIndex}: ${errorDetails}`);
    throw error;
  }
}

/**
 * Check if inquiry is a duplicate (all relevant fields match)
 */
function checkIfDuplicate(existingInquiry, newInquiryData) {
  // Check if ALL important fields match exactly
  const customerNameMatch =
    (existingInquiry.meta?.customerName || existingInquiry.customerName || '') === newInquiryData.customerName;

  const companyNameMatch =
    (existingInquiry.companyName || '') === newInquiryData.companyName;

  const contactMatch =
    (existingInquiry.meta?.contact || existingInquiry.contact || '') === newInquiryData.contact;

  const emailMatch =
    (existingInquiry.meta?.email || existingInquiry.email || '') === newInquiryData.email;

  const productDemandMatch =
    (existingInquiry.meta?.productDemand || '') === newInquiryData.productName;

  const demandQuantityMatch =
    (existingInquiry.meta?.demandQuantity || '') === newInquiryData.quantity;

  // Duplicate ONLY if ALL fields match
  const isDuplicate = customerNameMatch &&
    companyNameMatch &&
    contactMatch &&
    emailMatch &&
    productDemandMatch &&
    demandQuantityMatch;

  if (isDuplicate) {
    console.log(`🔍 Duplicate check - ALL fields matched for ${newInquiryData.customerName}`);
  }

  return isDuplicate;
}

/**
 * Get Google Sheets configuration
 */
exports.getSheetConfig = async (req, res) => {
  try {
    // Return the full list of available sources
    return res.status(200).json({
      success: true,
      sources: SHEET_SOURCES,
      defaultSource: DEFAULT_SOURCE_KEY
    });
  } catch (error) {
    console.error('Error getting sheet config:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get sheet configuration',
      error: error.message,
    });
  }
};

/**
 * Test Google Sheets connection
 */
exports.testConnection = async (req, res) => {
  try {
    await googleSheetsService.initialize();

    // Test with default sheet
    const defaultSource = SHEET_SOURCES[DEFAULT_SOURCE_KEY];
    const metadata = await googleSheetsService.getSheetMetadata(defaultSource.spreadsheetId);

    return res.status(200).json({
      success: true,
      message: 'Google Sheets connection successful',
      metadata,
    });
  } catch (error) {
    console.error('Connection test failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Google Sheets connection failed',
      error: error.message,
    });
  }
};

/**
 * Delete inquiries imported in last 24 hours
 */
exports.deleteLastImportedInquiries = async (req, res) => {
  try {
    const organization = req.headers['x-tenant-id'];
    // No authentication for now, userId not needed for deletion
    const userId = null;

    if (!organization) {
      return res.status(400).json({
        success: false,
        message: 'Missing tenant ID',
      });
    }

    console.log(`🗑️ Deleting last 24h imported inquiries for org: ${organization}`);

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Find inquiries imported in last 24 hours
    const inquiriesToDelete = await Inquiry.find({
      organization,
      'meta.importedFromGoogleSheets': true,
      'meta.importedAt': { $gte: twentyFourHoursAgo },
    });

    if (inquiriesToDelete.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No inquiries found to delete from last 24 hours',
        deletedCount: 0,
      });
    }

    // Delete the inquiries
    const result = await Inquiry.deleteMany({
      organization,
      'meta.importedFromGoogleSheets': true,
      'meta.importedAt': { $gte: twentyFourHoursAgo },
    });

    console.log(`✅ Deleted ${result.deletedCount} inquiries from last 24 hours`);

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} inquiries from last 24 hours`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('❌ Error deleting last imported inquiries:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete last imported inquiries',
      error: error.message,
    });
  }
};
