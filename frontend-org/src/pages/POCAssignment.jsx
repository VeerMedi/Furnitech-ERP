import React, { useState, useEffect } from 'react';
import { Search, UserCheck, Users, CheckCircle, AlertCircle, RefreshCw, Mail, X } from 'lucide-react';
import api, { inquiryAPI } from '../services/api';
import { toast } from '../hooks/useToast';
import { confirm } from '../hooks/useConfirm';
import { useAuthStore } from '../stores/authStore';

const POCAssignment = () => {
    const [inquiries, setInquiries] = useState([]);
    const [salesmen, setSalesmen] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSalesman, setSelectedSalesman] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [selectedInquiryIds, setSelectedInquiryIds] = useState([]);

    // Reminder Modal State
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [reminderDays, setReminderDays] = useState(3);
    const [sendingReminders, setSendingReminders] = useState(false);

    // Get current user from auth store
    const { user } = useAuthStore();

    const [assignedInquiries, setAssignedInquiries] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load inquiries
            const inquiriesResponse = await inquiryAPI.getAll();
            const inquiriesData = Array.isArray(inquiriesResponse.data)
                ? inquiriesResponse.data
                : (inquiriesResponse.data?.data || []);

            console.log('🔍 POC ASSIGNMENT DEBUG:');
            console.log('📊 Total inquiries fetched:', inquiriesData.length);
            console.log('📋 All inquiries:', inquiriesData);

            // Split into unassigned and assigned
            // Unassigned = ONLY never-assigned inquiries (fresh ones)
            const unassignedList = inquiriesData.filter(inq =>
                !inq.isOnboarded &&
                !inq.assignedTo // Has never been assigned to anyone
            );

            // Assignment History = currently assigned OR previously assigned but removed
            const assignedList = inquiriesData.filter(inq =>
                inq.assignedTo // Has assignedTo value (either currently assigned or was previously assigned)
            );

            console.log('📝 Unassigned inquiries (never assigned):', unassignedList.length, unassignedList);
            console.log('✅ Assignment History (assigned/removed):', assignedList.length, assignedList);

            setInquiries(unassignedList);
            setAssignedInquiries(assignedList);

            // Load salesmen (users with Salesman role)
            const usersResponse = await api.get('/user-access/users');
            const usersData = Array.isArray(usersResponse.data)
                ? usersResponse.data
                : (usersResponse.data?.data || []);

            // Filter only salesmen
            const salesmenData = usersData.filter(user =>
                user.userRole === 'Salesman' || user.workflowRole === 'SALES_EXECUTIVE'
            );

            setSalesmen(salesmenData);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    };



    const handleBulkAssign = async () => {
        if (selectedInquiryIds.length === 0 || !selectedSalesman) {
            toast.warning('Please select inquiries and a salesman');
            return;
        }

        const confirmed = await confirm(
            `Assign ${selectedInquiryIds.length} inquiries to the selected salesman?`,
            'Bulk Assign'
        );

        if (!confirmed) return;

        try {
            setAssigning(true);
            let successCount = 0;
            let failCount = 0;

            // Process one by one or Promise.all. Using Promise.all for speed.
            const results = await Promise.allSettled(
                selectedInquiryIds.map(id =>
                    api.patch(`/inquiries/${id}/assign`, { assignedTo: selectedSalesman })
                )
            );

            results.forEach(result => {
                if (result.status === 'fulfilled') successCount++;
                else failCount++;
            });

            if (successCount > 0) {
                toast.success(`Successfully assigned ${successCount} customers! ✅`);
            }
            if (failCount > 0) {
                toast.error(`Failed to assign ${failCount} customers.`);
            }

            // Clear selection
            setSelectedInquiryIds([]);
            setSelectedSalesman('');

            // Reload data
            await loadData();

        } catch (error) {
            console.error('Error in bulk assignment:', error);
            toast.error('An error occurred during bulk assignment.');
            await loadData();
        } finally {
            setAssigning(false);
        }
    };



    const handleRetrieve = async (inquiryId, customerName) => {
        const confirmed = await confirm(
            `Move "${customerName}" back to unassigned list?\n\nThis will make it available for reassignment.`,
            'Retrieve to Unassigned'
        );

        if (!confirmed) return;

        try {
            await api.patch(`/inquiries/${inquiryId}/retrieve`);
            toast.success(`${customerName} moved to unassigned list successfully! ✅`);

            // Reload data
            await loadData();
        } catch (error) {
            console.error('Error retrieving inquiry:', error);
            toast.error(`Failed to retrieve: ${error.response?.data?.message || error.message}`);
        }
    };

    const filteredInquiries = inquiries.filter(inquiry =>
        inquiry.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inquiry.contact?.includes(searchTerm) ||
        inquiry.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inquiry.productName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getSalesmanName = (id) => {
        if (!id) return 'Unknown';
        // Check if id is an object (populated) or string
        const salesmanId = typeof id === 'object' ? id._id : id;
        const salesman = salesmen.find(s => s._id === salesmanId);
        return salesman ? `${salesman.firstName} ${salesman.lastName}` : 'Unknown Salesman';
        return salesman ? `${salesman.firstName} ${salesman.lastName}` : 'Unknown Salesman';
    };

    const handleSendReminders = async () => {
        try {
            setSendingReminders(true);
            const response = await inquiryAPI.sendReminders(reminderDays);

            if (response.data?.success) {
                const { emailsSent, salesmenCount } = response.data.data;
                toast.success(`Sent ${emailsSent} reminder emails to ${salesmenCount} salesmen! 📧`);
                setShowReminderModal(false);
            } else {
                toast.warning('No matching pending inquiries found to remind about.');
            }
        } catch (error) {
            console.error('Error sending reminders:', error);
            toast.error('Failed to send reminders.');
        } finally {
            setSendingReminders(false);
        }
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
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">POC Assignment Dashboard</h1>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-gray-600">Assign customer inquiries to salesmen</p>

                        {/* Reminder Button - HOS/Admin Only */}
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

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Unassigned Inquiries</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{inquiries.length}</p>
                            </div>
                            <AlertCircle className="w-8 h-8 text-blue-500 opacity-20" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Available Salesmen</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{salesmen.length}</p>
                            </div>
                            <Users className="w-8 h-8 text-green-500 opacity-20" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Assigned History</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{assignedInquiries.length}</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-orange-500 opacity-20" />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Selected</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">
                                    {selectedInquiryIds.length}
                                </p>
                            </div>
                            <UserCheck className="w-8 h-8 text-purple-500 opacity-20" />
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Left Column - Customer Inquiries */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">New Customer Inquiries</h2>

                            {/* Search */}
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

                        {/* Inquiries List */}
                        <div className="max-h-[600px] overflow-y-auto">
                            {filteredInquiries.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No unassigned inquiries found</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {filteredInquiries.map((inquiry, index) => {
                                        const isSelected = selectedInquiryIds.includes(inquiry._id);
                                        return (
                                            <div
                                                key={inquiry._id}
                                                onClick={() => {
                                                    setSelectedInquiryIds(prev =>
                                                        prev.includes(inquiry._id)
                                                            ? prev.filter(id => id !== inquiry._id)
                                                            : [...prev, inquiry._id]
                                                    );
                                                }}
                                                className={`p-4 cursor-pointer transition-colors ${isSelected
                                                    ? 'bg-red-50 border-l-4 border-red-500'
                                                    : 'hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => { }} // Handled by parent onClick
                                                        className="mt-1.5 h-4 w-4 text-red-600 rounded border-gray-300 focus:ring-red-500 pointer-events-none"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-xs font-mono text-gray-400">#{index + 1}</span>
                                                            <h3 className="font-semibold text-gray-900">{inquiry.customerName}</h3>
                                                            {isSelected && (
                                                                <CheckCircle className="w-5 h-5 text-red-600" />
                                                            )}
                                                        </div>



                                                        <div className="space-y-1 text-sm text-gray-600">
                                                            <p className="flex items-center gap-2">
                                                                <span className="font-medium">Product:</span>
                                                                <span>{inquiry.productName}</span>
                                                            </p>
                                                            <p className="flex items-center gap-2">
                                                                <span className="font-medium">Contact:</span>
                                                                <span>{inquiry.contact}</span>
                                                            </p>
                                                            <p className="flex items-center gap-2">
                                                                <span className="font-medium">Email:</span>
                                                                <span>{inquiry.email}</span>
                                                            </p>
                                                            <p className="flex items-center gap-2">
                                                                <span className="font-medium">Date:</span>
                                                                <span>{new Date(inquiry.enquiryDate).toLocaleDateString()}</span>
                                                            </p>
                                                        </div>

                                                        {inquiry.leadPlatform && (
                                                            <div className="mt-2">
                                                                <span className="px-2 py-1 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
                                                                    {inquiry.leadPlatform}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Assignment Panel */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Assign to Salesman</h2>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Selected Customer Info or Bulk Info */}
                            {selectedInquiryIds.length > 1 ? (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <h3 className="font-semibold text-red-900 mb-2">Bulk Assignment</h3>
                                    <div className="space-y-1 text-sm text-red-800">
                                        <p><span className="font-medium">Selected Inquiries:</span> {selectedInquiryIds.length}</p>
                                        <p className="text-xs text-red-600 mt-2">
                                            Select a salesman below to assign all selected inquiries.
                                        </p>
                                    </div>
                                </div>
                            ) : selectedInquiryIds.length === 1 ? (
                                (() => {
                                    const singleInquiry = inquiries.find(i => i._id === selectedInquiryIds[0]);
                                    if (!singleInquiry) return null;
                                    return (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <h3 className="font-semibold text-red-900 mb-2">Selected Customer</h3>
                                            <div className="space-y-1 text-sm text-red-800">
                                                <p><span className="font-medium">Name:</span> {singleInquiry.customerName}</p>
                                                <p><span className="font-medium">Product:</span> {singleInquiry.productName}</p>
                                                <p><span className="font-medium">Contact:</span> {singleInquiry.contact}</p>
                                                <p><span className="font-medium">Email:</span> {singleInquiry.email}</p>
                                            </div>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                                    <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p>Select inquiries from the left to assign</p>
                                </div>
                            )}

                            {/* Salesman Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Salesman <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedSalesman}
                                    onChange={(e) => setSelectedSalesman(e.target.value)}
                                    disabled={selectedInquiryIds.length === 0}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                    <option value="">-- Choose Salesman --</option>
                                    {salesmen.map((salesman) => (
                                        <option key={salesman._id} value={salesman._id}>
                                            {salesman.firstName} {salesman.lastName}
                                            {salesman.email && ` (${salesman.email})`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Selected Salesman Info */}
                            {selectedSalesman && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h3 className="font-semibold text-green-900 mb-2">Selected Salesman</h3>
                                    <div className="space-y-1 text-sm text-green-800">
                                        {(() => {
                                            const salesman = salesmen.find(s => s._id === selectedSalesman);
                                            return salesman ? (
                                                <>
                                                    <p><span className="font-medium">Name:</span> {salesman.firstName} {salesman.lastName}</p>
                                                    <p><span className="font-medium">Email:</span> {salesman.email}</p>
                                                    {salesman.phone && <p><span className="font-medium">Phone:</span> {salesman.phone}</p>}
                                                    {salesman.designation && <p><span className="font-medium">Designation:</span> {salesman.designation}</p>}
                                                </>
                                            ) : null;
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Assignment Button */}
                            <button
                                onClick={handleBulkAssign}
                                disabled={selectedInquiryIds.length === 0 || !selectedSalesman || assigning}
                                className={`w-full px-6 py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                                    ${selectedInquiryIds.length > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400'}`}
                            >
                                {assigning ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        {selectedInquiryIds.length > 1 ? 'Bulk Assigning...' : 'Assigning...'}
                                    </>
                                ) : (
                                    <>
                                        <UserCheck className="w-5 h-5" />
                                        {selectedInquiryIds.length > 1 ? `Assign ${selectedInquiryIds.length} Customers` : 'Assign Customer'}
                                    </>
                                )}
                            </button>

                            {/* Help Text */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex gap-2">
                                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-yellow-800">
                                        <p className="font-medium mb-1">How to assign:</p>
                                        <ol className="list-decimal list-inside space-y-1">
                                            <li>Select a customer inquiry from the left panel</li>
                                            <li>Choose a salesman from the dropdown</li>
                                            <li>Click "POC Assign" button to complete</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Assignment History Section */}
                <div className="bg-white rounded-lg shadow mb-8">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900">Assignment History</h2>
                        <p className="text-sm text-gray-500 mt-1">List of inquiries already assigned to salesmen</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 font-medium">
                                <tr>
                                    <th className="p-4">Customer Name</th>
                                    <th className="p-4">Contact</th>
                                    <th className="p-4">Product</th>
                                    <th className="p-4">Assigned To</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {assignedInquiries.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-gray-500">
                                            No assignment history found
                                        </td>
                                    </tr>
                                ) : (
                                    assignedInquiries.map((inquiry) => (
                                        <tr key={inquiry._id} className="hover:bg-gray-50">
                                            <td className="p-4 font-medium text-gray-900">{inquiry.customerName}</td>
                                            <td className="p-4 text-gray-600">{inquiry.contact}</td>
                                            <td className="p-4 text-gray-600">{inquiry.productName}</td>
                                            <td className="p-4 text-gray-900 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <UserCheck className="w-4 h-4 text-red-500" />
                                                    {getSalesmanName(inquiry.assignedTo)}
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-600">
                                                {new Date(inquiry.updatedAt || inquiry.enquiryDate).toLocaleDateString()}
                                            </td>
                                            <td className="p-4">
                                                {inquiry.assignmentStatus === 'unassigned' ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                                            Removed by Salesman
                                                        </span>
                                                        {inquiry.unassignedAt && (
                                                            <span className="text-xs text-gray-500">
                                                                {new Date(inquiry.unassignedAt).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                        Assigned
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {inquiry.assignmentStatus === 'unassigned' && (
                                                    <button
                                                        onClick={() => handleRetrieve(inquiry._id, inquiry.customerName)}
                                                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                                                    >
                                                        Retrieve
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Summary Section */}
                {selectedInquiryIds.length === 1 && selectedSalesman && (
                    <div className="bg-gradient-to-r from-red-50 to-purple-50 border-2 border-red-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Assignment Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Customer</p>
                                <p className="font-medium text-gray-900">
                                    {inquiries.find(i => i._id === selectedInquiryIds[0])?.customerName}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Assigned To</p>
                                <p className="font-medium text-gray-900">
                                    {(() => {
                                        const salesman = salesmen.find(s => s._id === selectedSalesman);
                                        return salesman ? `${salesman.firstName} ${salesman.lastName}` : '';
                                    })()}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Reminder Configuration Modal */}
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
                            <p className="text-gray-600 mb-6">
                                send reminder emails to all salesmen who have pending inquiries that haven't been updated recently.
                            </p>

                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-orange-900 text-sm">How it works</h4>
                                        <p className="text-xs text-orange-800 mt-1">
                                            The system will find all assigned inquiries with status "OPEN" or "CONTACTED" that were last updated more than <strong>{reminderDays} days</strong> ago.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Days Inactive Threshold
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="1"
                                        max="30"
                                        value={reminderDays}
                                        onChange={(e) => setReminderDays(parseInt(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                                    />
                                    <span className="font-bold text-gray-900 w-12 text-center bg-gray-100 py-1 rounded">
                                        {reminderDays}d
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                                    <span>1 day</span>
                                    <span>30 days</span>
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
                                    className="px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
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

export default POCAssignment;
