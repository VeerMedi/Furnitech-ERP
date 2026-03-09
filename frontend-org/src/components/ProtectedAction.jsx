import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { canEdit } from '../utils/permissions';

/**
 * Higher Order Component to wrap buttons/actions with permission checks
 * Usage: <ProtectedAction dashboard="inquiries" action={handleAdd}>Add Button</ProtectedAction>
 */
export const ProtectedAction = ({ dashboard, children, fallback = null }) => {
    const { user } = useAuthStore();
    const hasEditAccess = canEdit(user, dashboard);

    if (!hasEditAccess) {
        return fallback;
    }

    return <>{children}</>;
};

/**
 * Hook to check edit permissions for a dashboard
 * Usage: const canEditInquiries = useEditPermission('inquiries');
 */
export const useEditPermission = (dashboard) => {
    const { user } = useAuthStore();
    return canEdit(user, dashboard);
};

/**
 * HOC to disable buttons based on permissions
 */
export const withPermission = (Component, dashboard) => {
    return (props) => {
        const { user } = useAuthStore();
        const hasEditAccess = canEdit(user, dashboard);

        return <Component {...props} disabled={!hasEditAccess || props.disabled} />;
    };
};

export default ProtectedAction;
