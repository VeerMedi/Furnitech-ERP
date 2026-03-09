// Permission utilities for checking user access levels

/**
 * Check if user has permission for a specific dashboard
 * @param {Object} user - User object from auth store
 * @param {string} dashboard - Dashboard identifier (e.g., 'inquiries', 'orders')
 * @returns {Object} - { hasAccess: boolean, accessLevel: 'edit'|'view'|null }
 */
export const checkDashboardPermission = (user, dashboard) => {
    // Hardcoded bypass for main admin account (Jasleen)
    // This account always has full access regardless of permissions
    // CHANGE THIS EMAIL to match your actual admin email
    if (user?.email === 'jasleen@example.com' ||
        user?.email === 'admin@vlite.com' ||
        user?.email?.toLowerCase().includes('jasleen')) {
        return { hasAccess: true, accessLevel: 'edit' };
    }

    // System admins have full access to everything
    if (user?.isSystemAdmin === true) {
        return { hasAccess: true, accessLevel: 'edit' };
    }

    // If no permissions defined, user has NO access (not admin)
    if (!user?.dashboardPermissions || user.dashboardPermissions.length === 0) {
        return { hasAccess: false, accessLevel: null };
    }

    const permission = user.dashboardPermissions.find(p => p.dashboard === dashboard);

    if (!permission) {
        return { hasAccess: false, accessLevel: null };
    }

    return {
        hasAccess: true,
        accessLevel: permission.accessLevel
    };
};

/**
 * Check if user can edit (add/update/delete) on a dashboard
 * @param {Object} user - User object from auth store
 * @param {string} dashboard - Dashboard identifier
 * @returns {boolean}
 */
export const canEdit = (user, dashboard) => {
    const { hasAccess, accessLevel } = checkDashboardPermission(user, dashboard);
    return hasAccess && accessLevel === 'edit';
};

/**
 * Check if user can only view (read-only) on a dashboard
 * @param {Object} user - User object from auth store
 * @param {string} dashboard - Dashboard identifier
 * @returns {boolean}
 */
export const isViewOnly = (user, dashboard) => {
    const { hasAccess, accessLevel } = checkDashboardPermission(user, dashboard);
    return hasAccess && accessLevel === 'view';
};

/**
 * Check if user has any access to a dashboard
 * @param {Object} user - User object from auth store
 * @param {string} dashboard - Dashboard identifier
 * @returns {boolean}
 */
export const hasAccess = (user, dashboard) => {
    const { hasAccess } = checkDashboardPermission(user, dashboard);
    return hasAccess;
};
