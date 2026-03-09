import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { drawingAPI } from '../services/api';
import { Users, Search, FileText, ArrowUpDown } from 'lucide-react';

const DrawingDashboard = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest'); // newest, name
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        // Auth & Role Check
        const authData = localStorage.getItem('auth');
        const orgUser = localStorage.getItem('orgUser');
        let role = '';
        let userId = '';
        let email = '';

        if (authData) {
            try {
                const parsed = JSON.parse(authData);
                role = parsed.user?.userRole || '';
                userId = parsed.user?.id || parsed.user?._id;
                email = parsed.user?.email || '';
            } catch (e) {
                console.error('Parse auth error', e);
            }
        }

        if (!role && orgUser) {
            try {
                const parsed = JSON.parse(orgUser);
                role = parsed.userRole || parsed.role || '';
                userId = parsed.id || parsed._id;
                email = parsed.email || '';
            } catch (e) {
                console.error('Parse orgUser error', e);
            }
        }

        // Hardcode override for jasleen@vlite.com
        if (email === 'jasleen@vlite.com') {
            role = 'Admin';
        }

        setCurrentUserId(userId);

        // Redirect logic for other roles
        if (role === 'Salesman') {
            navigate('/salesman-drawings');
            return;
        }
        if (role === 'Design Dept Head') {
            navigate('/design-assignment');
            return;
        }
        if (role === 'Admin' || role === 'POC') {
            navigate('/admin-drawings');
            return;
        }

        fetchCustomers();
    }, [navigate]);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await drawingAPI.getCustomersFromOrders();
            setCustomers(response.data.data || []);
            setFilteredCustomers(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!customers.length) return;

        let result = customers;

        // 🔍 Filter 1: Show only assigned customers if not Admin/Head
        if (currentUserId) {
            result = result.filter(c => c.assignedDesigner?._id === currentUserId);
        }

        // 🔍 Filter 2: Search Term
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            result = result.filter(customer => {
                const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.toLowerCase();
                const phone = (customer.phone || '').toLowerCase();
                const email = (customer.email || '').toLowerCase();
                return fullName.includes(search) || phone.includes(search) || email.includes(search);
            });
        }

        // 🔍 Sort
        const sorted = [...result].sort((a, b) => {
            if (sortBy === 'newest') {
                return b._id.localeCompare(a._id);
            } else if (sortBy === 'name') {
                const nameA = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
                const nameB = `${b.firstName || ''} ${b.lastName || ''}`.toLowerCase();
                return nameA.localeCompare(nameB);
            }
            return 0;
        });

        setFilteredCustomers(sorted);

    }, [searchTerm, sortBy, customers, currentUserId]);

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
                <div className="flex items-center gap-3">
                    <div className="bg-red-700 p-3 rounded-lg shadow-lg">
                        <FileText className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Assigned Projects</h1>
                        <p className="text-gray-600 mt-1">Manage drawings and files for your assigned customers</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium mb-1">My Customers</p>
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
                            <p className="text-gray-500 text-sm font-medium mb-1">Orders</p>
                            <p className="text-3xl font-bold text-gray-900">{customers.length}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-xl">
                            <FileText className="w-6 h-6 text-green-600" />
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
                            placeholder="Search my customers..."
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
                        </select>
                    </div>
                </div>
            </div>

            {/* Customer Cards Grid */}
            {filteredCustomers.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-200 text-center">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No customers found</h3>
                    <p className="text-gray-500">
                        {searchTerm ? 'Try adjusting your search' : 'You have not been assigned any customers yet.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {filteredCustomers.map((customer) => (
                        <div
                            key={customer._id}
                            onClick={() => handleCustomerClick(customer._id)}
                            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-100 hover:border-red-500 group"
                        >
                            <div className="p-6 flex flex-col items-center">
                                {/* Avatar */}
                                <div className="mb-4 relative">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-50 to-red-100 text-red-600 flex items-center justify-center text-xl font-bold group-hover:scale-110 transition-transform">
                                        {(customer.firstName?.[0] || '?').toUpperCase()}
                                        {(customer.lastName?.[0] || '').toUpperCase()}
                                    </div>
                                </div>

                                {/* Name */}
                                <h3 className="text-lg font-bold text-gray-900 mb-1 text-center line-clamp-1">
                                    {customer.firstName} {customer.lastName}
                                </h3>

                                <span className="inline-block px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium mb-4">
                                    Active Order
                                </span>

                                {/* Details */}
                                <div className="w-full space-y-2 pt-4 border-t border-gray-50">
                                    {customer.phone && (
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>📞</span>
                                            <span className="truncate">{customer.phone}</span>
                                        </div>
                                    )}
                                    {customer.email && (
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span>✉️</span>
                                            <span className="truncate">{customer.email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DrawingDashboard;
