import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const DrawingApprovalPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error' | 'expired' | 'already_approved'
    const [data, setData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        handleApproval();
    }, [token]);

    const handleApproval = async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || '/api';
            const response = await fetch(`${API_URL}/drawings/approve/${token}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();

            if (response.ok) {
                setStatus('success');
                setData(result.data);
            } else {
                // Handle different error types
                if (result.error === 'TOKEN_EXPIRED') {
                    setStatus('expired');
                } else if (result.error === 'ALREADY_APPROVED') {
                    setStatus('already_approved');
                } else {
                    setStatus('error');
                    setError(result.message || 'Failed to approve drawing');
                }
            }
        } catch (err) {
            console.error('Approval error:', err);
            setStatus('error');
            setError('Network error. Please try again later.');
        }
    };

    const renderContent = () => {
        switch (status) {
            case 'loading':
                return (
                    <div className="text-center">
                        <Clock className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Approval...</h2>
                        <p className="text-gray-600">Please wait while we confirm your approval.</p>
                    </div>
                );

            case 'success':
                return (
                    <div className="text-center">
                        <div className="bg-green-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-16 h-16 text-green-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Drawing Approved Successfully!</h2>
                        <p className="text-lg text-gray-700 mb-6">
                            Thank you, <strong>{data?.customerName}</strong>!
                        </p>
                        <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
                            <p className="text-sm text-gray-600 mb-2">
                                <strong>Drawing:</strong> {data?.drawingFileName}
                            </p>
                            <p className="text-sm text-gray-600">
                                <strong>Approved at:</strong> {new Date(data?.approvedAt).toLocaleString('en-IN')}
                            </p>
                        </div>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                            <p className="text-sm text-blue-800">
                                ✅ Your sales representative has been notified and will proceed with the next steps.
                            </p>
                        </div>
                        <p className="text-gray-600 text-sm">
                            You can now close this window.
                        </p>
                    </div>
                );

            case 'expired':
                return (
                    <div className="text-center">
                        <div className="bg-yellow-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                            <Clock className="w-16 h-16 text-yellow-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Approval Link Expired</h2>
                        <p className="text-lg text-gray-700 mb-6">
                            This approval link has expired and is no longer valid.
                        </p>
                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
                            <p className="text-sm text-yellow-800">
                                Approval links are valid for 7 days from the date they were sent.
                            </p>
                        </div>
                        <p className="text-gray-600 text-sm">
                            Please contact your sales representative to request a new approval link.
                        </p>
                    </div>
                );

            case 'already_approved':
                return (
                    <div className="text-center">
                        <div className="bg-blue-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-16 h-16 text-blue-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Already Approved</h2>
                        <p className="text-lg text-gray-700 mb-6">
                            This drawing has already been approved.
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                            <p className="text-sm text-blue-800">
                                No further action is required. Your sales representative has been notified.
                            </p>
                        </div>
                    </div>
                );

            case 'error':
            default:
                return (
                    <div className="text-center">
                        <div className="bg-red-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                            <XCircle className="w-16 h-16 text-red-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Approval Failed</h2>
                        <p className="text-lg text-gray-700 mb-6">
                            We encountered an error while processing your approval.
                        </p>
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                            <p className="text-sm text-red-800">
                                {error || 'Invalid or expired approval link.'}
                            </p>
                        </div>
                        <p className="text-gray-600 text-sm">
                            Please contact your sales representative for assistance.
                        </p>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-2xl w-full">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Vlite Furnitures</h1>
                    <p className="text-sm text-gray-500">Drawing Approval System</p>
                </div>

                {renderContent()}
            </div>
        </div>
    );
};

export default DrawingApprovalPage;
