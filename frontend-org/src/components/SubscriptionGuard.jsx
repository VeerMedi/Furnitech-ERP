import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Clock, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const SubscriptionGuard = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuthStore();
    const [checking, setChecking] = useState(true);
    const [isExpired, setIsExpired] = useState(false);
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        checkSubscription();
    }, [location.pathname, user]);

    const checkSubscription = async () => {
        try {
            const role = user?.userRole || localStorage.getItem('userRole');
            setUserRole(role);
            const isAdmin = role?.toLowerCase() === 'admin';

            const response = await axios.get(`${import.meta.env.VITE_API_URL}/subscription/status`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('orgToken')}` }
            });

            if (response.data.success && response.data.hasSubscription) {
                const { status, daysRemaining } = response.data.subscription;
                const expired = status === 'expired' || daysRemaining <= 0;

                setIsExpired(expired);

                if (expired) {
                    // Admin: Force to pricing page (can't escape)
                    if (isAdmin && location.pathname !== '/pricing') {
                        navigate('/pricing', { replace: true });
                    }
                    // Other users: Show waiting screen (handled below)
                }
            } else {
                // No subscription at all
                if (isAdmin && location.pathname !== '/pricing') {
                    navigate('/pricing', { replace: true });
                }
                setIsExpired(true);
            }
        } catch (error) {
            console.error('Subscription check error:', error);
        } finally {
            setChecking(false);
        }
    };

    // Loading state
    if (checking) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Checking subscription...</p>
                </div>
            </div>
        );
    }

    const isAdmin = userRole?.toLowerCase() === 'admin';

    // Non-admin users with expired subscription: Show waiting screen
    if (isExpired && !isAdmin) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-red-50 via-orange-50 to-red-100 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-12 text-center">
                    <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-12 h-12 text-orange-600 animate-pulse" />
                    </div>

                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Subscription Expired
                    </h1>

                    <p className="text-xl text-gray-600 mb-8">
                        Your organization's subscription has expired.
                    </p>

                    <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 mb-8">
                        <div className="flex items-start gap-4">
                            <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                            <div className="text-left">
                                <p className="font-semibold text-gray-900 mb-2">
                                    Please Contact Your Administrator
                                </p>
                                <p className="text-gray-700 text-sm">
                                    Your admin needs to renew the subscription to restore access to the dashboard and all features.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="text-sm text-gray-500 mb-6">
                        This screen will automatically update once the subscription is renewed.
                    </div>

                    <button
                        onClick={() => {
                            logout();
                            navigate('/login');
                        }}
                        className="text-red-600 hover:text-red-800 font-medium underline"
                    >
                        Login with a different account (Admin)
                    </button>
                </div>
            </div>
        );
    }

    // Admin on pricing page OR active subscription: Show normal content
    return <>{children}</>;
};

export default SubscriptionGuard;
