import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { drawingAPI } from '../services/api';
import { Users, Search, FileText, UserPlus, CheckCircle, AlertCircle, UserCheck, ArrowUpDown } from 'lucide-react';
import Button from '../components/Button';
import { toast } from '../hooks/useToast';

const DesignDeptHeadDashboard = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [designers, setDesigners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest'); // newest, name, assigned, unassigned
    const [assigningState, setAssigningState] = useState({}); // { customerId: boolean }

    useEffect(() => {
        fetchAllData();
    }, []);

    useEffect(() => {
        let filtered = customers;

        // Apply search filter
        if (searchTerm) {
            filtered = customers.filter(customer => {
                const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.toLowerCase();
                const phone = (customer.phone || '').toLowerCase();
                const email = (customer.email || '').toLowerCase();
                const search = searchTerm.toLowerCase();

                return fullName.includes(search) || phone.includes(search) || email.includes(search);
            });
        }

        // Apply sorting
        const sorted = [...filtered].sort((a, b) => {
            if (sortBy === 'newest') {
                // Newest first - assuming _id is time-based ObjectId
                return b._id.localeCompare(a._id);
            } else if (sortBy === 'name') {
                const nameA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
                const nameB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
                return nameA.localeCompare(nameB);
            } else if (sortBy === 'assigned') {
                // Assigned first
                if (a.assignedDesigner && !b.assignedDesigner) return -1;
                if (!a.assignedDesigner && b.assignedDesigner) return 1;
                return 0;
            } else if (sortBy === 'unassigned') {
                // Unassigned first
                if (!a.assignedDesigner && b.assignedDesigner) return -1;
                if (a.assignedDesigner && !b.assignedDesigner) return 1;
                return 0;
            }
            return 0;
        });

        setFilteredCustomers(sorted);
    }, [searchTerm, sortBy, customers]);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [customersRes, designersRes] = await Promise.all([
                drawingAPI.getCustomersFromOrders(),
                drawingAPI.getDesignTeam()
            ]);

            setCustomers(customersRes.data.data || []);
            setFilteredCustomers(customersRes.data.data || []);
            setDesigners(designersRes.data.data || []);
            console.log('Designers loaded:', designersRes.data.data);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssignDesigner = async (customerId, designerId) => {
        if (!designerId) return;

        try {
            setAssigningState(prev => ({ ...prev, [customerId]: true }));

            await drawingAPI.assignDesigner({
                customerId,
                designerId
            });

            // Update local state
            const updatedCustomers = customers.map(c => {
                if (c._id === customerId) {
                    const assignedDesigner = designers.find(d => d._id === designerId);
                    return { ...c, assignedDesigner };
                }
                return c;
            });

            setCustomers(updatedCustomers);

            // Show temporary success feedback?
            // Could use toast here, but simple state update reflects immediately

        } catch (error) {
            console.error('Failed to assign designer:', error);
            toast.error('Failed to assign designer');
        } finally {
            setAssigningState(prev => ({ ...prev, [customerId]: false }));
        }
    };

    const handleCustomerClick = (customerId) => {
        navigate(`/drawings/${customerId}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-8 border-b border-gray-200 pb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-r from-red-700 to-red-600 p-3 rounded-xl shadow-lg">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Design Assignment Dashboard</h1>
                            <p className="text-gray-600 mt-1">Assign customers and orders to your design team</p>
                        </div>
                    </div>

                    <div className="bg-white px-4 py-2 rounded-lg shadow border border-gray-200 flex items-center gap-2">
                        <div className="flex -space-x-2">
                            {designers.slice(0, 3).map(d => (
                                <div key={d._id} className="w-8 h-8 rounded-full bg-red-100 border-2 border-white flex items-center justify-center text-xs font-bold text-red-700">
                                    {d.firstName?.[0]}{d.lastName?.[0]}
                                </div>
                            ))}
                        </div>
                        <span className="text-sm font-semibold text-gray-700 ml-2">
                            {designers.length} Active Designers
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium mb-1">Total Customers</p>
                            <p className="text-3xl font-bold text-gray-900">{customers.length}</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-xl">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium mb-1">Assigned</p>
                            <p className="text-3xl font-bold text-green-600">
                                {customers.filter(c => c.assignedDesigner).length}
                            </p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-xl">
                            <UserCheck className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium mb-1">Pending Assignment</p>
                            <p className="text-3xl font-bold text-orange-600">
                                {customers.filter(c => !c.assignedDesigner).length}
                            </p>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-xl">
                            <UserPlus className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Sort Bar */}
            <div className="bg-white rounded-xl p-4 shadow-sm mb-6 border border-gray-200">
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="flex items-center gap-3 flex-1">
                        <Search className="w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search customers..."
                            className="flex-1 border-none focus:ring-0 text-gray-700 placeholder-gray-400"
                        />
                    </div>

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4 text-gray-400" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none bg-white"
                        >
                            <option value="newest">Newest First</option>
                            <option value="name">Name (A-Z)</option>
                            <option value="unassigned">Unassigned First</option>
                            <option value="assigned">Assigned First</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Customers List with Assignment */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left py-4 px-6 font-semibold text-gray-600 text-sm">Customer</th>
                                <th className="text-left py-4 px-6 font-semibold text-gray-600 text-sm">Contact Details</th>
                                <th className="text-left py-4 px-6 font-semibold text-gray-600 text-sm">Location</th>
                                <th className="text-left py-4 px-6 font-semibold text-gray-600 text-sm">Assign Designer</th>
                                <th className="text-center py-4 px-6 font-semibold text-gray-600 text-sm">Status</th>
                                <th className="text-center py-4 px-6 font-semibold text-gray-600 text-sm">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-gray-500">
                                        No customers found
                                    </td>
                                </tr>
                            ) : (
                                filteredCustomers.map((customer) => (
                                    <tr key={customer._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm">
                                                    {(customer.firstName?.[0] || '').toUpperCase()}
                                                    {(customer.lastName?.[0] || '').toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        {customer.firstName} {customer.lastName}
                                                    </p>
                                                    <p className="text-xs text-gray-500">ID: {customer._id.slice(-6)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="space-y-1">
                                                <p className="text-sm text-gray-700">{customer.phone || 'N/A'}</p>
                                                <p className="text-xs text-gray-500">{customer.email || 'N/A'}</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-sm text-gray-700 max-w-[200px] truncate">
                                                {(() => {
                                                    if (typeof customer.address === 'object' && customer.address) {
                                                        const parts = [
                                                            customer.address.street,
                                                            customer.address.area,
                                                            customer.address.city,
                                                            customer.address.state,
                                                            customer.address.zipCode
                                                        ].filter(Boolean);

                                                        return parts.length > 0 ? parts.join(', ') : 'N/A';
                                                    }
                                                    return customer.address || 'N/A';
                                                })()}
                                            </p>
                                        </td>
                                        <td className="py-4 px-6">
                                            {/* Designer Assignment Dropdown */}
                                            <div className="relative min-w-[200px]">
                                                {assigningState[customer._id] ? (
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                                        Assigning...
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={customer.assignedDesigner?._id || ''}
                                                        onChange={(e) => handleAssignDesigner(customer._id, e.target.value)}
                                                        className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${customer.assignedDesigner
                                                            ? 'border-green-200 bg-green-50 text-green-800 font-medium'
                                                            : 'border-red-200 bg-white text-gray-600 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                                                            }`}
                                                    >
                                                        <option value="" disabled>Select Designer</option>
                                                        {designers.map(designer => (
                                                            <option key={designer._id} value={designer._id}>
                                                                {designer.firstName} {designer.lastName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            {customer.assignedDesigner ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                                    <CheckCircle className="w-3 h-3" /> Assigned
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                                                    <AlertCircle className="w-3 h-3" /> Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <button
                                                onClick={() => handleCustomerClick(customer._id)}
                                                className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline"
                                            >
                                                View Files
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DesignDeptHeadDashboard;
