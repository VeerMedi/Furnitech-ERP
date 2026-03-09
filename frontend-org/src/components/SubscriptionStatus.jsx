import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, XCircle, Calendar, CreditCard } from 'lucide-react';
import axios from 'axios';

const SubscriptionStatus = () => {
    const navigate = useNavigate();
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        const role = localStorage.getItem('userRole');
        setUserRole(role);
        fetchSubscriptionStatus();
    }, []);

    const fetchSubscriptionStatus = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/subscription/status`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (response.data.success && response.data.hasSubscription) {
                setSubscription(response.data.subscription);
            } else {
                // 🧪 TEST MODE: No subscription in DB, use mock data
                console.log('⚠️ No subscription found. Using MOCK data for testing...');
                const mockSubscription = {
                    plan: '1-month',
                    planPrice: 15000,
                    startDate: new Date().toISOString(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'active',
                    isActive: true,
                    daysRemaining: 30,
                    autoRenew: false,
                };
                setSubscription(mockSubscription);
            }
        } catch (error) {
            console.error('Error fetching subscription:', error);

            // 🧪 TEST MODE: Show mock subscription for testing
            console.log('⚠️ Using MOCK subscription data for testing...');
            const mockSubscription = {
                plan: '1-month',
                planPrice: 15000,
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active',
                isActive: true,
                daysRemaining: 30,
                autoRenew: false,
            };
            setSubscription(mockSubscription);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="animate-pulse bg-white p-6 rounded-xl shadow-md">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
        );
    }

    if (!subscription) {
        return (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 shadow-lg">
                <div className="flex items-start gap-4">
                    <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-red-900 mb-2">No Active Subscription</h3>
                        <p className="text-red-700 mb-4">
                            {userRole === 'Admin'
                                ? 'You need an active subscription to access the dashboard. Please purchase a plan to continue.'
                                : 'Your organization does not have an active subscription. Please contact your administrator.'}
                        </p>
                        {userRole === 'Admin' && (
                            <button
                                onClick={() => navigate('/pricing')}
                                className="bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition-all duration-300"
                            >
                                View Plans
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const { daysRemaining, status, endDate, plan, planPrice } = subscription;
    const isExpiringSoon = daysRemaining <= 7;
    const isExpired = status === 'expired';

    const getStatusColor = () => {
        if (isExpired) return 'red';
        if (isExpiringSoon) return 'yellow';
        return 'green';
    };

    const statusColor = getStatusColor();
    const colorClasses = {
        red: {
            bg: 'bg-red-50',
            border: 'border-red-300',
            text: 'text-red-900',
            icon: 'text-red-600',
            button: 'bg-red-600 hover:bg-red-700',
        },
        yellow: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-300',
            text: 'text-yellow-900',
            icon: 'text-yellow-600',
            button: 'bg-yellow-600 hover:bg-yellow-700',
        },
        green: {
            bg: 'bg-green-50',
            border: 'border-green-300',
            text: 'text-green-900',
            icon: 'text-green-600',
            button: 'bg-green-600 hover:bg-green-700',
        },
    };

    const colors = colorClasses[statusColor];

    return (
        <div className={`${colors.bg} border-2 ${colors.border} rounded-xl p-6 shadow-lg`}>
            <div className="flex items-start gap-4">
                {isExpired ? (
                    <XCircle className={`w-8 h-8 ${colors.icon} flex-shrink-0`} />
                ) : isExpiringSoon ? (
                    <AlertTriangle className={`w-8 h-8 ${colors.icon} flex-shrink-0`} />
                ) : (
                    <CheckCircle className={`w-8 h-8 ${colors.icon} flex-shrink-0`} />
                )}

                <div className="flex-1">
                    <h3 className={`text-xl font-bold ${colors.text} mb-2`}>
                        {isExpired
                            ? 'Subscription Expired'
                            : isExpiringSoon
                                ? 'Subscription Expiring Soon'
                                : 'Subscription Active'}
                    </h3>

                    <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className={`w-4 h-4 ${colors.icon}`} />
                            <span className={colors.text}>
                                {isExpired
                                    ? `Expired on ${new Date(endDate).toLocaleDateString()}`
                                    : `Expires on ${new Date(endDate).toLocaleDateString()}`}
                            </span>
                        </div>

                        {!isExpired && (
                            <div className="flex items-center gap-2 text-sm">
                                <CreditCard className={`w-4 h-4 ${colors.icon}`} />
                                <span className={colors.text}>
                                    Current Plan: <strong>{plan}</strong> (₹{planPrice.toLocaleString()})
                                </span>
                            </div>
                        )}

                        {!isExpired && (
                            <div className={`text-sm font-semibold ${colors.text}`}>
                                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                            </div>
                        )}
                    </div>

                    {isExpired && (
                        <p className={`${colors.text} mb-4`}>
                            {userRole === 'Admin'
                                ? 'Your subscription has expired. Renew now to regain access to all features.'
                                : 'The subscription has expired. Please contact your administrator to renew.'}
                        </p>
                    )}

                    {isExpiringSoon && !isExpired && (
                        <p className={`${colors.text} mb-4`}>
                            {userRole === 'Admin'
                                ? 'Your subscription is expiring soon. Renew now to avoid service interruption.'
                                : 'The subscription is expiring soon. Please contact your administrator.'}
                        </p>
                    )}

                    {userRole === 'Admin' && (isExpired || isExpiringSoon) && (
                        <button
                            onClick={() => navigate('/pricing')}
                            className={`${colors.button} text-white px-6 py-2 rounded-lg font-semibold transition-all duration-300`}
                        >
                            {isExpired ? 'Renew Subscription' : 'Renew Early'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubscriptionStatus;
