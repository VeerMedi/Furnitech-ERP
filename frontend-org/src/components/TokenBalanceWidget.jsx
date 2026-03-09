import React, { useState, useEffect } from 'react';
import { Zap, TrendingUp, BarChart3, Users, ShoppingCart, History, X } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const TokenBalanceWidget = ({ compact = false }) => {
    const navigate = useNavigate();
    const [tokens, setTokens] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDetails, setShowDetails] = useState(false);
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        setUserRole(role);
        fetchTokenBalance();
    }, []);

    const fetchTokenBalance = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/subscription/status`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (response.data.success && response.data.hasSubscription) {
                setTokens(response.data.tokens);
            } else {
                // 🧪 TEST MODE: No subscription, use mock tokens
                console.log('⚠️ No subscription. Using MOCK token data for testing...');
                const mockTokens = {
                    aiReports: {
                        purchased: { total: 1000, used: 223, remaining: 777 },
                        free: { total: 1000, used: 0, remaining: 1000 },
                        total: 1777,
                    },
                    aiDemandForecasting: {
                        purchased: { total: 1000, used: 111, remaining: 889 },
                        free: { total: 1000, used: 0, remaining: 1000 },
                        total: 1889,
                    },
                    aiCustomerInsights: {
                        purchased: { total: 1000, used: 156, remaining: 844 },
                        free: { total: 1000, used: 0, remaining: 1000 },
                        total: 1844,
                    },
                };
                setTokens(mockTokens);
            }
        } catch (error) {
            console.error('Error fetching token balance:', error);

            // 🧪 TEST MODE: Show mock tokens for testing
            console.log('⚠️ Using MOCK token data for testing...');
            const mockTokens = {
                aiReports: {
                    purchased: { total: 500, used: 123, remaining: 377 },
                    free: { total: 1000, used: 234, remaining: 766 },
                    total: 1143,
                },
                aiDemandForecasting: {
                    purchased: { total: 500, used: 56, remaining: 444 },
                    free: { total: 1000, used: 111, remaining: 889 },
                    total: 1333,
                },
                aiCustomerInsights: {
                    purchased: { total: 500, used: 78, remaining: 422 },
                    free: { total: 1000, used: 156, remaining: 844 },
                    total: 1266,
                },
            };
            setTokens(mockTokens);
        } finally {
            setLoading(false);
        }
    };

    const getProgressColor = (remaining, total) => {
        const percentage = (remaining / total) * 100;
        if (percentage > 50) return 'bg-green-500';
        if (percentage > 25) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getProgressPercentage = (remaining, total) => {
        if (!total) return 0;
        return Math.min((remaining / total) * 100, 100);
    };

    const features = [
        {
            id: 'aiReports',
            name: 'AI Reports & Analytics',
            icon: BarChart3,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
        },
        {
            id: 'aiDemandForecasting',
            name: 'AI Demand Forecasting',
            icon: TrendingUp,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
        },
        {
            id: 'aiCustomerInsights',
            name: 'AI Customer Insights',
            icon: Users,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
        },
    ];

    if (loading) {
        return (
            <div className="animate-pulse bg-white p-4 rounded-xl shadow-md">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
        );
    }

    if (!tokens) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
                <p className="text-yellow-800 text-sm">
                    ⚠️ No active subscription. <a href="/pricing" className="underline">View plans</a>
                </p>
            </div>
        );
    }

    // Compact view (for navbar or sidebar)
    if (compact) {
        const totalTokens = Object.values(tokens).reduce((sum, feature) => sum + feature.total, 0);

        return (
            <div
                onClick={() => setShowDetails(!showDetails)}
                className="relative bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-xl cursor-pointer hover:shadow-lg transition-all duration-300 border border-blue-200"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        <span className="font-semibold text-gray-900">AI Tokens</span>
                    </div>
                    <div className="text-sm font-bold text-blue-600">
                        {totalTokens}
                    </div>
                </div>

                {showDetails && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl p-4 border border-gray-200 z-50 w-80">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowDetails(false);
                            }}
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <h4 className="font-semibold text-gray-900 mb-3">Token Balance</h4>
                        <div className="space-y-3">
                            {features.map((feature) => {
                                const featureTokens = tokens[feature.id];
                                const Icon = feature.icon;

                                return (
                                    <div key={feature.id} className="text-xs">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icon className={`w-4 h-4 ${feature.color}`} />
                                            <span className="font-medium text-gray-700 flex-1">{feature.name}</span>
                                        </div>
                                        <div className="ml-6 space-y-1">
                                            <div className="flex justify-between text-gray-600">
                                                <span>💳 Purchased: {featureTokens.purchased.remaining}</span>
                                            </div>
                                            <div className="flex justify-between text-gray-600">
                                                <span>🎁 Free: {featureTokens.free.remaining}</span>
                                            </div>
                                            <div className="flex justify-between font-semibold text-gray-900">
                                                <span>📊 Total: {featureTokens.total}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {userRole === 'Admin' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/pricing');
                                }}
                                className="mt-4 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
                            >
                                Buy More Tokens
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Full view (for dashboard)
    return (
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">AI Token Balance</h3>
                <Zap className="w-8 h-8 text-yellow-500" />
            </div>

            <div className="space-y-6">
                {features.map((feature) => {
                    const featureTokens = tokens[feature.id];
                    const Icon = feature.icon;
                    const totalRemaining = featureTokens.purchased.remaining + featureTokens.free.remaining;
                    const totalAllocated = featureTokens.purchased.total + featureTokens.free.total;

                    return (
                        <div key={feature.id} className={`${feature.bgColor} rounded-xl p-4 border border-gray-200`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <Icon className={`w-6 h-6 ${feature.color}`} />
                                    <h4 className="font-semibold text-gray-900">{feature.name}</h4>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-gray-900">{totalRemaining}</div>
                                    <div className="text-xs text-gray-600">Available</div>
                                </div>
                            </div>

                            {/* Purchased Tokens */}
                            <div className="mb-3">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-gray-700">💳 Purchased Tokens</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {featureTokens.purchased.remaining} / {featureTokens.purchased.total}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${getProgressColor(featureTokens.purchased.remaining, featureTokens.purchased.total)}`}
                                        style={{ width: `${getProgressPercentage(featureTokens.purchased.remaining, featureTokens.purchased.total)}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Free Tokens */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-gray-700">🎁 Free Tokens</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {featureTokens.free.remaining} / {featureTokens.free.total}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${getProgressColor(featureTokens.free.remaining, featureTokens.free.total)}`}
                                        style={{ width: `${getProgressPercentage(featureTokens.free.remaining, featureTokens.free.total)}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Warning if low */}
                            {totalRemaining < 100 && (
                                <div className="mt-2 text-xs text-orange-600 font-semibold">
                                    ⚠️ Low token balance! Consider purchasing more.
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
                {userRole === 'Admin' && (
                    <button
                        onClick={() => navigate('/pricing')}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg flex items-center justify-center gap-2"
                    >
                        <ShoppingCart className="w-5 h-5" />
                        Buy More Tokens
                    </button>
                )}
                <button
                    onClick={() => navigate('/token-usage')}
                    className="flex-1 bg-gray-100 text-gray-900 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-300 flex items-center justify-center gap-2"
                >
                    <History className="w-5 h-5" />
                    Usage History
                </button>
            </div>
        </div>
    );
};

export default TokenBalanceWidget;
