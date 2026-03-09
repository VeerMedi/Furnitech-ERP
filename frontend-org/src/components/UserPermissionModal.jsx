import React, { useState, useEffect } from 'react';
import { X, Shield, Eye, Edit3, Save, Plus, Trash2, Search, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';
import { toast } from '../hooks/useToast';

const AVAILABLE_DASHBOARDS = [
    { name: 'products', label: 'Products', icon: '📦', category: 'Inventory' },
    { name: 'inquiries', label: 'Inquiries', icon: '📋', category: 'Sales' },
    { name: 'poc-assignment', label: 'POC Assignment', icon: '👤', category: 'Sales' },
    { name: 'salesman-dashboard', label: 'Salesman Dashboard', icon: '💼', category: 'Sales' },
    { name: 'customers', label: 'Customers', icon: '👥', category: 'Sales' },
    { name: 'quotations', label: 'Quotations', icon: '💰', category: 'Sales' },
    { name: 'orders', label: 'Orders', icon: '🛒', category: 'Sales' },
    { name: 'crm', label: 'CRM Dashboard', icon: '📊', category: 'CRM' },
    { name: 'crm-stage', label: 'CRM Pipeline', icon: '🔄', category: 'CRM' },
    { name: 'crm-payments', label: 'CRM Advance Payment', icon: '💳', category: 'CRM' },
    // DISABLED - Drawing Approval Workflow Removed
    // { name: 'drawings', label: 'Drawings', icon: '📐', category: 'Design' },
    { name: 'production', label: 'Production', icon: '🏭', category: 'Production' },
    { name: 'production-pre-production', label: 'Pre-Production', icon: '⚙️', category: 'Production' },
    { name: 'production-post-production', label: 'Post-Production', icon: '📦', category: 'Production' },
    { name: 'machines', label: 'Machines', icon: '⚙️', category: 'Production' },
    { name: 'transport', label: 'Transport', icon: '🚚', category: 'Logistics' },
    { name: 'vendors', label: 'Vendors', icon: '🏢', category: 'Procurement' },
    { name: 'vendors-details', label: 'Vendor Details', icon: '📋', category: 'Procurement' },
    { name: 'vendors-payments', label: 'Vendor Payments', icon: '💰', category: 'Procurement' },
    { name: 'management', label: 'Employee Management', icon: '👔', category: 'HR' },
    { name: 'inventory', label: 'Inventory', icon: '📊', category: 'Inventory' },
    { name: 'raw-material', label: 'Raw Material', icon: '🧱', category: 'Inventory' },
    { name: 'customer-insights', label: 'Customer Insights', icon: '🧠', category: 'AI & Analytics' },
];

const UserPermissionModal = ({ isOpen, onClose, user, onSuccess }) => {
    const [permissions, setPermissions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [editedEmail, setEditedEmail] = useState('');
    const [savingEmail, setSavingEmail] = useState(false);

    const [currentEmail, setCurrentEmail] = useState('');

    const categories = ['All', ...new Set(AVAILABLE_DASHBOARDS.map(d => d.category))];

    useEffect(() => {
        if (user) {
            loadUserPermissions();
            setEditedEmail(user.email || '');
            // Only set currentEmail from prop if it's different (to respect local updates)
            // But we actually want to respect the prop if the user ID changes.
            // If user ID is same, we might want to keep local state? 
            // Better: Always sync from prop, but handleSaveEmail will update it proactively.
            setCurrentEmail(user.email || '');
        }
    }, [user]);

    const loadUserPermissions = async () => {
        setLoading(true);
        try {
            // Initialize permissions from user data
            const userPermissions = user.dashboardPermissions || [];

            // Create a map of existing permissions
            const permissionMap = new Map(
                userPermissions.map(p => [p.dashboard, p.accessLevel])
            );

            // Filter dashboards based on user role
            const filteredDashboards = AVAILABLE_DASHBOARDS.filter(dashboard => {
                // Hide POC Assignment from Salesman
                if (user.userRole === 'Salesman' && dashboard.name === 'poc-assignment') {
                    return false;
                }
                // Hide Salesman Dashboard from POC
                if (user.userRole === 'POC' && dashboard.name === 'salesman-dashboard') {
                    return false;
                }
                return true;
            });

            // Set permissions for filtered dashboards
            const allPermissions = filteredDashboards.map(dashboard => ({
                dashboard: dashboard.name,
                label: dashboard.label,
                icon: dashboard.icon,
                category: dashboard.category,
                accessLevel: permissionMap.get(dashboard.name) || 'none',
            }));

            setPermissions(allPermissions);
        } catch (error) {
            console.error('Error loading permissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePermissionChange = (dashboardName, newAccessLevel) => {
        setPermissions(prev =>
            prev.map(p =>
                p.dashboard === dashboardName
                    ? { ...p, accessLevel: newAccessLevel }
                    : p
            )
        );
        setHasChanges(true);
    };

    const handleSavePermissions = async () => {
        setSaving(true);
        try {
            // Filter out 'none' permissions and send only granted ones
            const activePermissions = permissions
                .filter(p => p.accessLevel !== 'none')
                .map(p => ({
                    dashboard: p.dashboard,
                    accessLevel: p.accessLevel,
                }));

            const response = await api.put(`/user-access/users/${user._id}/permissions`, {
                dashboardPermissions: activePermissions,
            });

            if (response.data.success) {
                setHasChanges(false);
                onSuccess?.();
                // Show success message
                toast.success('Permissions updated successfully! ✅');
            }
        } catch (error) {
            console.error('Error saving permissions:', error);
            toast.error(error.response?.data?.message || 'Failed to save permissions');
        } finally {
            setSaving(false);
        }
    };

    const handleGrantAll = (accessLevel) => {
        setPermissions(prev =>
            prev.map(p => ({ ...p, accessLevel }))
        );
        setHasChanges(true);
    };

    const handleRevokeAll = () => {
        setPermissions(prev =>
            prev.map(p => ({ ...p, accessLevel: 'none' }))
        );
        setHasChanges(true);
    };

    const handleSaveEmail = async () => {
        if (!editedEmail || editedEmail === user.email) {
            setIsEditingEmail(false);
            return;
        }

        setSavingEmail(true);
        try {
            // Using the generic users endpoint for profile updates
            const response = await api.put(`/users/${user._id}`, { email: editedEmail });

            // Allow for response structure generic check
            if (response.data) {
                toast.success('Email updated successfully! ✅');
                setCurrentEmail(editedEmail); // Optimistic update
                setIsEditingEmail(false);
                onSuccess?.(); // Refresh parent data which will reload user and this modal
            }
        } catch (error) {
            console.error('Error updating email:', error);
            toast.error(error.response?.data?.message || 'Failed to update email');
        } finally {
            setSavingEmail(false);
        }
    };

    if (!isOpen || !user) return null;

    // Filter permissions based on search and category
    const filteredPermissions = permissions.filter(p => {
        const matchesSearch = p.label.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const stats = {
        total: permissions.length,
        granted: permissions.filter(p => p.accessLevel !== 'none').length,
        edit: permissions.filter(p => p.accessLevel === 'edit').length,
        viewOnly: permissions.filter(p => p.accessLevel === 'view').length,
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-700 to-red-800 text-white p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-full">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">
                                    {user.firstName} {user.lastName}
                                </h2>
                                {isEditingEmail ? (
                                    <div className="flex items-center gap-2 mt-1">
                                        <input
                                            type="email"
                                            value={editedEmail}
                                            onChange={(e) => setEditedEmail(e.target.value)}
                                            className="bg-white/10 border border-white/30 rounded px-2 py-0.5 text-xs text-white placeholder-red-200 focus:outline-none focus:bg-white/20 w-48"
                                            onClick={(e) => e.stopPropagation()}
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleSaveEmail}
                                            disabled={savingEmail}
                                            className="text-green-300 hover:text-green-100 disabled:opacity-50"
                                            title="Save Email"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditingEmail(false);
                                                setEditedEmail(user.email);
                                            }}
                                            className="text-red-200 hover:text-white"
                                            title="Cancel"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 mt-0.5 group">
                                        <p className="text-red-100 text-xs">
                                            {currentEmail} • {user.userRole || 'User'}
                                        </p>
                                        <button
                                            onClick={() => setIsEditingEmail(true)}
                                            className="opacity-0 group-hover:opacity-100 text-red-200 hover:text-white transition-opacity"
                                            title="Edit Email"
                                        >
                                            <Edit3 className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-3 mt-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                            <p className="text-red-100 text-[10px]">Total Dashboards</p>
                            <p className="text-xl font-bold mt-0.5">{stats.total}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                            <p className="text-red-100 text-[10px]">Access Granted</p>
                            <p className="text-xl font-bold mt-0.5">{stats.granted}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                            <p className="text-red-100 text-[10px]">Edit Access</p>
                            <p className="text-xl font-bold mt-0.5">{stats.edit}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
                            <p className="text-red-100 text-[10px]">View Only</p>
                            <p className="text-xl font-bold mt-0.5">{stats.viewOnly}</p>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex flex-wrap gap-3 items-center">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search dashboards..."
                                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Category Filter */}
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        {/* Bulk Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleGrantAll('edit')}
                                className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                            >
                                Grant All Edit
                            </button>
                            <button
                                onClick={() => handleGrantAll('view')}
                                className="px-2.5 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs font-medium"
                            >
                                Grant All View
                            </button>
                            <button
                                onClick={handleRevokeAll}
                                className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                            >
                                Revoke All
                            </button>
                        </div>
                    </div>
                </div>

                {/* Permissions List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
                        </div>
                    ) : (
                        <div className="grid gap-2.5">
                            {filteredPermissions.map((perm) => (
                                <div
                                    key={perm.dashboard}
                                    className={`border rounded-lg p-3 transition-all ${perm.accessLevel !== 'none'
                                        ? 'border-blue-300 bg-blue-50/50'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="text-2xl">{perm.icon}</div>
                                            <div>
                                                <h3 className="font-semibold text-sm text-gray-900">{perm.label}</h3>
                                                <p className="text-xs text-gray-500">{perm.category}</p>
                                            </div>
                                        </div>

                                        {/* Permission Buttons */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handlePermissionChange(perm.dashboard, 'none')}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${perm.accessLevel === 'none'
                                                    ? 'bg-red-100 text-red-700 ring-2 ring-red-300'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                                No Access
                                            </button>
                                            <button
                                                onClick={() => handlePermissionChange(perm.dashboard, 'view')}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${perm.accessLevel === 'view'
                                                    ? 'bg-gray-600 text-white ring-2 ring-gray-400'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                View Only
                                            </button>
                                            <button
                                                onClick={() => handlePermissionChange(perm.dashboard, 'edit')}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${perm.accessLevel === 'edit'
                                                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {filteredPermissions.length === 0 && (
                                <div className="text-center py-12">
                                    <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">No dashboards found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            {hasChanges && (
                                <span className="flex items-center gap-2 text-amber-600">
                                    <span className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></span>
                                    You have unsaved changes
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePermissions}
                                disabled={!hasChanges || saving}
                                className="flex items-center gap-2 px-4 py-1.5 text-sm bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserPermissionModal;
