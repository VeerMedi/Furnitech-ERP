import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, FileText, Clock, X, Save, MessageSquare, Trash2 } from 'lucide-react';
import api from '../services/api';
import { toast } from '../hooks/useToast';
import { confirm } from '../hooks/useConfirm';
import { useAuthStore } from '../stores/authStore';

const MeetingLogModal = ({ isOpen, onClose, inquiry, onSuccess }) => {
    const { user } = useAuthStore();
    const [formData, setFormData] = useState({
        meetingLocation: '',
        discussionDetails: '',
        nextMeetingDate: '',
        nextMeetingNotes: ''
    });
    const [loading, setLoading] = useState(false);
    const [meetingLogs, setMeetingLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    useEffect(() => {
        if (isOpen && inquiry) {
            loadMeetingLogs();
        }
    }, [isOpen, inquiry]);

    const loadMeetingLogs = async () => {
        if (!inquiry) return;
        
        setLoadingLogs(true);
        try {
            const response = await api.get(`/meeting-logs/inquiry/${inquiry._id}`);
            if (response.data.success) {
                setMeetingLogs(response.data.data);
            }
        } catch (error) {
            console.error('Error loading meeting logs:', error);
            toast.error('Failed to load meeting logs');
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.meetingLocation || !formData.discussionDetails || !formData.nextMeetingDate) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/meeting-logs', {
                inquiryId: inquiry._id,
                ...formData
            });

            if (response.data.success) {
                toast.success('Meeting log added successfully');
                setFormData({
                    meetingLocation: '',
                    discussionDetails: '',
                    nextMeetingDate: '',
                    nextMeetingNotes: ''
                });
                loadMeetingLogs();
                if (onSuccess) onSuccess();
            }
        } catch (error) {
            console.error('❌ Error creating meeting log:', error);
            console.error('Error response:', error.response);
            console.error('Error data:', error.response?.data);
            console.error('Error message:', error.response?.data?.message);
            console.error('Error error:', error.response?.data?.error);
            toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to create meeting log');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (logId) => {
        const confirmed = await confirm(
            'Are you sure you want to delete this meeting log?',
            'Delete Meeting Log'
        );
        if (!confirmed) return;

        try {
            const response = await api.delete(`/meeting-logs/${logId}`);
            if (response.data.success) {
                toast.success('Meeting log deleted successfully');
                loadMeetingLogs();
                if (onSuccess) onSuccess();
            }
        } catch (error) {
            console.error('Error deleting meeting log:', error);
            toast.error('Failed to delete meeting log');
        }
    };

    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    // Check if user can add meeting logs (only Salesman, not Admin/HOS/POC)
    const canAddMeetingLog = user?.userRole !== 'Admin' && 
                            user?.userRole !== 'Head of Sales (HOD)' && 
                            user?.userRole !== 'POC';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden transform transition-all relative h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-red-700 px-6 py-4 flex justify-between items-center shadow-md">
                    <h2 className="text-white font-bold text-xl flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full">
                            <MessageSquare className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div>Meeting Logs</div>
                            <div className="text-sm font-normal opacity-90">{inquiry?.customerName}</div>
                        </div>
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-red-800 rounded-full p-2 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Left: Form - Only show for Salesman */}
                    {canAddMeetingLog && (
                    <div className="w-1/2 border-r border-gray-200 p-6 overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Meeting Log</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Meeting Location */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <MapPin className="w-4 h-4 inline mr-1" />
                                    Meeting Location *
                                </label>
                                <input
                                    type="text"
                                    value={formData.meetingLocation}
                                    onChange={(e) => setFormData({ ...formData, meetingLocation: e.target.value })}
                                    placeholder="e.g., Client Office, Virtual Meet, etc."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            {/* Discussion Details */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FileText className="w-4 h-4 inline mr-1" />
                                    Discussion Details *
                                </label>
                                <textarea
                                    value={formData.discussionDetails}
                                    onChange={(e) => setFormData({ ...formData, discussionDetails: e.target.value })}
                                    placeholder="What was discussed in the meeting..."
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            {/* Next Meeting Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Calendar className="w-4 h-4 inline mr-1" />
                                    Next Meeting Date & Time *
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.nextMeetingDate}
                                    onChange={(e) => setFormData({ ...formData, nextMeetingDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            {/* Next Meeting Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Clock className="w-4 h-4 inline mr-1" />
                                    Next Meeting Notes (Optional)
                                </label>
                                <textarea
                                    value={formData.nextMeetingNotes}
                                    onChange={(e) => setFormData({ ...formData, nextMeetingNotes: e.target.value })}
                                    placeholder="Any notes for the next meeting..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-red-700 text-white py-3 rounded-lg hover:bg-red-800 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save className="w-5 h-5" />
                                {loading ? 'Saving...' : 'Save Meeting Log'}
                            </button>
                        </form>
                    </div>
                    )}

                    {/* Right: Meeting Logs History */}
                    <div className={`${canAddMeetingLog ? 'w-1/2' : 'w-full'} p-6 overflow-y-auto bg-gray-50`}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting History</h3>
                        
                        {loadingLogs ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
                            </div>
                        ) : meetingLogs.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No meeting logs yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {meetingLogs.map((log) => {
                                    // Check if user can delete (Admin, HOS, or POC only)
                                    const canDelete = user?.userRole === 'Admin' || 
                                                    user?.userRole === 'Head of Sales (HOD)' || 
                                                    user?.userRole === 'POC';
                                    
                                    return (
                                    <div key={log._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                        {/* Location */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                                <MapPin className="w-4 h-4 text-red-600" />
                                                {log.meetingLocation}
                                            </div>
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDelete(log._id)}
                                                    className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                                                    title="Delete log"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Discussion */}
                                        <div className="mb-3 bg-blue-50 rounded-md p-3 border border-blue-200">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                                <span className="text-xs font-semibold text-blue-700 uppercase">Discussion</span>
                                            </div>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{log.discussionDetails}</p>
                                        </div>

                                        {/* Next Meeting */}
                                        <div className="mb-3 bg-green-50 rounded-md p-3 border border-green-200">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-green-600" />
                                                <span className="text-xs font-semibold text-green-700 uppercase">Next Meeting</span>
                                            </div>
                                            <p className="text-sm text-green-900 font-medium">
                                                {formatDateTime(log.nextMeetingDate)}
                                            </p>
                                            {log.nextMeetingNotes && (
                                                <p className="text-sm text-gray-600 mt-2">{log.nextMeetingNotes}</p>
                                            )}
                                        </div>

                                        {/* Metadata */}
                                        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                                            <span>By: {log.salesmanName}</span>
                                            <span>{formatDateTime(log.createdAt)}</span>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MeetingLogModal;
