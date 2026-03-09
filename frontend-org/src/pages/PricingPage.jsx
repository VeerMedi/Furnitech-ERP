import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, TrendingUp, Users, BarChart3, Star } from 'lucide-react';
import axios from 'axios';
import { toast } from '../hooks/useToast';
import { confirm } from '../hooks/useConfirm';
import { useAuthStore } from '../stores/authStore';

const loadRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

const PricingPage = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [processingPlanId, setProcessingPlanId] = useState(null);
    const [processingTokenId, setProcessingTokenId] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [userRole, setUserRole] = useState(user?.userRole || localStorage.getItem('userRole') || '');
    const [currentSubscription, setCurrentSubscription] = useState(null);
    const [tokens, setTokens] = useState(null);
    const [hasEverHadSubscription, setHasEverHadSubscription] = useState(false);

    // Helper for role checks
    const isAdmin = userRole?.toLowerCase() === 'admin';

    useEffect(() => {
        // Sync role from store or local storage
        const role = user?.userRole || localStorage.getItem('userRole');
        if (role) setUserRole(role);
        fetchSubscriptionStatus();
    }, [user]);

    const fetchSubscriptionStatus = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/subscription/status`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('orgToken')}`,
                },
            });
            if (response.data.success && response.data.hasSubscription) {
                setCurrentSubscription(response.data.subscription);
                setHasEverHadSubscription(true); // User has/had subscription
                if (response.data.tokens) {
                    setTokens(response.data.tokens);
                }
            } else {
                // Reset to null for fresh check
                console.log('ℹ️ No active subscription.');
                setCurrentSubscription(null);
                setTokens(null);
                setHasEverHadSubscription(false); // First time user
            }
        } catch (error) {
            console.error('Error fetching subscription:', error);
            setCurrentSubscription(null);
            setTokens(null);
            setHasEverHadSubscription(false);
        }
    };

    const plans = [
        {
            id: '1-month',
            name: 'Monthly Subscription',
            duration: '1 Month',
            price: '₹15,000',
            priceNum: 15000,
            tokens: 1000,
            popular: true,
            badge: 'Standard Plan',
            features: [
                'Full Dashboard Access',
                '1000 AI Tokens per Feature',
                'AI Reports & Analytics',
                'AI Demand Forecasting',
                'AI Customer Insights',
                'Email Support',
                'Data Export',
                'Auto-Renewal Reminders',
            ],
        },
    ];

    const tokenPackage = {
        id: 'tokens',
        name: 'AI Token Pack',
        price: '₹499',
        priceNum: 499,
        tokens: 1000,
        description: 'Add 1000 tokens to each AI feature',
    };

    // Password Prompt State
    const [showPrompt, setShowPrompt] = useState(false);
    const [promptType, setPromptType] = useState(''); // 'plan', 'token_single', 'token_bundle'
    const [promptData, setPromptData] = useState(null);
    const [passwordInput, setPasswordInput] = useState('');

    const handlePurchaseClick = (planId) => {
        if (!isAdmin) {
            toast.error('Only admins can purchase subscriptions.');
            return;
        }
        setPromptType('plan');
        setPromptData(planId);
        setPasswordInput('');
        setShowPrompt(true);
    };

    const handleTokenPurchaseClick = (type, feature = null) => {
        if (!isAdmin) {
            toast.error('Only admins can purchase tokens.');
            return;
        }
        setPromptType(type === 'bundle' ? 'token_bundle' : 'token_single');
        setPromptData({ type, feature });
        setPasswordInput('');
        setShowPrompt(true);
    };

    const verifyAndExecute = async () => {
        if (!passwordInput) {
            toast.error('Please enter your password');
            return;
        }

        try {
            // Verify password against logged-in admin's actual password
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/verify-password`,
                { password: passwordInput },
                { headers: { Authorization: `Bearer ${localStorage.getItem('orgToken')}` } }
            );

            if (response.data.success) {
                setShowPrompt(false);
                if (promptType === 'plan') {
                    executePurchasePlan(promptData);
                } else {
                    executePurchaseTokens(promptData.type, promptData.feature);
                }
            }
        } catch (error) {
            console.error('Password verification failed:', error);
            toast.error('Incorrect Password');
        }
    };

    const executePurchasePlan = async (planId) => {
        setProcessingPlanId(planId);
        setSelectedPlan(planId);

        try {
            // 1. Initiate Order (Checks for Sim Mode vs Real Mode)
            const result = await axios.post(`${import.meta.env.VITE_API_URL}/subscription/create-order`,
                { plan: planId },
                { headers: { Authorization: `Bearer ${localStorage.getItem('orgToken')}` } }
            );

            // Check if Simulation (Mock) Mode
            if (result.data.simulationMode) {
                console.log('⚡ Simulation Mode: Using direct Mock API...');
                const mockTx = `MOCK_${Date.now()}`;
                const simResponse = await axios.post(`${import.meta.env.VITE_API_URL}/subscription/purchase`,
                    { plan: planId, transactionId: mockTx, paymentMethod: 'simulation' },
                    { headers: { Authorization: `Bearer ${localStorage.getItem('orgToken')}` } }
                );

                if (simResponse.data.success) {
                    toast.success('Subscription Active (Simulation Mode)! 🎉');
                    setTimeout(() => navigate('/dashboard'), 1500);
                }
                return;
            }

            // 2. Real Payment Flow
            const { amount, orderId, currency, keyId } = result.data;

            const isLoaded = await loadRazorpay();
            if (!isLoaded) {
                toast.error('Razorpay failed to load. Check connection.');
                return;
            }

            const options = {
                key: keyId,
                amount: amount,
                currency: currency,
                name: 'Vlite Furnitures',
                description: `Subscription - ${planId}`,
                order_id: orderId,
                handler: async function (response) {
                    try {
                        // 3. Verify Payment
                        const verifyData = {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            plan: planId
                        };

                        const verifyRes = await axios.post(`${import.meta.env.VITE_API_URL}/subscription/verify-payment`, verifyData,
                            { headers: { Authorization: `Bearer ${localStorage.getItem('orgToken')}` } }
                        );

                        if (verifyRes.data.success) {
                            toast.success('Payment Successful! Subscription Active 🎉');
                            setTimeout(() => navigate('/dashboard'), 1500);
                        }
                    } catch (err) {
                        console.error('Verification Error:', err);
                        toast.error('Payment verification failed.');
                    }
                },
                prefill: {
                    name: 'Vlite Admin',
                    email: 'admin@vlite.com',
                },
                theme: {
                    color: '#B91C1C', // Red-700
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                toast.error(response.error.description);
            });
            rzp.open();

        } catch (error) {
            console.error('Purchase Error:', error);
            toast.error(error.response?.data?.message || 'Failed to initiate purchase');
        } finally {
            setProcessingPlanId(null);
            setSelectedPlan(null);
        }
    };

    const executePurchaseTokens = async (type = 'bundle', feature = null) => {
        const id = type === 'bundle' ? 'bundle' : feature;
        setProcessingTokenId(id);

        try {
            // Step 1: Create Order
            const orderRes = await axios.post(
                `${import.meta.env.VITE_API_URL}/subscription/create-token-order`,
                { type, feature },
                { headers: { Authorization: `Bearer ${localStorage.getItem('orgToken')}` } }
            );

            if (!orderRes.data.success) {
                throw new Error(orderRes.data.message || 'Failed to initiate purchase');
            }

            // Check if Simulation Mode
            if (orderRes.data.simulationMode) {
                console.log('Simulation Mode: Completing token purchase directly...');

                // Call Verify with Mock Data for Sim Mode
                const verifyRes = await axios.post(
                    `${import.meta.env.VITE_API_URL}/subscription/verify-token-payment`,
                    {
                        razorpay_order_id: `SIM_${Date.now()}`,
                        razorpay_payment_id: `SIM_PAY_${Date.now()}`,
                        razorpay_signature: 'sim_signature',
                        type,
                        feature
                    },
                    { headers: { Authorization: `Bearer ${localStorage.getItem('orgToken')}` } }
                );

                if (verifyRes.data.success) {
                    const message = type === 'bundle'
                        ? 'All-in-One AI Suite purchased successfully! 🎉'
                        : `${feature.replace('ai', 'AI ')} Pack purchased successfully! 🚀`;
                    toast.success(message);
                    fetchSubscriptionStatus();
                }
                return;
            }

            // Step 2: Open Razorpay (Real Mode)
            const options = {
                key: orderRes.data.keyId,
                amount: orderRes.data.amount,
                currency: orderRes.data.currency,
                name: 'Vlite Furnitures',
                description: type === 'bundle' ? 'Complete AI Suite' : `${feature} Token Pack`,
                order_id: orderRes.data.orderId,
                handler: async function (response) {
                    try {
                        const verifyRes = await axios.post(
                            `${import.meta.env.VITE_API_URL}/subscription/verify-token-payment`,
                            {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                type,
                                feature
                            },
                            { headers: { Authorization: `Bearer ${localStorage.getItem('orgToken')}` } }
                        );

                        if (verifyRes.data.success) {
                            const message = type === 'bundle'
                                ? 'All-in-One AI Suite purchased successfully! 🎉'
                                : `${feature?.replace('ai', 'AI ') || 'Feature'} Pack purchased successfully! 🚀`;
                            toast.success(message);
                            fetchSubscriptionStatus();
                        }
                    } catch (verifyError) {
                        console.error('Token payment verification failed:', verifyError);
                        toast.error('Payment verification failed. Please contact support.');
                    } finally {
                        setProcessingTokenId(null);
                    }
                },
                prefill: {
                    name: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Vlite User',
                    email: user?.email,
                },
                theme: {
                    color: '#B91C1C', // Red-700
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                toast.error(response.error.description);
                setProcessingTokenId(null);
            });
            rzp.open();

        } catch (error) {
            console.error('Token purchase error:', error);
            toast.error(error.response?.data?.message || 'Failed to initiate purchase');
            setProcessingTokenId(null);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 py-12 px-4 relative">
            {/* Password Prompt Modal */}
            {showPrompt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 border-2 border-red-100 animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Zap className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Enter Admin Password</h3>
                            <p className="text-sm text-gray-500 mt-1">Please enter your login password to confirm</p>
                        </div>

                        <input
                            type="password"
                            placeholder="Enter your admin password..."
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && verifyAndExecute()}
                            autoFocus
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all mb-6 text-lg"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowPrompt(false)}
                                className="flex-1 py-3 px-4 rounded-xl font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={verifyAndExecute}
                                className="flex-1 py-3 px-4 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-red-700 to-red-900 bg-clip-text text-transparent mb-4">
                        Choose Your Plan
                    </h1>
                    <p className="text-xl text-gray-600">
                        Unlock the full potential of your business with AI-powered insights
                    </p>
                    {currentSubscription && (
                        <div className="mt-4 inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full">
                            Current Plan: <strong>{currentSubscription.plan}</strong> |
                            Expires: <strong>{new Date(currentSubscription.endDate).toLocaleDateString()}</strong>
                        </div>
                    )}
                </div>

                {/* Current Token Balance */}
                {currentSubscription && (
                    <div className="max-w-4xl mx-auto mb-12 bg-white rounded-2xl shadow-lg p-6 border-2 border-red-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900">Your Current AI Tokens</h3>
                            <span className="text-sm text-gray-600">Real-time balance</span>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            {/* AI Reports */}
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <BarChart3 className="w-5 h-5 text-blue-700" />
                                    <span className="font-semibold text-gray-900 text-sm">AI Reports</span>
                                </div>
                                <div className="text-3xl font-bold text-blue-700 mb-2">
                                    {tokens?.aiReports?.total?.toLocaleString() || '0'}
                                </div>
                                <div className="text-xs space-y-1">
                                    <div className="text-gray-700">💳 Purchased: <strong>{tokens?.aiReports?.purchased?.remaining?.toLocaleString() || '0'}/{tokens?.aiReports?.purchased?.total?.toLocaleString() || '0'}</strong></div>
                                    <div className="text-gray-700">🎁 Free: <strong>{tokens?.aiReports?.free?.remaining?.toLocaleString() || '0'}/{tokens?.aiReports?.free?.total?.toLocaleString() || '0'}</strong></div>
                                </div>
                            </div>

                            {/* AI Forecasting */}
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-5 h-5 text-purple-700" />
                                    <span className="font-semibold text-gray-900 text-sm">Forecasting</span>
                                </div>
                                <div className="text-3xl font-bold text-purple-700 mb-2">
                                    {tokens?.aiDemandForecasting?.total?.toLocaleString() || '0'}
                                </div>
                                <div className="text-xs space-y-1">
                                    <div className="text-gray-700">💳 Purchased: <strong>{tokens?.aiDemandForecasting?.purchased?.remaining?.toLocaleString() || '0'}/{tokens?.aiDemandForecasting?.purchased?.total?.toLocaleString() || '0'}</strong></div>
                                    <div className="text-gray-700">🎁 Free: <strong>{tokens?.aiDemandForecasting?.free?.remaining?.toLocaleString() || '0'}/{tokens?.aiDemandForecasting?.free?.total?.toLocaleString() || '0'}</strong></div>
                                </div>
                            </div>

                            {/* AI Insights */}
                            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="w-5 h-5 text-green-700" />
                                    <span className="font-semibold text-gray-900 text-sm">Insights</span>
                                </div>
                                <div className="text-3xl font-bold text-green-700 mb-2">
                                    {tokens?.aiCustomerInsights?.total?.toLocaleString() || '0'}
                                </div>
                                <div className="text-xs space-y-1">
                                    <div className="text-gray-700">💳 Purchased: <strong>{tokens?.aiCustomerInsights?.purchased?.remaining?.toLocaleString() || '0'}/{tokens?.aiCustomerInsights?.purchased?.total?.toLocaleString() || '0'}</strong></div>
                                    <div className="text-gray-700">🎁 Free: <strong>{tokens?.aiCustomerInsights?.free?.remaining?.toLocaleString() || '0'}/{tokens?.aiCustomerInsights?.free?.total?.toLocaleString() || '0'}</strong></div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 text-center text-sm text-gray-600">
                            💡 Need more tokens? Purchase the token pack below or upgrade your plan
                        </div>
                    </div>
                )}


                {/* Pricing Interface - Show if New User OR Expired Subscription */}
                {(!hasEverHadSubscription || (currentSubscription && !currentSubscription.isActive)) ? (
                    /* FIRST TIME VIEW - Plan Card */
                    <div className="flex justify-center mb-12">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`relative bg-white rounded-3xl shadow-xl p-8 border-2 transition-all duration-300 hover:shadow-2xl hover:scale-105 ${plan.popular ? 'border-red-700' : 'border-gray-200'
                                    } max-w-md w-full`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-gradient-to-r from-red-700 to-red-900 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg flex items-center gap-2">
                                            <Star className="w-4 h-4" />
                                            {plan.badge}
                                        </span>
                                    </div>
                                )}

                                <div className="text-center mb-6">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                                    <p className="text-gray-600 mb-4">{plan.duration}</p>
                                    <div className="text-5xl font-bold bg-gradient-to-r from-red-700 to-red-900 bg-clip-text text-transparent mb-2">
                                        {plan.price}
                                    </div>
                                    <p className="text-gray-500">
                                        {plan.tokens} tokens per AI feature
                                    </p>
                                </div>

                                <div className="space-y-3 mb-8">
                                    {plan.features.map((feature, idx) => (
                                        <div key={idx} className="flex items-start gap-3">
                                            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-700">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                {isAdmin ? (
                                    <button
                                        onClick={() => handlePurchaseClick(plan.id)}
                                        disabled={processingPlanId !== null}
                                        className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${plan.popular
                                            ? 'bg-gradient-to-r from-red-700 to-red-900 text-white hover:from-red-800 hover:to-red-950 shadow-lg'
                                            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {processingPlanId === plan.id
                                            ? 'Processing...'
                                            : currentSubscription
                                                ? 'Renew Subscription'
                                                : 'Choose Plan'}
                                    </button>
                                ) : (
                                    <div className="text-center text-sm text-gray-500 py-3">
                                        Contact admin to purchase
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    /* RENEWAL VIEW - Simplified Card */
                    <div className="max-w-md mx-auto bg-gradient-to-br from-red-600 to-red-800 rounded-3xl shadow-2xl p-10 text-center animate-fade-in-up transform transition-all hover:scale-105 duration-300">
                        <div className="mb-6">
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                                <Zap className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2">Renew Subscription</h3>
                            <p className="text-red-100">Maintain access to Dashboard & AI Features</p>
                        </div>

                        <div className="text-5xl font-bold text-white mb-8">₹15,000<span className="text-lg text-red-200 font-normal">/month</span></div>

                        {isAdmin ? (
                            <button
                                onClick={() => handlePurchaseClick('1-month')}
                                disabled={processingPlanId !== null}
                                className="w-full bg-white text-red-700 py-4 px-8 rounded-xl font-bold text-lg shadow-lg hover:bg-red-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processingPlanId === '1-month' ? 'Processing Payment...' : 'Renew Now'}
                            </button>
                        ) : (
                            <div className="bg-red-900/30 border border-red-400/30 rounded-lg p-4 backdrop-blur-sm">
                                <p className="text-white font-medium">Contact Administrator</p>
                                <p className="text-sm text-red-200 mt-1">Only admins can renew the subscription.</p>
                            </div>
                        )}

                        <p className="mt-4 text-xs text-red-200">Secure payment via Razorpay</p>
                    </div>
                )}

                {/* AI Token Power Packs */}
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">AI Power Packs ⚡</h2>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Option 1: All-in-One Bundle */}
                        <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-red-700 relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-red-700 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                                BEST VALUE
                            </div>
                            <div className="flex flex-col h-full justify-between">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Complete AI Suite</h3>
                                    <p className="text-gray-600 mb-6">Boost every aspect of your business intelligence.</p>

                                    <div className="space-y-3 mb-8">
                                        <div className="flex items-center gap-3 bg-red-50 p-3 rounded-xl border border-red-100">
                                            <div className="bg-white p-2 rounded-lg border border-red-100"><BarChart3 className="w-5 h-5 text-red-700" /></div>
                                            <div><span className="font-bold text-gray-900">+1000</span> <span className="text-gray-600">AI Reports</span></div>
                                        </div>
                                        <div className="flex items-center gap-3 bg-red-50 p-3 rounded-xl border border-red-100">
                                            <div className="bg-white p-2 rounded-lg border border-red-100"><TrendingUp className="w-5 h-5 text-red-700" /></div>
                                            <div><span className="font-bold text-gray-900">+1000</span> <span className="text-gray-600">Forecasting</span></div>
                                        </div>
                                        <div className="flex items-center gap-3 bg-red-50 p-3 rounded-xl border border-red-100">
                                            <div className="bg-white p-2 rounded-lg border border-red-100"><Users className="w-5 h-5 text-red-700" /></div>
                                            <div><span className="font-bold text-gray-900">+1000</span> <span className="text-gray-600">Insights</span></div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-4xl font-bold text-red-700 mb-4">₹899</div>
                                    {isAdmin ? (
                                        <button
                                            onClick={() => handleTokenPurchaseClick('bundle')}
                                            disabled={processingTokenId !== null}
                                            className="w-full bg-gradient-to-r from-red-700 to-red-900 text-white py-3 px-8 rounded-xl font-semibold hover:from-red-800 hover:to-red-950 transition-all duration-300 shadow-lg disabled:opacity-50"
                                        >
                                            {processingTokenId === 'bundle' ? 'Processing...' : 'Buy Complete Suite'}
                                        </button>
                                    ) : (
                                        <div className="text-sm text-center text-gray-500">Contact admin to purchase</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Option 2: Single Feature Boost */}
                        <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-red-200">
                            <div className="flex flex-col h-full justify-between">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Single Feature Boost</h3>
                                    <p className="text-gray-600 mb-6">Top up specific tokens as you need them.</p>

                                    <div className="grid grid-cols-1 gap-3 mb-8">
                                        {[
                                            { id: 'aiReports', label: 'AI Reports', icon: BarChart3 },
                                            { id: 'aiDemandForecasting', label: 'Forecasting', icon: TrendingUp },
                                            { id: 'aiCustomerInsights', label: 'Insights', icon: Users },
                                        ].map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between p-4 rounded-xl border border-red-100 bg-red-50 transition-all duration-200 hover:shadow-md"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <item.icon className="w-6 h-6 text-red-700" />
                                                    <div className="text-left">
                                                        <div className="font-bold text-gray-900">{item.label}</div>
                                                        <div className="text-xs text-gray-500">+1000 Tokens</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="font-bold text-gray-900">₹299</div>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => handleTokenPurchaseClick('single', item.id)}
                                                            disabled={processingTokenId !== null}
                                                            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-700 hover:bg-red-800 transition-all shadow-md disabled:opacity-50 min-w-[80px]"
                                                        >
                                                            {processingTokenId === item.id ? '...' : 'Buy'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {!isAdmin && (
                                    <div className="text-sm text-center text-gray-500 mt-4">Contact admin to purchase</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features Overview */}
                <div className="mt-16 text-center">
                    <h2 className="text-3xl font-bold text-gray-900 mb-8">
                        What You Get with Every Plan
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white p-6 rounded-2xl shadow-lg">
                            <BarChart3 className="w-12 h-12 text-red-700 mb-4 mx-auto" />
                            <h3 className="text-xl font-semibold mb-2">AI Reports & Analytics</h3>
                            <p className="text-gray-600">
                                Get intelligent insights from your business data with AI-powered analytics
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-lg">
                            <TrendingUp className="w-12 h-12 text-orange-600 mb-4 mx-auto" />
                            <h3 className="text-xl font-semibold mb-2">Demand Forecasting</h3>
                            <p className="text-gray-600">
                                Predict future trends and make data-driven decisions for your inventory
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-lg">
                            <Users className="w-12 h-12 text-green-600 mb-4 mx-auto" />
                            <h3 className="text-xl font-semibold mb-2">Customer Insights</h3>
                            <p className="text-gray-600">
                                Understand your customers better with AI-driven behavioral analysis
                            </p>
                        </div>
                    </div>
                </div>

                {/* Back to Dashboard */}
                {currentSubscription && currentSubscription.isActive && (
                    <div className="mt-12 text-center">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="text-red-700 hover:text-red-800 font-semibold"
                        >
                            ← Back to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PricingPage;
