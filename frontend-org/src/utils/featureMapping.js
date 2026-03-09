/**
 * Feature to Dashboard Mapping
 * Maps organization feature codes to dashboard identifiers
 * This enables organization-level feature control from superadmin
 */

export const featureToDashboardMapping = {
  // Core Features
  'DASHBOARD': ['dashboard'],
  'CUSTOMERS': ['customers'],
  'CRM': ['crm', 'crm-dashboard', 'crm-stage', 'crm-payments'],
  'PRODUCTS': ['products'],
  'INQUIRIES': ['inquiries'],
  'POC_ASSIGNMENT': ['poc-assignment'],
  'SALESMAN': ['salesman-dashboard'],
  'QUOTATIONS': ['quotations'],
  'ORDERS': ['orders'],
  'DRAWINGS': ['drawings'],
  'MACHINES': ['machines'],
  'PRODUCTION': ['production', 'production-pre-production', 'production-post-production'],
  'TRANSPORT': ['transport'],
  'VENDORS': ['vendors', 'vendors-details', 'vendors-payments'],
  'MANAGEMENT': ['management', 'management-staff', 'management-employee'],
  'USERS': ['users'],
  'RAW_MATERIAL': ['raw-material', 'raw-material-price-book', 'raw-material-panel',
    'raw-material-laminate', 'raw-material-hbd', 'raw-material-hardware',
    'raw-material-glass', 'raw-material-fabric', 'raw-material-aluminum',
    'raw-material-processed-panel', 'raw-material-handles'],
  'INVENTORY': ['inventory-management', 'inventory-purchase', 'inventory-orders'],

  // Advanced Features
  'ADVANCED_ANALYTICS': ['analytics'],
  'ADVANCED_REPORTING': ['reports'],

  // AI Features
  'AI_ANALYTICS': ['ai-analytics', 'customer-insights'],
  'AI_PREDICTIONS': ['ai-predictions'],

  // Integration Features
  'API_ACCESS': [],
  'THIRD_PARTY_INTEGRATIONS': [],
};

/**
 * Get all dashboard identifiers that are enabled for the organization
 * @param {Array} enabledFeatures - Array of enabled features from organization
 * @returns {Array} - Array of dashboard identifiers that should be accessible
 */
export const getEnabledDashboards = (enabledFeatures) => {
  if (!enabledFeatures || enabledFeatures.length === 0) {
    return [];
  }

  const enabledDashboards = new Set();

  enabledFeatures.forEach(feature => {
    const featureCode = feature.featureId?.code || feature.featureId;
    const dashboards = featureToDashboardMapping[featureCode];

    if (dashboards) {
      dashboards.forEach(dashboard => enabledDashboards.add(dashboard));
    }
  });

  return Array.from(enabledDashboards);
};

/**
 * Check if a specific dashboard is enabled for the organization
 * @param {Array} enabledFeatures - Array of enabled features from organization
 * @param {string} dashboardKey - Dashboard identifier to check
 * @returns {boolean} - Whether the dashboard is enabled
 */
export const isDashboardEnabled = (enabledFeatures, dashboardKey) => {
  const enabledDashboards = getEnabledDashboards(enabledFeatures);
  return enabledDashboards.includes(dashboardKey);
};
