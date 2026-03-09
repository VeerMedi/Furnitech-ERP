import React, { useEffect, useState } from 'react';
import { paymentsAPI } from '../services/api';
import Card from '../components/Card';
import { Search, ChevronLeft, CreditCard, Activity, Calendar, AlertCircle } from 'lucide-react';
import Button from '../components/Button';

const Payments = () => {
    const [view, setView] = useState('list'); // 'list' or 'detail'
    const [orgs, setOrgs] = useState([]);
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        try {
            const response = await paymentsAPI.getSubscriptions();
            setOrgs(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch subscriptions:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredOrgs = orgs.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatCurrency = (amount) => {
        if (!amount) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const calculateDaysRemaining = (endDate) => {
        if (!endDate) return 0;
        const end = new Date(endDate);
        const now = new Date();
        const diff = end - now;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    // --- DETAIL VIEW ---
    if (view === 'detail' && selectedOrg) {
        const { subscription } = selectedOrg;
        const daysRemaining = calculateDaysRemaining(subscription.endDate);

        // Calculate Token Stats
        const tokenOptions = ['aiReports', 'aiDemandForecasting', 'aiCustomerInsights'];
        const tokenStats = tokenOptions.map(key => {
            const free = subscription.freeTokens?.[key] || { total: 0, used: 0, remaining: 0 };
            const purchased = subscription.purchasedTokens?.[key] || { total: 0, used: 0, remaining: 0 };

            return {
                name: key.replace('ai', 'AI ').replace(/([A-Z])/g, ' $1').trim(),
                key,
                free,
                purchased
            };
        });

        return (
            <div className="space-y-6">
                <Button variant="ghost" className="mb-4 pl-0" onClick={() => setView('list')}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back to Organizations
                </Button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Overview Card */}
                    <Card className="md:col-span-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-foreground">{selectedOrg.name}</h2>
                                <p className="text-muted-foreground">{selectedOrg.email}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase
                        ${subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {subscription.status}
                            </span>
                        </div>

                        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-muted/30 rounded-lg">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Current Plan</p>
                                <p className="text-lg font-bold text-foreground mt-1 capitalize">{subscription.plan}</p>
                                <p className="text-sm text-primary font-medium">{formatCurrency(subscription.planPrice)}</p>
                            </div>
                            <div className="p-4 bg-muted/30 rounded-lg">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Expires In</p>
                                <p className={`text-lg font-bold mt-1 ${daysRemaining < 7 ? 'text-red-600' : 'text-foreground'}`}>
                                    {daysRemaining > 0 ? `${daysRemaining} Days` : 'Expired'}
                                </p>
                                <p className="text-xs text-muted-foreground">{formatDate(subscription.endDate)}</p>
                            </div>
                            <div className="p-4 bg-muted/30 rounded-lg">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Start Date</p>
                                <p className="text-lg font-bold text-foreground mt-1">{formatDate(subscription.startDate)}</p>
                            </div>
                            <div className="p-4 bg-muted/30 rounded-lg">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Auto Renew</p>
                                <p className="text-lg font-bold text-foreground mt-1">{subscription.autoRenew ? 'Yes' : 'No'}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Token Usage Summary */}
                    <Card className="md:col-span-1">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Token Usage</h3>
                        <div className="space-y-6">
                            {tokenStats.map(stat => (
                                <div key={stat.key} className="border-b border-border pb-4 last:border-0 last:pb-0">
                                    <div className="font-medium text-foreground mb-3">{stat.name}</div>

                                    {/* Free Tokens */}
                                    <div className="mb-3">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-muted-foreground">Free Plan</span>
                                            <span className="text-foreground">{stat.free.remaining} / {stat.free.total}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-secondary/20 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                                style={{ width: `${stat.free.total > 0 ? (stat.free.remaining / stat.free.total) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Purchased Tokens */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-muted-foreground">Purchased</span>
                                            <span className="text-foreground">{stat.purchased.remaining} / {stat.purchased.total}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-secondary/20 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                                style={{ width: `${stat.purchased.total > 0 ? (stat.purchased.remaining / stat.purchased.total) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Payment History */}
                <Card>
                    <h3 className="text-lg font-semibold text-foreground mb-4 px-6 pt-6">Transaction History</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Date</th>
                                    <th className="px-6 py-3 font-medium">Description</th>
                                    <th className="px-6 py-3 font-medium">Type</th>
                                    <th className="px-6 py-3 font-medium">Amount</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {subscription.paymentHistory && subscription.paymentHistory.length > 0 ? (
                                    [...subscription.paymentHistory]
                                        .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
                                        .map((payment, idx) => (
                                            <tr key={idx} className="bg-background hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-foreground">
                                                    {formatDate(payment.paymentDate)}
                                                </td>
                                                <td className="px-6 py-4 text-foreground">
                                                    {payment.description || payment.plan}
                                                    <div className="text-xs text-muted-foreground">{payment.transactionId}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                            ${payment.type === 'subscription' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                                        {payment.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-foreground">
                                                    {formatCurrency(payment.amount)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                            ${payment.paymentStatus === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {payment.paymentStatus}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-8 text-center text-muted-foreground">
                                            No transactions found for this organization.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    }

    // --- LIST VIEW ---
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">Subscriptions & Payments</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage organization plans and token usage</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search organization name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOrgs.map((org) => {
                    const daysRemaining = calculateDaysRemaining(org.subscription.endDate);
                    const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0;
                    const isExpired = daysRemaining <= 0;

                    return (
                        <div
                            key={org._id}
                            onClick={() => { setSelectedOrg(org); setView('detail'); }}
                            className="group relative bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer hover:border-primary/50"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                    {org.name.charAt(0)}
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium uppercase 
                            ${org.subscription.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {org.subscription.status}
                                </span>
                            </div>

                            <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{org.name}</h3>
                            <p className="text-sm text-muted-foreground mb-4">{org.email}</p>

                            <div className="space-y-3 pt-4 border-t border-border">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Current Plan</span>
                                    <span className="font-medium capitalize">{org.subscription.plan}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Expires In</span>
                                    <span className={`font-medium ${isExpiringSoon || isExpired ? 'text-red-500' : 'text-foreground'}`}>
                                        {isExpired ? 'Expired' : `${daysRemaining} Days`}
                                    </span>
                                </div>
                            </div>

                            {isExpiringSoon && (
                                <div className="absolute top-0 right-0 -mt-2 -mr-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredOrgs.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No organizations found matching "{searchTerm}"
                    </div>
                )}
            </div>
        </div>
    );
};

export default Payments;
