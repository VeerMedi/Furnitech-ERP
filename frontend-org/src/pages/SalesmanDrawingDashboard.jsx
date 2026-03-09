import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { drawingAPI } from '../services/api';
import { Download, Mail, FileText, Users, Folder, AlertCircle, X, XCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { toast } from '../hooks/useToast';
import { confirm } from '../hooks/useConfirm';

const SalesmanDrawingDashboard = () => {
    const navigate = useNavigate();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sendingEmail, setSendingEmail] = useState({});
    const [emailStatus, setEmailStatus] = useState({});
    const [deleting, setDeleting] = useState({});
    const [markingComplete, setMarkingComplete] = useState({});

    // Filter state
    const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'done'

    useEffect(() => {
        // Check user role
        const authData = localStorage.getItem('auth');
        const orgUser = localStorage.getItem('orgUser');

        let role = '';
        let email = '';

        if (authData) {
            try {
                const parsed = JSON.parse(authData);
                role = parsed.user?.userRole || '';
                email = parsed.user?.email || '';
            } catch (e) {
                console.error('Failed to parse auth data:', e);
            }
        }

        if (!role && orgUser) {
            try {
                const parsed = JSON.parse(orgUser);
                role = parsed.userRole || '';
                email = parsed.email || '';
            } catch (e) {
                console.error('Failed to parse orgUser:', e);
            }
        }

        if (email === 'jasleen@vlite.com') {
            role = 'Admin';
        }

        if (role === 'POC' || role === 'Admin') {
            navigate('/dashboard');
            return;
        } else if (role === 'Design' || role === 'Design Dept Head') {
            navigate('/drawings');
            return;
        } else if (role !== 'Salesman') {
            navigate('/dashboard');
            return;
        }

        fetchDashboard();
    }, [navigate]);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const response = await drawingAPI.getSalesmanDashboard();
            setDashboardData(response.data.data);
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkComplete = async (customerGroup) => {
        const customerName = `${customerGroup.customer.firstName} ${customerGroup.customer.lastName}`;

        const confirmed = await confirm(`✅ Mark all drawings for ${customerName} as COMPLETE?\n\nThis will move the order to Pre-Production.`, 'Confirm Completion');
        if (!confirmed) return;

        try {
            setMarkingComplete(prev => ({ ...prev, [customerGroup.customer._id]: true }));
            await drawingAPI.markCustomerComplete(customerGroup.customer._id);
            toast.success(`✅ Drawings marked complete for ${customerName}!`);
            fetchDashboard();
        } catch (error) {
            console.error('Failed to mark complete:', error);
            const serverError = error.response?.data;
            const detailedReason = serverError?.error || serverError?.message || error.message;
            const errorStack = serverError?.stack || '';

            toast.error(`❌ FAILED TO MARK COMPLETE:\n\nError: ${detailedReason}`);
            if (errorStack) console.error('SERVER STACK TRACE:', errorStack);
        } finally {
            setMarkingComplete(prev => ({ ...prev, [customerGroup.customer._id]: false }));
        }
    };

    const handleUndoComplete = async (customerGroup) => {
        const customerName = `${customerGroup.customer.firstName} ${customerGroup.customer.lastName}`;

        const confirmed = await confirm(`↩️  Undo completion for ${customerName}?\n\nThis will move the order back to pending.`, 'Confirm Undo');
        if (!confirmed) return;

        try {
            setMarkingComplete(prev => ({ ...prev, [customerGroup.customer._id]: true }));
            await drawingAPI.undoCustomerComplete(customerGroup.customer._id);
            toast.success(`↩️  Completion undone for ${customerName}!`);
            fetchDashboard();
        } catch (error) {
            console.error('Failed to undo:', error);
            const serverError = error.response?.data;
            const detailedReason = serverError?.error || serverError?.message || error.message;
            toast.error(`❌ FAILED TO UNDO:\n\nReason: ${detailedReason}`);
        } finally {
            setMarkingComplete(prev => ({ ...prev, [customerGroup.customer._id]: false }));
        }
    };

    const handleReject = async (drawing) => {
        const confirmed = await confirm('⚠️ PERMANENTLY DELETE this drawing?\n\nThis will remove the file from database and server.\nThis action CANNOT be undone!', 'Confirm Delete');
        if (!confirmed) return;

        try {
            setDeleting(prev => ({ ...prev, [drawing._id]: true }));
            await drawingAPI.reject(drawing._id, "Deleted by Salesman");
            toast.success('✅ Drawing permanently deleted!');
            fetchDashboard();
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('❌ Failed to delete drawing');
        } finally {
            setDeleting(prev => ({ ...prev, [drawing._id]: false }));
        }
    };

    const handleDownload = async (drawingUrl, fileName) => {
        try {
            // Check if it's a Google Drive link
            if (drawingUrl && (drawingUrl.includes('drive.google.com') || drawingUrl.includes('googleapis.com'))) {
                // For Google Drive links, open directly in new tab
                window.open(drawingUrl, '_blank');
                toast.success('Opening file in new tab...');
                return;
            }

            // For local files, use blob download
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
            const fullUrl = drawingUrl.startsWith('http') ? drawingUrl : `${backendUrl}${drawingUrl}`;

            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('orgToken')}`
                }
            });

            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName || 'drawing';
            document.body.appendChild(link);
            link.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);
            toast.success('File downloaded successfully!');
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Failed to download file. Please try again.');
        }
    };

    const handleSendEmail = async (drawing) => {
        if (!drawing.customer?.email) {
            toast.error('Customer email not found!');
            return;
        }

        const confirmed = await confirm(
            `Send approval request to ${drawing.customer.firstName} ${drawing.customer.lastName}?\n\nEmail: ${drawing.customer.email}\nFile: ${drawing.fileName}\n\nThe client will receive an email with an "Approve" button.`
        );

        if (!confirmed) return;

        try {
            setSendingEmail(prev => ({ ...prev, [drawing._id]: true }));

            // Call the actual API endpoint
            const response = await drawingAPI.sendApprovalEmail(drawing._id);

            setEmailStatus(prev => ({ ...prev, [drawing._id]: 'success' }));
            setTimeout(() => setEmailStatus(prev => ({ ...prev, [drawing._id]: null })), 3000);

            toast.success(`✅ Approval email sent to ${drawing.customer.email}!\n\nThe client can approve the drawing via the link in the email.`);
        } catch (error) {
            console.error('Email send failed:', error);
            setEmailStatus(prev => ({ ...prev, [drawing._id]: 'error' }));

            const errorMessage = error.response?.data?.message || error.message || 'Failed to send email';
            toast.error(`❌ Failed to send email: ${errorMessage}`);
        } finally {
            setSendingEmail(prev => ({ ...prev, [drawing._id]: false }));
        }
    };


    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading your drawings...</p>
                </div>
            </div>
        );
    }

    // Get customer groups with their order status (already provided by backend)
    const customerGroupsWithStatus = dashboardData?.groupedByCustomer || [];

    // Apply filter
    const filteredGroups = customerGroupsWithStatus.filter(group => {
        if (filter === 'pending') return !group.isComplete;
        if (filter === 'done') return group.isComplete;
        return true; // 'all'
    });

    if (!dashboardData || dashboardData.totalDrawings === 0) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-gradient-to-br from-red-600 to-red-700 p-3 rounded-xl shadow-lg">
                            <FileText className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Drawing Dashboard</h1>
                            <p className="text-gray-600 text-sm mt-1">Track and manage all your drawings</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-16 shadow-sm border border-gray-200 text-center">
                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                        <Folder className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Drawings Found</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                        You don't have any assigned customer drawings yet. Drawings will appear here once they're assigned to your customers.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-red-600 to-red-700 p-3 rounded-xl shadow-lg">
                            <FileText className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Drawing Dashboard</h1>
                            <p className="text-gray-600 text-sm mt-1">Track and manage customer drawings</p>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${filter === 'all'
                                ? 'bg-red-700 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            All ({customerGroupsWithStatus.length})
                        </button>
                        <button
                            onClick={() => setFilter('pending')}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${filter === 'pending'
                                ? 'bg-yellow-500 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            Pending ({customerGroupsWithStatus.filter(g => !g.isComplete).length})
                        </button>
                        <button
                            onClick={() => setFilter('done')}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${filter === 'done'
                                ? 'bg-green-600 text-white shadow-md'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            Done ({customerGroupsWithStatus.filter(g => g.isComplete).length})
                        </button>
                    </div>
                </div>
            </div>

            {/* Customer Cards */}
            <div className="space-y-6">
                {filteredGroups.map((group) => (
                    <div key={group.customer._id} className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
                        {/* Customer Header */}
                        <div className={`p-6 border-b ${group.isComplete ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`${group.isComplete ? 'bg-green-600' : 'bg-red-700'} p-3 rounded-xl`}>
                                        <Users className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-xl font-bold text-gray-900 truncate">
                                                {group.customerName || `${group.customer.firstName} ${group.customer.lastName}`}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className={`${group.isComplete ? 'bg-green-600' : 'bg-red-700'} text-white px-3 py-1 rounded-full text-sm font-semibold`}>
                                                {group.drawings.length} file{group.drawings.length !== 1 ? 's' : ''}
                                            </span>
                                            {group.isComplete && (
                                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                                                    <CheckCircle2 className="w-4 h-4" /> Completed
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <div>
                                    {!group.isComplete ? (
                                        <button
                                            onClick={() => handleMarkComplete(group)}
                                            disabled={markingComplete[group.customer._id]}
                                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all font-bold shadow-lg hover:shadow-xl disabled:opacity-50"
                                        >
                                            {markingComplete[group.customer._id] ? (
                                                <>Processing...</>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    Mark as Done
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleUndoComplete(group)}
                                            disabled={markingComplete[group.customer._id]}
                                            className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-all font-bold shadow-lg hover:shadow-xl disabled:opacity-50"
                                        >
                                            {markingComplete[group.customer._id] ? (
                                                <>Processing...</>
                                            ) : (
                                                <>
                                                    <RotateCcw className="w-5 h-5" />
                                                    Undo
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Customer Contact Info */}
                            <div className="flex gap-6 mt-4 text-sm text-gray-700">
                                {group.customer.phone && (
                                    <span className="flex items-center gap-2">
                                        <span className="font-medium">📞</span> {group.customer.phone}
                                    </span>
                                )}
                                {group.customer.email && (
                                    <span className="flex items-center gap-2">
                                        <span className="font-medium">✉️</span> {group.customer.email}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Drawings Grid */}
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.drawings.map((drawing) => (
                                <div
                                    key={drawing._id}
                                    className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-red-300 hover:shadow-md transition-all"
                                >
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="bg-red-700 p-2 rounded-lg">
                                            <FileText className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 truncate">{drawing.fileName || 'Untitled'}</h3>
                                            <p className="text-xs text-gray-500">{formatFileSize(drawing.fileSize)} • {formatDate(drawing.createdAt)}</p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-200">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleDownload(drawing.drawingUrl, drawing.fileName)}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="Download"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleSendEmail(drawing)}
                                                disabled={sendingEmail[drawing._id]}
                                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                title="Email"
                                            >
                                                <Mail className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleReject(drawing)}
                                            disabled={deleting[drawing._id]}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            {deleting[drawing._id] ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
                                            ) : (
                                                <XCircle className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>


        </div>
    );
};

export default SalesmanDrawingDashboard;
