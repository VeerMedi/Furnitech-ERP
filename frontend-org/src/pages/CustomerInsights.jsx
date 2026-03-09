import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Search, Download, RefreshCw, TrendingUp, TrendingDown, Minus, Users, IndianRupee, BarChart3, Award } from 'lucide-react';

const COLORS = ['#dc2626', '#ef4444', '#f87171', '#dc2626', '#b91c1c', '#991b1b'];
import { useToast } from '../hooks/useToast';

const CustomerInsightsDashboard = () => {
    const toast = useToast();
    const [overview, setOverview] = useState(null);
    const [patterns, setPatterns] = useState(null);
    const [clvData, setClvData] = useState([]);
    const [preferences, setPreferences] = useState(null);
    const [

        aiInsights, setAiInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'clv', direction: 'desc' });

    // New state for filters and search
    const [searchTerm, setSearchTerm] = useState('');
    const [regionFilter, setRegionFilter] = useState('all');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [overviewRes, patternsRes, clvRes, prefsRes, aiRes] = await Promise.all([
                api.get('/insights/overview'),
                api.get('/insights/buying-patterns'),
                api.get('/insights/clv'),
                api.get('/insights/preferences'),
                api.get('/insights/ai')
            ]);

            setOverview(overviewRes.data);
            setPatterns(patternsRes.data);
            setClvData(clvRes.data);
            setPreferences(prefsRes.data);
            setAiInsights(aiRes.data.insights || []);
        } catch (error) {
            console.error('Error fetching insights:', error);
            setError('Failed to load insights. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            // This will trigger the backend calls. 
            // We need to implement token deduction in the backend endpoints for this to actually cost usage.
            // For now, if we add token logic to /overview or other endpoints, it will be caught here.
            await fetchAllData();
        } catch (err) {
            console.error('Refresh failed:', err);
            if (err.response && (err.response.status === 402 || err.response.status === 403)) {
                toast.error("You have run out of AI Insights tokens. Please purchase more.");
            }
        } finally {
            setTimeout(() => setRefreshing(false), 500);
        }
    };

    const sortCLVTable = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getFilteredAndSortedCLVData = () => {
        if (!clvData) return [];

        let filtered = [...clvData];

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(customer =>
                customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                customer.region.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply region filter
        if (regionFilter !== 'all') {
            filtered = filtered.filter(customer => customer.region === regionFilter);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            if (sortConfig.direction === 'asc') {
                return a[sortConfig.key] > b[sortConfig.key] ? 1 : -1;
            }
            return a[sortConfig.key] < b[sortConfig.key] ? 1 : -1;
        });

        return filtered;
    };

    const exportToCSV = () => {
        const data = getFilteredAndSortedCLVData();
        const headers = ['Customer Name', 'Region', 'Total Spent', 'Order Count', 'CLV Score'];
        const csvContent = [
            headers.join(','),
            ...data.map(row => [
                row.name,
                row.region,
                row.total_spent,
                row.order_count,
                row.clv
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customer-clv-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const getUniqueRegions = () => {
        if (!clvData) return [];
        return [...new Set(clvData.map(c => c.region))].sort();
    };

    const getTrendIcon = (value) => {
        if (!value) return <Minus size={16} className="text-gray-400" />;
        // Simple trend logic - can be enhanced with historical data
        if (value > 0.7) return <TrendingUp size={16} className="text-green-600" />;
        if (value < 0.4) return <TrendingDown size={16} className="text-red-600" />;
        return <Minus size={16} className="text-gray-400" />;
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                    <p className="font-semibold text-gray-900 mb-1">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200 max-w-md w-full">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">⚠️ Error Loading Insights</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={fetchAllData}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <RefreshCw size={20} /> Retry
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">AI Customer Insights Dashboard</h1>
                        <p className="text-gray-600 mt-1">Loading analytics...</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
                            <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
                            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                            <div className="h-8 bg-gray-200 rounded w-32"></div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
                            <div className="h-64 bg-gray-200 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="w-8 h-8 text-red-600" />
                        AI Customer Insights Dashboard
                    </h1>
                    <p className="text-gray-600 mt-1">Analyze buying patterns, Customer Lifetime Value, and preferences</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className={`flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${refreshing ? 'opacity-75' : ''}`}
                >
                    <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
                    {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 rounded-xl">
                            <Users className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-600">Total Customers</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-2xl font-bold text-gray-900">{overview?.total_customers || 0}</p>
                                {getTrendIcon(0.8)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 rounded-xl">
                            <IndianRupee className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-600">Avg Lifetime Value</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-2xl font-bold text-gray-900">₹{(overview?.avg_lifetime_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                                {getTrendIcon(0.75)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 rounded-xl">
                            <RefreshCw className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-600">Repeat Purchase Rate</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-2xl font-bold text-gray-900">{((overview?.repeat_customer_rate || 0) * 100).toFixed(0)}%</p>
                                {getTrendIcon(overview?.repeat_customer_rate)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 rounded-xl">
                            <Award className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-600">Top Preference</p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-xl font-bold text-gray-900 truncate">{overview?.top_preferences?.[0] || 'N/A'}</p>
                                {getTrendIcon(0.6)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Category Popularity</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={patterns?.category_popularity || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="category" angle={-15} textAnchor="end" height={80} />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" fill="#dc2626" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Monthly Order Trends</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={patterns?.monthly_trends || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line type="monotone" dataKey="orders" stroke="#dc2626" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🥧 Customer Engagement Status</h3>
                    <div className="mb-4 grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                            <div className="text-sm text-blue-700 font-medium">Avg. Purchase Cycle</div>
                            <div className="text-2xl font-bold text-blue-900">
                                {patterns?.purchase_frequency?.avg_purchase_cycle_days || 0} days
                            </div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                            <div className="text-sm text-green-700 font-medium">Repeat Customers</div>
                            <div className="text-2xl font-bold text-green-900">
                                {patterns?.purchase_frequency?.total_repeat_customers || 0}
                            </div>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={Object.entries(patterns?.purchase_frequency?.distribution || {}).map(([key, value]) => ({
                                    name: key,
                                    value
                                }))}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {Object.keys(patterns?.purchase_frequency?.distribution || {}).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                formatter={(value, entry) => `${value}: ${entry.payload.value} customers`}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Preferences Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">🎨 Customer Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-lg font-medium text-gray-800 mb-3">📦 Popular Materials</h4>
                        <div className="space-y-2">
                            {preferences?.material_preferences?.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center justify-center w-8 h-8 bg-red-600 text-white font-bold rounded-full text-sm">
                                            {idx + 1}
                                        </span>
                                        <span className="font-medium text-gray-900">{item.material}</span>
                                    </div>
                                    <span className="text-sm text-gray-600 font-medium">{item.count} orders</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-lg font-medium text-gray-800 mb-3">🛠️ Custom Options</h4>
                        <div className="space-y-2">
                            {preferences?.custom_options?.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center justify-center w-8 h-8 bg-red-600 text-white font-bold rounded-full text-sm">
                                            {idx + 1}
                                        </span>
                                        <span className="font-medium text-gray-900">{item.option}</span>
                                    </div>
                                    <span className="text-sm text-gray-600 font-medium">{item.count}×</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* CLV Table with Search and Export */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900">💎 Customer Lifetime Value Rankings</h3>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search customers or regions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <select
                            value={regionFilter}
                            onChange={(e) => setRegionFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        >
                            <option value="all">All Regions</option>
                            {getUniqueRegions().map(region => (
                                <option key={region} value={region}>{region}</option>
                            ))}
                        </select>
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <Download size={18} /> Export CSV
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th
                                    onClick={() => sortCLVTable('name')}
                                    className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                                >
                                    Customer {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th
                                    onClick={() => sortCLVTable('region')}
                                    className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                                >
                                    Region {sortConfig.key === 'region' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th
                                    onClick={() => sortCLVTable('total_spent')}
                                    className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                                >
                                    Total Spent {sortConfig.key === 'total_spent' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th
                                    onClick={() => sortCLVTable('order_count')}
                                    className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                                >
                                    Orders {sortConfig.key === 'order_count' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th
                                    onClick={() => sortCLVTable('clv')}
                                    className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                                >
                                    CLV Score {sortConfig.key === 'clv' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {getFilteredAndSortedCLVData().slice(0, 10).map((customer, idx) => (
                                <tr
                                    key={customer.customer_id}
                                    className={`border-b border-gray-100 hover:bg-red-50 transition-colors ${idx < 3 ? 'bg-red-50' : ''}`}
                                >
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            {idx < 3 && (
                                                <span className="flex items-center justify-center w-6 h-6 bg-red-600 text-white font-bold rounded-full text-xs">
                                                    {idx + 1}
                                                </span>
                                            )}
                                            <span className="font-medium text-gray-900">{customer.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                            {customer.region}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 font-medium text-gray-900">
                                        ₹{customer.total_spent.toLocaleString('en-IN')}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            {customer.order_count}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 font-bold text-red-600">
                                        ₹{customer.clv.toLocaleString('en-IN')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {getFilteredAndSortedCLVData().length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No customers found matching your filters</p>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Insights */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">🤖 AI-Generated Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiInsights.map((insight, idx) => (
                        <div
                            key={idx}
                            className="flex items-start gap-4 p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200 hover:shadow-md transition-all"
                            style={{ animationDelay: `${idx * 0.1}s` }}
                        >
                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-red-600 text-white font-bold rounded-full">
                                {idx + 1}
                            </div>
                            <div className="flex-1">
                                <div className="text-2xl mb-2">💡</div>
                                <p className="text-gray-700 leading-relaxed">{insight}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CustomerInsightsDashboard;
