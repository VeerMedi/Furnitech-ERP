/**
 * Vlite Configuration
 * Single-tenant configuration for dedicated Vlite organization
 */

module.exports = {
    // Primary configuration - hardcoded for Vlite
    organizationId: process.env.VLITE_ORG_ID || '6935417d57433de522df0bbe',
    organizationSlug: process.env.VLITE_ORG_SLUG || 'vlite-furnitures',

    // Fallback options
    fallbackToFirstActive: process.env.VLITE_FALLBACK_FIRST === 'true', // Default: false

    // System settings
    allowMultipleTenants: false, // Disabled - single tenant only
    enableOrgCreation: false, // Disabled - no org creation in UI
    enableOrgManagement: false, // Disabled - no org management in UI
};
