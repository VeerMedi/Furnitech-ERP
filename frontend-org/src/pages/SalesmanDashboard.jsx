import React, { useState, useEffect } from 'react';
import { Search, User, Phone, Mail, Calendar, Package, MapPin, RefreshCw, UserCheck, CheckCircle, Clock, XCircle, Trash2, MessageSquare, AlertCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { inquiryAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../hooks/useToast';
import { confirm } from '../hooks/useConfirm';
import MeetingLogModal from '../components/MeetingLogModal';

const SalesmanDashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const [assignedInquiries, setAssignedInquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Follow-up modal state
    const [showFollowUpModal, setShowFollowUpModal] = useState(false);
    const [selectedInquiryForFollowUp, setSelectedInquiryForFollowUp] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);

    // Meeting log modal state
    const [showMeetingLogModal, setShowMeetingLogModal] = useState(false);
    const [selectedInquiryForMeetingLog, setSelectedInquiryForMeetingLog] = useState(null);

    // Form state for new follow-up entry
    const [followUpNotes, setFollowUpNotes] = useState('');
    const [followUpDateTime, setFollowUpDateTime] = useState('');
    const [followUpNextStep, setFollowUpNextStep] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);

    // HOS Reminder Modal State
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [reminderDays, setReminderDays] = useState(3);
    const [reminderUnit, setReminderUnit] = useState('days'); // 'days' or 'minutes'
    const [sendingReminders, setSendingReminders] = useState(false);

    // Auto Reminder Settings State
    const [autoRemindersEnabled, setAutoRemindersEnabled] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(false);

    // --- Chat Helper Functions ---

    // Parse existing notes string into message objects
    const parseMessages = (notesString) => {
        if (!notesString) return [];

        try {
            // Try parsing as JSON (New Format)
            const parsed = JSON.parse(notesString);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            // Fallback: Treat as legacy plain text
            return [{
                id: Date.now(),
                notes: notesString,
                scheduledDateTime: null,
                nextStep: null,
                timestamp: new Date().toISOString(),
                sender: 'system'
            }];
        }
        return [];
    };

    const formatDateLabel = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === now.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleOpenFollowUp = (inquiry) => {
        setSelectedInquiryForFollowUp(inquiry);
        const msgs = parseMessages(inquiry.message);
        setChatMessages(msgs);

        // Reset form fields
        setFollowUpNotes('');
        setFollowUpDateTime('');
        setFollowUpNextStep('');

        setShowFollowUpModal(true);
    };

    const handleOpenMeetingLog = (inquiry) => {
        setSelectedInquiryForMeetingLog(inquiry);
        setShowMeetingLogModal(true);
    };

    const handleMeetingLogSuccess = () => {
        // Refresh the inquiry list after successful meeting log creation
        loadAssignedInquiries();
    };

    const handleSendMessage = async () => {
        if (!followUpNotes.trim() || !selectedInquiryForFollowUp) {
            toast.warning('Please enter discussion notes.');
            return;
        }

        setSendingMessage(true);
        try {
            const newMsgObj = {
                id: Date.now(),
                notes: followUpNotes.trim(),
                scheduledDateTime: followUpDateTime || null,
                nextStep: followUpNextStep.trim() || null,
                timestamp: new Date().toISOString(),
                sender: 'salesman'
            };

            const updatedMessages = [...chatMessages, newMsgObj];
            const notesString = JSON.stringify(updatedMessages);

            await api.put(`/inquiries/${selectedInquiryForFollowUp._id}`, {
                message: notesString,
                customerName: selectedInquiryForFollowUp.customerName,
                companyName: selectedInquiryForFollowUp.companyName || '',
                customerId: selectedInquiryForFollowUp.customerId || '',
                contact: selectedInquiryForFollowUp.contact,
                email: selectedInquiryForFollowUp.email,
                address: selectedInquiryForFollowUp.address,
                enquiryDate: selectedInquiryForFollowUp.enquiryDate,
                enquiryTime: selectedInquiryForFollowUp.enquiryTime,
                productName: selectedInquiryForFollowUp.productName,
                productDetails: selectedInquiryForFollowUp.productDetails,
                items: selectedInquiryForFollowUp.items || [],
                status: selectedInquiryForFollowUp.status || 'new',
                priority: selectedInquiryForFollowUp.priority, // Don't override with 'medium'
                leadPlatform: selectedInquiryForFollowUp.leadPlatform || 'Website',
                leadStatus: selectedInquiryForFollowUp.leadStatus || 'CONTACTED',
                probability: selectedInquiryForFollowUp.probability || 20,
            });

            setChatMessages(updatedMessages);

            // Reset form for next entry
            setFollowUpNotes('');
            setFollowUpDateTime('');
            setFollowUpNextStep('');

            setSelectedInquiryForFollowUp(prev => ({
                ...prev,
                message: notesString,
                updatedAt: newMsgObj.timestamp
            }));

            await loadAssignedInquiries();

        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message.');
        } finally {
            setSendingMessage(false);
        }
    };

    const handleDeleteMessage = async (msgId) => {
        const confirmed = await confirm(
            'Are you sure you want to delete this follow-up?',
            'Delete Follow-up'
        );
        if (!confirmed) return;

        try {
            const updatedMessages = chatMessages.filter(msg => msg.id !== msgId);
            const notesString = JSON.stringify(updatedMessages);

            await api.put(`/inquiries/${selectedInquiryForFollowUp._id}`, {
                message: notesString,
                customerName: selectedInquiryForFollowUp.customerName,
                companyName: selectedInquiryForFollowUp.companyName || '',
                customerId: selectedInquiryForFollowUp.customerId || '',
                contact: selectedInquiryForFollowUp.contact,
                email: selectedInquiryForFollowUp.email,
                address: selectedInquiryForFollowUp.address,
                enquiryDate: selectedInquiryForFollowUp.enquiryDate,
                enquiryTime: selectedInquiryForFollowUp.enquiryTime,
                productName: selectedInquiryForFollowUp.productName,
                productDetails: selectedInquiryForFollowUp.productDetails,
                items: selectedInquiryForFollowUp.items || [],
                status: selectedInquiryForFollowUp.status || 'new',
                priority: selectedInquiryForFollowUp.priority, // Preserve original priority
                leadPlatform: selectedInquiryForFollowUp.leadPlatform || 'Website',
                leadStatus: selectedInquiryForFollowUp.leadStatus || 'CONTACTED',
                probability: selectedInquiryForFollowUp.probability || 20,
            });

            setChatMessages(updatedMessages);
            setSelectedInquiryForFollowUp(prev => ({
                ...prev,
                message: notesString,
                updatedAt: new Date().toISOString()
            }));

            await loadAssignedInquiries();

        } catch (error) {
            console.error('Error deleting message:', error);
            toast.error('Failed to delete message.');
        }
    };

    const handleClearAllMessages = async () => {
        const confirmed = await confirm(
            'Are you sure you want to clear ALL follow-ups for this customer? This action cannot be undone.',
            'Clear All Follow-ups'
        );
        if (!confirmed) return;

        try {
            const notesString = JSON.stringify([]);

            await api.put(`/inquiries/${selectedInquiryForFollowUp._id}`, {
                message: notesString,
                customerName: selectedInquiryForFollowUp.customerName,
                companyName: selectedInquiryForFollowUp.companyName || '',
                customerId: selectedInquiryForFollowUp.customerId || '',
                contact: selectedInquiryForFollowUp.contact,
                email: selectedInquiryForFollowUp.email,
                address: selectedInquiryForFollowUp.address,
                enquiryDate: selectedInquiryForFollowUp.enquiryDate,
                enquiryTime: selectedInquiryForFollowUp.enquiryTime,
                productName: selectedInquiryForFollowUp.productName,
                productDetails: selectedInquiryForFollowUp.productDetails,
                items: selectedInquiryForFollowUp.items || [],
                status: selectedInquiryForFollowUp.status || 'new',
                priority: selectedInquiryForFollowUp.priority, // Preserve original priority
                leadPlatform: selectedInquiryForFollowUp.leadPlatform || 'Website',
                leadStatus: selectedInquiryForFollowUp.leadStatus || 'CONTACTED',
                probability: selectedInquiryForFollowUp.probability || 20,
            });

            setChatMessages([]);
            setSelectedInquiryForFollowUp(prev => ({
                ...prev,
                message: '',
                updatedAt: new Date().toISOString()
            }));

            await loadAssignedInquiries();

            toast.success('All follow-ups cleared successfully! ✅');

        } catch (error) {
            console.error('Error clearing messages:', error);
            toast.error('Failed to clear messages.');
        }
    };

    const handleSendReminders = async () => {
        try {
            setSendingReminders(true);
            const response = await inquiryAPI.sendReminders({ daysThreshold: reminderDays, timeUnit: reminderUnit });

            if (response.data?.success) {
                const { emailsSent, salesmenCount } = response.data.data;
                toast.success(`Sent ${emailsSent} reminder emails to ${salesmenCount} salesmen! 📧`);
                setShowReminderModal(false);
            } else {
                toast.warning('No matching pending inquiries found to remind about.');
            }
        } catch (error) {
            console.error('❌ Full error object:', error);
            console.error('❌ Error response:', error.response);
            console.error('❌ Error response data:', error.response?.data);
            console.error('❌ Error message:', error.message);

            const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to send reminders.';
            toast.error(`Error: ${errorMsg}`);
        } finally {
            setSendingReminders(false);
        }
    };

    useEffect(() => {
        loadAssignedInquiries();
        loadReminderSettings(); // Load auto-reminder settings
    }, []);

    // Load reminder settings on mount
    const loadReminderSettings = async () => {
        try {
            setLoadingSettings(true);
            const response = await inquiryAPI.getReminderSettings();
            if (response.data?.success) {
                const settings = response.data.data;
                setAutoRemindersEnabled(settings.enabled);
                setReminderDays(settings.threshold);
                setReminderUnit(settings.timeUnit);
            }
        } catch (error) {
            console.error('Error loading reminder settings:', error);
            // Don't show error toast - just use defaults
        } finally {
            setLoadingSettings(false);
        }
    };

    // Toggle auto-reminders on/off
    const handleToggleAutoReminders = async (enabled) => {
        try {
            const response = await inquiryAPI.saveReminderSettings({
                enabled,
                threshold: reminderDays,
                timeUnit: reminderUnit,
            });

            if (response.data?.success) {
                setAutoRemindersEnabled(enabled);
                toast.success(response.data.message);
            }
        } catch (error) {
            console.error('Error toggling auto-reminders:', error);
            toast.error('Failed to update reminder settings');
        }
    };


    const loadAssignedInquiries = async () => {
        try {
            setLoading(true);

            // Now this API works for both salesmen and admin/HOS/POC
            // Backend will filter based on role
            const response = await api.get('/inquiries/assigned/me');
            const data = Array.isArray(response.data)
                ? response.data
                : (response.data?.data || []);

            setAssignedInquiries(data);
        } catch (error) {
            console.error('Error loading assigned inquiries:', error);
            toast.error('Failed to load assigned customers. Please try again.');
            setAssignedInquiries([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUnassign = async (inquiryId, customerName) => {
        const confirmed = await confirm(
            `Are you sure you want to remove "${customerName}" from your assigned customers?\n\nThis will return the inquiry to unassigned status.`,
            'Remove Customer Assignment'
        );

        if (!confirmed) return;

        try {
            await api.patch(`/inquiries/${inquiryId}/unassign`);

            toast.success(`${customerName} has been removed from your assignments. ✅`);

            setAssignedInquiries(prev => prev.filter(inq => inq._id !== inquiryId));

            await loadAssignedInquiries();
        } catch (error) {
            console.error('Error unassigning customer:', error);
            toast.error(`Failed to remove customer: ${error.response?.data?.message || error.message}`);
        }
    };

    const filteredInquiries = assignedInquiries.filter(inquiry =>
        inquiry.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inquiry.contact?.includes(searchTerm) ||
        inquiry.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inquiry.productName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getLeadStatusBadge = (leadStatus) => {
        const colors = {
            'NEW': 'bg-blue-50 text-blue-700 border-blue-200',
            'CONTACTED': 'bg-purple-50 text-purple-700 border-purple-200',
            'QUALIFIED': 'bg-green-50 text-green-700 border-green-200',
            'UNQUALIFIED': 'bg-gray-50 text-gray-700 border-gray-200',
            'CONVERTED': 'bg-emerald-50 text-emerald-700 border-emerald-200',
            'LOST': 'bg-red-50 text-red-700 border-red-200'
        };
        const labels = {
            'NEW': 'New',
            'CONTACTED': 'Contacted',
            'QUALIFIED': 'Qualified',
            'UNQUALIFIED': 'Unqualified',
            'CONVERTED': 'Converted',
            'LOST': 'Lost'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[leadStatus]}`}>
                {labels[leadStatus]}
            </span>
        );
    };

    const stats = {
        total: assignedInquiries.length,
        contacted: assignedInquiries.filter(i => i.leadStatus === 'CONTACTED').length,
        qualified: assignedInquiries.filter(i => i.leadStatus === 'QUALIFIED').length,
        converted: assignedInquiries.filter(i => i.leadStatus === 'CONVERTED').length,
    };

    const groupMessagesByDate = (messages) => {
        const groups = {};
        messages.forEach(msg => {
            const dateLabel = formatDateLabel(msg.timestamp);
            if (!groups[dateLabel]) groups[dateLabel] = [];
            groups[dateLabel].push(msg);
        });
        return groups;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <div className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-red-700" />
                    <span>Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Meeting Log Modal */}
            <MeetingLogModal
                isOpen={showMeetingLogModal}
                onClose={() => setShowMeetingLogModal(false)}
                inquiry={selectedInquiryForMeetingLog}
                onSuccess={handleMeetingLogSuccess}
            />

            {/* Follow Up Modal */}
            {showFollowUpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden transform transition-all scale-100 relative text-left h-[85vh] flex flex-col">

                        {/* Header */}
                        <div className="bg-red-700 px-6 py-4 flex justify-between items-center shadow-md z-10">
                            <h3 className="text-white font-bold text-lg flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-full">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <span>{selectedInquiryForFollowUp?.customerName}</span>
                                    {selectedInquiryForFollowUp?.updatedAt && (
                                        <span className="text-xs font-normal text-red-100 opacity-80">
                                            Last interaction: {new Date(selectedInquiryForFollowUp.updatedAt).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </h3>
                            <div className="flex items-center gap-2">
                                {chatMessages.length > 0 && (user?.userRole === 'Admin' || user?.userRole === 'Head of Sales (HOD)' || user?.userRole === 'POC') && (
                                    <button
                                        onClick={handleClearAllMessages}
                                        className="text-red-100 hover:text-white hover:bg-red-700 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1.5 text-sm"
                                        title="Clear all follow-ups"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Clear All
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowFollowUpModal(false)}
                                    className="text-red-100 hover:text-white hover:bg-red-700 rounded-full p-2 transition-colors"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Follow-ups List */}
                        <div className="flex-1 overflow-y-auto p-4 bg-[#f5f5f5] space-y-4">
                            {chatMessages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <div className="bg-white/50 p-4 rounded-full mb-2">
                                        <Calendar className="w-8 h-8 opacity-50" />
                                    </div>
                                    <p>No follow-ups yet. Add your first entry below!</p>
                                </div>
                            ) : (
                                Object.entries(groupMessagesByDate(chatMessages)).map(([dateLabel, msgs]) => (
                                    <div key={dateLabel} className="space-y-3">
                                        <div className="flex justify-center sticky top-2 z-0">
                                            <span className="bg-white/90 text-gray-500 text-xs font-medium px-3 py-1 rounded-lg shadow-sm border border-gray-100">
                                                {dateLabel}
                                            </span>
                                        </div>

                                        {msgs.map((msg) => (
                                            <div key={msg.id} className="flex justify-start">
                                                <div className="flex items-start gap-2 max-w-[90%] group">
                                                    <div className="flex-1 rounded-lg p-4 relative shadow-md text-sm border-l-4 bg-white border-red-500">
                                                        {/* Discussion Notes */}
                                                        <div className="mb-3">
                                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                                <Mail className="w-3.5 h-3.5 text-gray-500" />
                                                                <span className="text-xs font-semibold text-gray-600 uppercase">Discussion</span>
                                                            </div>
                                                            <p className="whitespace-pre-wrap leading-relaxed text-gray-900">{msg.notes}</p>
                                                        </div>

                                                        {/* Scheduled Date & Time */}
                                                        {msg.scheduledDateTime && (
                                                            <div className="mb-3 bg-blue-50 rounded-md p-2.5 border border-blue-200">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                                                                    <span className="text-xs font-semibold text-blue-700 uppercase">Scheduled</span>
                                                                </div>
                                                                <p className="text-sm text-blue-900">
                                                                    {new Date(msg.scheduledDateTime).toLocaleString('en-IN', {
                                                                        day: 'numeric',
                                                                        month: 'short',
                                                                        year: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Next Step */}
                                                        {msg.nextStep && (
                                                            <div className="mb-3 bg-green-50 rounded-md p-2.5 border border-green-200">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                                                    <span className="text-xs font-semibold text-green-700 uppercase">Next Step</span>
                                                                </div>
                                                                <p className="text-sm text-green-900">{msg.nextStep}</p>
                                                            </div>
                                                        )}

                                                        <div className="flex justify-end items-center gap-1">
                                                            <span className="text-[10px] text-gray-400">
                                                                {formatTime(msg.timestamp)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-100 rounded-full"
                                                        title="Delete this follow-up"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Follow-up Form - Only show for Salesman */}
                        {(user?.userRole !== 'Admin' && user?.userRole !== 'Head of Sales (HOD)' && user?.userRole !== 'POC') && (
                            <div className="p-5 bg-white border-t-2 border-gray-200">
                                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <span className="text-lg">📝</span> Add Follow-up Entry
                                </h4>
                                <div className="space-y-3">
                                    {/* Discussion Notes */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                            Discussion Notes *
                                        </label>
                                        <textarea
                                            value={followUpNotes}
                                            onChange={(e) => setFollowUpNotes(e.target.value)}
                                            placeholder="What was discussed? (e.g., Client asked for 10% discount...)"
                                            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 placeholder-gray-400 resize-none shadow-sm text-sm"
                                            rows="3"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Schedule Date & Time */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                                Schedule Follow-up (Optional)
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={followUpDateTime}
                                                onChange={(e) => setFollowUpDateTime(e.target.value)}
                                                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 shadow-sm text-sm"
                                            />
                                        </div>

                                        {/* Next Step */}
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                                Next Step (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                value={followUpNextStep}
                                                onChange={(e) => setFollowUpNextStep(e.target.value)}
                                                placeholder="e.g., Send revised quotation"
                                                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 placeholder-gray-400 shadow-sm text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={sendingMessage || !followUpNotes.trim()}
                                            className="px-6 py-2.5 bg-red-700 text-white font-bold rounded-lg shadow hover:bg-red-800 focus:ring-4 focus:ring-red-300 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {sendingMessage ? (
                                                <>
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-5 h-5" />
                                                    Save Follow-up
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <UserCheck className="w-8 h-8 text-red-700" />
                                <h1 className="text-3xl font-bold text-gray-900">My Assigned Customers</h1>
                            </div>
                            <p className="text-gray-600">
                                Welcome, <span className="font-semibold text-red-700">{user?.firstName} {user?.lastName}</span>!
                                Here are the customers assigned to you.
                            </p>
                        </div>
                        {/* HOS Follow-up Reminders Button */}
                        {(user?.userRole === 'Admin' || user?.userRole === 'Head of Sales (HOD)') && (
                            <button
                                onClick={() => setShowReminderModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <Mail className="w-4 h-4 text-red-600" />
                                <span className="text-sm font-medium">Follow-up Reminders</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Total Assigned</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                            </div>
                            <User className="w-8 h-8 text-blue-500 opacity-20" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Contacted</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.contacted}</p>
                            </div>
                            <Phone className="w-8 h-8 text-purple-500 opacity-20" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Qualified</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.qualified}</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Converted</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.converted}</p>
                            </div>
                            <Package className="w-8 h-8 text-emerald-500 opacity-20" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow mb-6 p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by customer, contact, email, product..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {filteredInquiries.length === 0 ? (
                        <div className="p-12 text-center">
                            <UserCheck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {assignedInquiries.length === 0 ? 'No Customers Assigned Yet' : 'No Matching Customers'}
                            </h3>
                            <p className="text-gray-600">
                                {assignedInquiries.length === 0
                                    ? 'You have not been assigned any customers yet. They will appear here once the POC assigns them to you.'
                                    : 'Try adjusting your search to find what you\'re looking for.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                            {filteredInquiries.map((inquiry) => (
                                <div
                                    key={inquiry._id}
                                    className="bg-white border-2 border-gray-200 rounded-lg p-5 hover:border-red-300 hover:shadow-lg transition-all duration-200"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-red-100 p-3 rounded-full">
                                                <User className="w-6 h-6 text-red-700" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg">{inquiry.customerName}</h3>
                                                {inquiry.assignedAt && (
                                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                        <Clock className="w-3 h-3" />
                                                        Assigned: {new Date(inquiry.assignedAt).toLocaleDateString()}
                                                    </div>
                                                )}
                                                {/* Show assigned salesman for Admin/HOS/POC */}
                                                {inquiry.assignedToSalesman?.name && (user?.userRole === 'Admin' || user?.userRole === 'Head of Sales (HOD)' || user?.userRole === 'POC') && (
                                                    <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 mt-1">
                                                        <UserCheck className="w-3 h-3" />
                                                        Salesman: {inquiry.assignedToSalesman.name}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-4 flex flex-wrap gap-2">
                                        {getLeadStatusBadge(inquiry.leadStatus || 'CONTACTED')}
                                        {inquiry.isOnboarded && (
                                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                ✓ Onboarded
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-start gap-2">
                                            <Package className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-900">{inquiry.productName}</p>
                                                {inquiry.productDetails && (
                                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{inquiry.productDetails}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <a href={`tel:${inquiry.contact}`} className="text-sm text-blue-600 hover:underline">
                                                {inquiry.contact}
                                            </a>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <a href={`mailto:${inquiry.email}`} className="text-sm text-blue-600 hover:underline truncate">
                                                {inquiry.email}
                                            </a>
                                        </div>

                                        {inquiry.address && (
                                            <div className="flex items-start gap-2">
                                                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                                <p className="text-sm text-gray-600 line-clamp-2">{inquiry.address}</p>
                                            </div>
                                        )}

                                        {inquiry.enquiryDate && (
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <p className="text-sm text-gray-600">
                                                    Inquiry: {inquiry.enquiryDate}
                                                    {inquiry.enquiryTime && ` at ${inquiry.enquiryTime}`}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {inquiry.leadPlatform && (
                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                                {inquiry.leadPlatform}
                                            </span>
                                        </div>
                                    )}

                                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenFollowUp(inquiry);
                                            }}
                                            className="px-3 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors text-sm font-medium"
                                        >
                                            Follow Up
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenMeetingLog(inquiry);
                                            }}
                                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                            Meeting Logs
                                        </button>
                                    </div>
                                    {(user?.userRole !== 'Admin' && user?.userRole !== 'Head of Sales (HOD)' && user?.userRole !== 'POC') && (
                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    console.log('🔍 Creating quotation from inquiry:', {
                                                        companyName: inquiry.companyName,
                                                        customerName: inquiry.customerName,
                                                        items: inquiry.items
                                                    });
                                                    navigate('/quotations/new', {
                                                        state: {
                                                            inquiryId: inquiry._id,
                                                            customerName: inquiry.customerName,
                                                            customerEmail: inquiry.email,
                                                            customerPhone: inquiry.contact,
                                                            customerAddress: inquiry.address,
                                                            companyName: inquiry.companyName,
                                                            inquiryItems: inquiry.items || [],
                                                            productName: inquiry.productName,
                                                            productDetails: inquiry.productDetails
                                                        }
                                                    });
                                                }}
                                                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                                            >
                                                Create Quote
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUnassign(inquiry._id, inquiry.customerName);
                                                }}
                                                className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                                                title="Remove from my assignments"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Reminder Configuration Modal (HOS/Admin) */}
            {showReminderModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="bg-red-600 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Mail className="w-5 h-5" />
                                Send Follow-up Reminders
                            </h3>
                            <button
                                onClick={() => setShowReminderModal(false)}
                                className="text-white hover:bg-red-700 p-1 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6">
                            <p className="text-gray-600 mb-6 font-medium">
                                Send digest emails to salesmen about their pending inquiries.
                            </p>

                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-orange-900 text-sm">How it works</h4>
                                        <p className="text-xs text-orange-800 mt-1 leading-relaxed">
                                            The system will find all assigned inquiries with status <strong>OPEN, CONTACTED, or FOLLOW_UP</strong> that haven't been updated in over <strong>{reminderDays} {reminderUnit}</strong>.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Auto-Reminders Toggle */}
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-red-600" />
                                            Automatic Reminders
                                        </label>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {autoRemindersEnabled
                                                ? `Active: Sends every ${reminderDays} ${reminderUnit}`
                                                : 'Enable to send reminders automatically'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleToggleAutoReminders(!autoRemindersEnabled)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoRemindersEnabled ? 'bg-red-600' : 'bg-gray-300'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoRemindersEnabled ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            <div className="mb-8">

                                <div className="flex justify-between items-center mb-4">
                                    <label className="block text-sm font-bold text-gray-800">
                                        Inactivity Threshold
                                    </label>
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => { setReminderUnit('days'); setReminderDays(3); }}
                                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${reminderUnit === 'days' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Days
                                        </button>
                                        <button
                                            onClick={() => { setReminderUnit('minutes'); setReminderDays(30); }}
                                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${reminderUnit === 'minutes' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            Minutes
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="flex-1">
                                        <input
                                            type="range"
                                            min="1"
                                            max={reminderUnit === 'days' ? "30" : "60"}
                                            value={reminderDays}
                                            onChange={(e) => setReminderDays(parseInt(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                                        />
                                        <div className="flex justify-between text-xs text-gray-400 mt-2 font-medium">
                                            <span>1 {reminderUnit === 'days' ? 'day' : 'min'}</span>
                                            <span>{reminderUnit === 'days' ? '30 days' : '60 mins'}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center bg-gray-100 rounded-lg w-16 h-12 border border-gray-200">
                                        <span className="text-lg font-bold text-gray-900">{reminderDays}</span>
                                        <span className="text-[10px] text-gray-500 font-semibold uppercase">{reminderUnit}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => setShowReminderModal(false)}
                                    className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSendReminders}
                                    disabled={sendingReminders}
                                    className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                                >
                                    {sendingReminders ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="w-4 h-4" />
                                            Send Reminders Now
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default SalesmanDashboard;
