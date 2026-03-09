import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Search, Download, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import './CustomerInsights.css';

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#f5576c'];

const CustomerInsightsDashboard = () => {
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
                axios.get('/api/insights/overview'),
                axios.get('/api/insights/buying-patterns'),
                axios.get('/api/insights/clv'),
                axios.get('/api/insights/preferences'),
                axios.get('/api/insights/ai')
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
        setRefreshing(true);
        await fetchAllData();
        setTimeout(() => setRefreshing(false), 500);
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
        if (!value) return <Minus size={16} />;
        // Simple trend logic - can be enhanced with historical data
        if (value > 0.7) return <TrendingUp size={16} className="trend-up" />;
        if (value < 0.4) return <TrendingDown size={16} className="trend-down" />;
        return <Minus size={16} className="trend-neutral" />;
    };

    const SkeletonLoader = () => (
        <div className="skeleton-container">
            <div className="skeleton-kpi-grid">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="skeleton-kpi-card">
                        <div className="skeleton-icon"></div>
                        <div className="skeleton-content">
                            <div className="skeleton-label"></div>
                            <div className="skeleton-value"></div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="skeleton-chart-grid">
                {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton-chart"></div>
                ))}
            </div>
        </div>
    );

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip">
                    <p className="tooltip-label">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="tooltip-value" style={{ color: entry.color }}>
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
            <div className="error-container">
                <div className="error-card">
                    <h2>⚠️ Error Loading Insights</h2>
                    <p>{error}</p>
                    <button onClick={fetchAllData} className="retry-button">
                        <RefreshCw size={20} /> Retry
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="customer-insights-dashboard">
                <div className="dashboard-header">
                    <h1>📊 AI Customer Insights Dashboard</h1>
                    <p>Loading analytics...</p>
                </div>
                <SkeletonLoader />
            </div>
        );
    }

    return (
        <div className="customer-insights-dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>📊 AI Customer Insights Dashboard</h1>
                    <p>Analyze buying patterns, Customer Lifetime Value, and preferences</p>
                </div>
                <button
                    onClick={handleRefresh}
                    className={`refresh-button ${refreshing ? 'refreshing' : ''}`}
                    disabled={refreshing}
                >
                    <RefreshCw size={20} /> {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
            </div>

            {/* Enhanced KPI Section */}
            <div className="kpi-section">
                <div className="kpi-card kpi-purple">
                    <div className="kpi-icon">👥</div>
                    <div className="kpi-content">
                        <div className="kpi-label">Total Customers</div>
                        <div className="kpi-value-row">
                            <div className="kpi-value">{overview?.total_customers || 0}</div>
                            {getTrendIcon(0.8)}
                        </div>
                    </div>
                </div>
                <div className="kpi-card kpi-blue">
                    <div className="kpi-icon">💰</div>
                    <div className="kpi-content">
                        <div className="kpi-label">Avg Lifetime Value</div>
                        <div className="kpi-value-row">
                            <div className="kpi-value">₹{(overview?.avg_lifetime_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                            {getTrendIcon(0.75)}
                        </div>
                    </div>
                </div>
                <div className="kpi-card kpi-green">
                    <div className="kpi-icon">🔄</div>
                    <div className="kpi-content">
                        <div className="kpi-label">Repeat Purchase Rate</div>
                        <div className="kpi-value-row">
                            <div className="kpi-value">{((overview?.repeat_customer_rate || 0) * 100).toFixed(0)}%</div>
                            {getTrendIcon(overview?.repeat_customer_rate)}
                        </div>
                    </div>
                </div>
                <div className="kpi-card kpi-orange">
                    <div className="kpi-icon">⭐</div>
                    <div className="kpi-content">
                        <div className="kpi-label">Top Preference</div>
                        <div className="kpi-value-row">
                            <div className="kpi-value">{overview?.top_preferences?.[0] || 'N/A'}</div>
                            {getTrendIcon(0.6)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Charts Section */}
            <div className="charts-section">
                <div className="chart-card">
                    <h3>📊 Category Popularity</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={patterns?.category_popularity || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="category" angle={-15} textAnchor="end" height={80} />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" fill="#667eea" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-card">
                    <h3>📈 Monthly Order Trends</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={patterns?.monthly_trends || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line type="monotone" dataKey="orders" stroke="#4facfe" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-card">
                    <h3>🥧 Purchase Frequency</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={Object.entries(patterns?.purchase_frequency || {}).map(([key, value]) => ({
                                    name: key.replace('_', ' ').toUpperCase(),
                                    value
                                }))}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry) => `${entry.name}: ${entry.value}`}
                                outerRadius={90}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {Object.keys(patterns?.purchase_frequency || {}).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Enhanced Preferences Section */}
            <div className="preferences-section">
                <h3>🎨 Customer Preferences</h3>
                <div className="preference-cards">
                    <div className="preference-card">
                        <h4>📦 Popular Materials</h4>
                        <div className="preference-list">
                            {preferences?.material_preferences?.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="preference-item">
                                    <span className="preference-rank">#{idx + 1}</span>
                                    <span className="preference-name">{item.material}</span>
                                    <span className="preference-count">{item.count} orders</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="preference-card">
                        <h4>🛠️ Custom Options</h4>
                        <div className="preference-list">
                            {preferences?.custom_options?.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="preference-item">
                                    <span className="preference-rank">#{idx + 1}</span>
                                    <span className="preference-name">{item.option}</span>
                                    <span className="preference-count">{item.count}×</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced CLV Table with Search and Export */}
            <div className="clv-section">
                <div className="clv-header">
                    <h3>💎 Customer Lifetime Value Rankings</h3>
                    <div className="clv-controls">
                        <div className="search-box">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search customers or regions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="region-filter"
                            value={regionFilter}
                            onChange={(e) => setRegionFilter(e.target.value)}
                        >
                            <option value="all">All Regions</option>
                            {getUniqueRegions().map(region => (
                                <option key={region} value={region}>{region}</option>
                            ))}
                        </select>
                        <button onClick={exportToCSV} className="export-button">
                            <Download size={18} /> Export CSV
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    <table className="clv-table">
                        <thead>
                            <tr>
                                <th onClick={() => sortCLVTable('name')}>
                                    Customer {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => sortCLVTable('region')}>
                                    Region {sortConfig.key === 'region' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => sortCLVTable('total_spent')}>
                                    Total Spent {sortConfig.key === 'total_spent' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => sortCLVTable('order_count')}>
                                    Orders {sortConfig.key === 'order_count' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => sortCLVTable('clv')}>
                                    CLV Score {sortConfig.key === 'clv' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {getFilteredAndSortedCLVData().slice(0, 10).map((customer, idx) => (
                                <tr key={customer.customer_id} className={idx < 3 ? 'top-customer' : ''}>
                                    <td>
                                        {idx < 3 && <span className="rank-badge">#{idx + 1}</span>}
                                        {customer.name}
                                    </td>
                                    <td>
                                        <span className="region-badge">{customer.region}</span>
                                    </td>
                                    <td>₹{customer.total_spent.toLocaleString('en-IN')}</td>
                                    <td>
                                        <span className="order-badge">{customer.order_count}</span>
                                    </td>
                                    <td className="clv-score">₹{customer.clv.toLocaleString('en-IN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {getFilteredAndSortedCLVData().length === 0 && (
                        <div className="no-results">
                            <p>No customers found matching your filters</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Enhanced AI Insights */}
            <div className="ai-insights-section">
                <h3>🤖 AI-Generated Insights</h3>
                <div className="insights-grid">
                    {aiInsights.map((insight, idx) => (
                        <div key={idx} className="insight-card" style={{ animationDelay: `${idx * 0.1}s` }}>
                            <div className="insight-number">{idx + 1}</div>
                            <div className="insight-content">
                                <div className="insight-icon">💡</div>
                                <p>{insight}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CustomerInsightsDashboard;
