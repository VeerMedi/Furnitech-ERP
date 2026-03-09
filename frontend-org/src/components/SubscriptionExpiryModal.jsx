import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CreditCard, Clock } from 'lucide-react';
import axios from 'axios';
import { toast } from '../hooks/useToast';

const SubscriptionExpiryModal = ({ isOpen, onClose, daysRemaining, isAdmin, onRenew }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-fadeIn">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>

                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-orange-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Subscription Expiring Soon
                    </h2>
                    <p className="text-gray-600">
                        Your subscription will expire in{' '}
                        <span className="font-bold text-orange-600">{daysRemaining} days</span>
                    </p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-700">
                            {isAdmin ? (
                                <>
                                    <p className="font-semibold mb-1">Action Required</p>
                                    <p>Renew your subscription to continue accessing all features and AI tools.</p>
                                </>
                            ) : (
                                <>
                                    <p className="font-semibold mb-1">Contact Administrator</p>
                                    <p>Please contact your admin to renew the subscription and maintain access.</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {isAdmin ? (
                    <div className="space-y-3">
                        <button
                            onClick={onRenew}
                            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-6 rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-lg flex items-center justify-center gap-2"
                        >
                            <CreditCard className="w-5 h-5" />
                            Renew Now - ₹15,000
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-300"
                        >
                            Remind Me Later
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-300"
                    >
                        Got It
                    </button>
                )}
            </div>
        </div>
    );
};

export default SubscriptionExpiryModal;
