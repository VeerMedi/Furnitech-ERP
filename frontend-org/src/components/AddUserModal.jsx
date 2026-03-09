import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import api from '../services/api';

// Available user roles - GROUPED by category
const USER_ROLES_GROUPED = [
    {
        label: 'General Roles',
        options: [
            { value: 'POC', label: 'POC' },
            { value: 'Salesman', label: 'Salesman' },
            { value: 'Head of Sales (HOD)', label: 'Head of Sales (HOD)' },
            { value: 'Design', label: 'Design Department' },
            { value: 'Design Dept Head', label: 'Design Dept Head' },
            { value: 'Production', label: 'Production' },
            { value: 'Project Manager', label: 'Project Manager' },
            { value: 'Account Handler', label: 'Account Handler' },
        ]
    },
    {
        label: 'Steel Production Roles',
        options: [
            { value: 'Steel (Steel Cutting)', label: 'Steel (Steel Cutting)' },
            { value: 'Steel (CNC Cutting)', label: 'Steel (CNC Cutting)' },
            { value: 'Steel (Bending)', label: 'Steel (Bending)' },
            { value: 'Steel (Welding)', label: 'Steel (Welding)' },
            { value: 'Steel (Finishing)', label: 'Steel (Finishing)' },
            { value: 'Steel (Packing)', label: 'Steel (Packing)' },
        ]
    },
    {
        label: 'Wood Production Roles',
        options: [
            { value: 'Wood (Beam Saw)', label: 'Wood (Beam Saw)' },
            { value: 'Wood (Edge Bending)', label: 'Wood (Edge Bending)' },
            { value: 'Wood (Profiling)', label: 'Wood (Profiling)' },
            { value: 'Wood (Grooming)', label: 'Wood (Grooming)' },
            { value: 'Wood (Boring Machine)', label: 'Wood (Boring Machine)' },
            { value: 'Wood (Finishing)', label: 'Wood (Finishing)' },
            { value: 'Wood (Packaging)', label: 'Wood (Packaging)' },
        ]
    }
];

// Available dashboards - same as UserPermissionModal
const AVAILABLE_DASHBOARDS = [
    { id: 'products', label: 'Products', icon: '📦', category: 'Inventory' },
    { id: 'inquiries', label: 'Inquiries', icon: '📋', category: 'Sales' },
    { id: 'poc-assignment', label: 'POC Assignment', icon: '👤', category: 'Sales' },
    { id: 'salesman-dashboard', label: 'Salesman Dashboard', icon: '💼', category: 'Sales' },
    { id: 'customers', label: 'Customers', icon: '👥', category: 'Sales' },
    { id: 'quotations', label: 'Quotations', icon: '💰', category: 'Sales' },
    { id: 'orders', label: 'Orders', icon: '🛒', category: 'Sales' },
    { id: 'crm', label: 'CRM Dashboard', icon: '📊', category: 'CRM' },
    { id: 'crm-stage', label: 'CRM Pipeline', icon: '🔄', category: 'CRM' },
    { id: 'crm-payments', label: 'CRM Advance Payment', icon: '💳', category: 'CRM' },
    // DISABLED - Drawing Approval Workflow Removed
    // { id: 'drawings', label: 'Drawings', icon: '📐', category: 'Design' },
    { id: 'production', label: 'Production', icon: '🏭', category: 'Production' },
    { id: 'production-pre-production', label: 'Pre-Production', icon: '⚙️', category: 'Production' },
    { id: 'production-post-production', label: 'Post-Production', icon: '📦', category: 'Production' },
    { id: 'machines', label: 'Machines', icon: '⚙️', category: 'Production' },
    { id: 'transport', label: 'Transport', icon: '🚚', category: 'Logistics' },
    { id: 'vendors', label: 'Vendors', icon: '🏢', category: 'Procurement' },
    { id: 'vendors-details', label: 'Vendor Details', icon: '📋', category: 'Procurement' },
    { id: 'vendors-payments', label: 'Vendor Payments', icon: '💰', category: 'Procurement' },
    { id: 'management', label: 'Employee Management', icon: '👔', category: 'HR' },
    { id: 'inventory', label: 'Inventory', icon: '📊', category: 'Inventory' },
    { id: 'raw-material', label: 'Raw Material', icon: '🧱', category: 'Inventory' },
    { id: 'customer-insights', label: 'Customer Insights', icon: '🧠', category: 'AI & Analytics' },
];

const AddUserModal = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        phone: '',
        email: '',
        password: '',
        userRole: '', // Default role
    });

    const [selectedDashboards, setSelectedDashboards] = useState([]);
    const [dashboardPermissions, setDashboardPermissions] = useState({});
    const [dataSourceUserId, setDataSourceUserId] = useState('');
    const [dataSourceUsers, setDataSourceUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchDataSourceUsers();
        }
    }, [isOpen]);

    const fetchDataSourceUsers = async () => {
        try {
            const response = await api.get('/user-access/datasource-users');
            if (response.data.success) {
                setDataSourceUsers(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching data source users:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Auto-assign permissions based on role
        if (name === 'userRole') {
            let autoDashboards = [];

            // Define default dashboards for each role (ONLY these will be selected)
            switch (value) {
                case 'Salesman':
                    autoDashboards = ['salesman-dashboard'];
                    break;
                case 'POC':
                    autoDashboards = ['poc-assignment', 'inquiries'];
                    break;
                case 'Head of Sales (HOD)':
                    autoDashboards = [
                        'inquiries',
                        'products',
                        'poc-assignment',
                        'customers',
                        'orders',
                        'quotations',
                        // 'drawings', // DISABLED
                        'vendors',
                        'production-pre-production',
                        'production-post-production',
                        'salesman-dashboard'
                    ];
                    break;
                case 'Design':
                    // DISABLED - Drawing workflow removed
                    autoDashboards = [];
                    break;
                case 'Design Dept Head':
                    // DISABLED - Drawing workflow removed
                    autoDashboards = ['quotations', 'orders'];
                    break;
                case 'Production':
                    autoDashboards = ['production', 'production-pre-production', 'production-post-production', 'machines'];
                    break;
                default:
                    autoDashboards = [];
                    break;
            }

            // COMPLETELY RESET selections - set ONLY role-specific dashboards
            setSelectedDashboards(autoDashboards);

            // COMPLETELY RESET permissions - set ONLY for role-specific dashboards
            const newPermissions = {};
            autoDashboards.forEach(id => {
                newPermissions[id] = 'edit';
            });
            setDashboardPermissions(newPermissions);
        }
    };

    const handleDashboardToggle = (dashboardId) => {
        setSelectedDashboards(prev => {
            const isSelected = prev.includes(dashboardId);
            if (isSelected) {
                // Remove dashboard and its permission
                const newPerms = { ...dashboardPermissions };
                delete newPerms[dashboardId];
                setDashboardPermissions(newPerms);
                return prev.filter(id => id !== dashboardId);
            } else {
                // Add dashboard with default 'view' permission
                setDashboardPermissions(prev => ({ ...prev, [dashboardId]: 'view' }));
                return [...prev, dashboardId];
            }
        });
    };

    const handlePermissionChange = (dashboardId, accessLevel) => {
        setDashboardPermissions(prev => ({
            ...prev,
            [dashboardId]: accessLevel
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Build dashboard permissions array
            const permissions = selectedDashboards.map(dashboardId => ({
                dashboard: dashboardId,
                accessLevel: dashboardPermissions[dashboardId] || 'view'
            }));

            const userData = {
                ...formData,
                dashboardPermissions: permissions,
                dataSourceUserId: dataSourceUserId || null,
            };

            const response = await api.post('/user-access/users', userData);

            if (response.data.success) {
                onSuccess();
                handleClose();
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            firstName: '',
            lastName: '',
            username: '',
            phone: '',
            email: '',
            password: '',
        });
        setSelectedDashboards([]);
        setDashboardPermissions({});
        setDataSourceUserId('');
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">Add New User</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="p-6 space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        {/* Basic Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        First Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Last Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Username
                                    </label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Password *
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        required
                                        minLength="8"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        User Role *
                                    </label>
                                    <select
                                        name="userRole"
                                        value={formData.userRole}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="" disabled>Select Role</option>
                                        {USER_ROLES_GROUPED.map(group => (
                                            <optgroup key={group.label} label={group.label}>
                                                {group.options.map(role => (
                                                    <option key={role.value} value={role.value}>
                                                        {role.label}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Dashboard Permissions */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Access</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Select which dashboards this user can access and their permission level
                            </p>

                            <div className="space-y-3 border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                                {AVAILABLE_DASHBOARDS
                                    .filter(dashboard => {
                                        // Hide POC Assignment from Salesman
                                        if (formData.userRole === 'Salesman' && dashboard.id === 'poc-assignment') {
                                            return false;
                                        }
                                        // Hide Salesman Dashboard from POC
                                        if (formData.userRole === 'POC' && dashboard.id === 'salesman-dashboard') {
                                            return false;
                                        }
                                        return true;
                                    })
                                    .map(dashboard => (
                                        <div key={dashboard.id} className="flex items-center justify-between py-2">
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id={`dash-${dashboard.id}`}
                                                    checked={selectedDashboards.includes(dashboard.id)}
                                                    onChange={() => handleDashboardToggle(dashboard.id)}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                                <label
                                                    htmlFor={`dash-${dashboard.id}`}
                                                    className="ml-3 text-sm font-medium text-gray-700"
                                                >
                                                    {dashboard.label}
                                                </label>
                                            </div>

                                            {selectedDashboards.includes(dashboard.id) && (
                                                <div className="flex gap-4">
                                                    <label className="flex items-center">
                                                        <input
                                                            type="radio"
                                                            name={`perm-${dashboard.id}`}
                                                            value="view"
                                                            checked={dashboardPermissions[dashboard.id] === 'view'}
                                                            onChange={() => handlePermissionChange(dashboard.id, 'view')}
                                                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-600">View Only</span>
                                                    </label>

                                                    <label className="flex items-center">
                                                        <input
                                                            type="radio"
                                                            name={`perm-${dashboard.id}`}
                                                            value="edit"
                                                            checked={dashboardPermissions[dashboard.id] === 'edit'}
                                                            onChange={() => handlePermissionChange(dashboard.id, 'edit')}
                                                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-600">Edit Access</span>
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Data Source User */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Source</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Select which user's data this user should see (leave empty for own data)
                            </p>

                            <select
                                value={dataSourceUserId}
                                onChange={(e) => setDataSourceUserId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Own Data (No data source)</option>
                                {dataSourceUsers.map(user => (
                                    <option key={user._id} value={user._id}>
                                        {user.firstName} {user.lastName} ({user.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
};

export default AddUserModal;
