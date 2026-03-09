import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { drawingAPI } from '../services/api';
import { Users, FileText, UserCheck, AlertCircle, Folder, Download, Mail, CheckCircle, XCircle, Clock } from 'lucide-react';

const AdminDrawingDashboard = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [designers, setDesigners] = useState([]);
    const [allDrawings, setAllDrawings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState('all'); // all, designer, customer

    useEffect(() => {
        // Check if admin/POC
        const authData = localStorage.getItem('auth');
        const orgUser = localStorage.getItem('orgUser');

        let role = '';
        let email = '';

        if (authData) {
            try {
                const parsed = JSON.parse(authData);
                role = parsed.user?.userRole || '';
                email = parsed.user?.email || '';
            } catch (e) { }
        }

        if (!role && orgUser) {
            try {
                const parsed = JSON.parse(orgUser);
                role = parsed.userRole || '';
                email = parsed.email || '';
            } catch (e) { }
        }

        // Hardcode override
        if (email === 'jasleen@vlite.com') {
            role = 'Admin';
        }

        // Admin/POC/Design Dept Head can access (Design Dept Head assigns work)
        if (role !== 'Admin' && role !== 'POC' && role !== 'Design Dept Head') {
            navigate('/dashboard');
            return;
        }

        fetchAllData();
    }, [navigate]);

    const fetchAllData = async () => {
        try {
            setLoading(true);

            // Fetch customers with assignments
            const customersRes = await drawingAPI.getCustomersFromOrders();
            const customersData = customersRes.data.data || [];
            setCustomers(customersData);

            // Fetch design team
            const designTeamRes = await drawingAPI.getDesignTeam();
            const designersData = designTeamRes.data.data || [];
            setDesigners(designersData);

            // Fetch all drawings (salesman dashboard gives all for admin)
            const drawingsRes = await drawingAPI.getSalesmanDashboard();
            const drawingsData = drawingsRes.data.data?.drawings || [];
            setAllDrawings(drawingsData);

        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate stats
    const totalDesigners = designers.length;
    const assignedCustomers = customers.filter(c => c.assignedDesigner).length;
    const unassignedCustomers = customers.filter(c => !c.assignedDesigner).length;
    const totalFiles = allDrawings.length;

    // Approval Stats
    const approvedFiles = allDrawings.filter(d => d.approvalStatus === 'APPROVED').length;
    const rejectedFiles = allDrawings.filter(d => d.approvalStatus === 'REJECTED').length;
    const pendingFiles = totalFiles - approvedFiles - rejectedFiles;

    // Group customers by designer
    const designerWorkload = {};
    designers.forEach(designer => {
        const assignedCust = customers.filter(c => c.assignedDesigner?._id === designer._id);
        const files = allDrawings.filter(d =>
            assignedCust.some(cust => cust._id === d.customer?._id)
        );

        designerWorkload[designer._id] = {
            designer,
            customers: assignedCust,
            files: files,
            filesCount: files.length,
            approvedCount: files.filter(f => f.approvalStatus === 'APPROVED').length,
            rejectedCount: files.filter(f => f.approvalStatus === 'REJECTED').length,
            pendingCount: files.length - files.filter(f => f.approvalStatus === 'APPROVED' || f.approvalStatus === 'REJECTED').length
        };
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <FileText className="w-8 h-8 text-red-700" />
                    Admin Drawing Dashboard
                </h1>
                <p className="text-gray-600 mt-1">Complete overview of design department workload and assignments</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium mb-1">Total Designers</p>
                            <p className="text-3xl font-bold text-gray-900">{totalDesigners}</p>
                        </div>
                        <div className="bg-red-100 p-3 rounded-full">
                            <Users className="w-8 h-8 text-red-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium mb-1">Assigned Customers</p>
                            <p className="text-3xl font-bold text-gray-900">{assignedCustomers}</p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-full">
                            <UserCheck className="w-8 h-8 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium mb-1">Pending Assignments</p>
                            <p className="text-3xl font-bold text-gray-900">{unassignedCustomers}</p>
                        </div>
                        <div className="bg-yellow-100 p-3 rounded-full">
                            <AlertCircle className="w-8 h-8 text-yellow-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium mb-1">Total Files</p>
                            <p className="text-3xl font-bold text-gray-900">{totalFiles}</p>
                        </div>
                        <div className="bg-orange-100 p-3 rounded-full">
                            <Folder className="w-8 h-8 text-orange-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium mb-1">Total Approved</p>
                            <p className="text-3xl font-bold text-green-700">{approvedFiles}</p>
                        </div>
                        <div className="bg-green-100 p-3 rounded-full">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium mb-1">Total Rejected</p>
                            <p className="text-3xl font-bold text-red-700">{rejectedFiles}</p>
                        </div>
                        <div className="bg-red-100 p-3 rounded-full">
                            <XCircle className="w-8 h-8 text-red-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-600 text-sm font-medium mb-1">Pending Review</p>
                            <p className="text-3xl font-bold text-blue-700">{pendingFiles}</p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-full">
                            <Clock className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Designer Workload Breakdown */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Designer Workload</h2>

                {designers.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 shadow-lg border border-red-200 text-center">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No designers in the team yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.values(designerWorkload).map(({ designer, customers, files, filesCount, approvedCount, rejectedCount, pendingCount }) => (
                            <div key={designer._id} className="bg-white rounded-2xl p-6 shadow-lg border border-red-200 hover:shadow-xl transition-shadow">
                                {/* Designer Header */}
                                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                                    <div className="bg-red-100 p-3 rounded-full">
                                        <Users className="w-6 h-6 text-red-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900">
                                            {designer.firstName} {designer.lastName}
                                        </h3>
                                        <p className="text-xs text-gray-500">{designer.email}</p>
                                    </div>
                                </div>

                                {/* Workload Stats */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-blue-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-600 mb-1">Customers</p>
                                        <p className="text-2xl font-bold text-blue-700">{customers.length}</p>
                                    </div>
                                    <div className="bg-orange-50 rounded-lg p-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs text-gray-600 mb-1">Files</p>
                                                <p className="text-2xl font-bold text-orange-700">{filesCount}</p>
                                            </div>
                                            <div className="flex flex-col gap-1 text-[10px] text-right">
                                                <span className="text-green-700 bg-green-100 px-1.5 rounded font-bold">{approvedCount} ✓</span>
                                                <span className="text-red-700 bg-red-100 px-1.5 rounded font-bold">{rejectedCount} ✗</span>
                                                <span className="text-blue-700 bg-blue-100 px-1.5 rounded font-bold">{pendingCount} ⟳</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Assigned Customers List */}
                                {customers.length > 0 ? (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-700 mb-2">Assigned Customers:</p>
                                        <div className="space-y-1">
                                            {customers.slice(0, 3).map(cust => (
                                                <div key={cust._id} className="text-xs bg-gray-50 px-2 py-1 rounded flex items-center justify-between">
                                                    <span className="text-gray-700 truncate">
                                                        {cust.firstName} {cust.lastName}
                                                    </span>
                                                    <span className="text-gray-500 text-[10px]">
                                                        {files.filter(f => f.customer?._id === cust._id).length} files
                                                    </span>
                                                </div>
                                            ))}
                                            {customers.length > 3 && (
                                                <p className="text-xs text-gray-500 pl-2">+{customers.length - 3} more</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic text-center py-2">No customers assigned yet</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* All Customers Assignment Status */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Customer Assignment Status</h2>

                {customers.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 shadow-lg border border-red-200 text-center">
                        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No customers with orders yet</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-red-200">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-red-500">
                                        <th className="text-left py-3 px-4 font-bold text-gray-700">Customer</th>
                                        <th className="text-left py-3 px-4 font-bold text-gray-700">Contact</th>
                                        <th className="text-left py-3 px-4 font-bold text-gray-700">Assigned Designer</th>
                                        <th className="text-center py-3 px-4 font-bold text-gray-700">Files</th>
                                        <th className="text-center py-3 px-4 font-bold text-gray-700">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.map(customer => {
                                        const fileCount = allDrawings.filter(d => d.customer?._id === customer._id).length;
                                        const hasDesigner = customer.assignedDesigner;

                                        return (
                                            <tr key={customer._id} className="border-b border-gray-200 hover:bg-gray-50">
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold text-gray-900">
                                                        {customer.firstName} {customer.lastName}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-600">
                                                    <div>{customer.phone || 'N/A'}</div>
                                                    <div className="text-xs text-gray-500">{customer.email || 'N/A'}</div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {hasDesigner ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="bg-green-100 p-1.5 rounded-full">
                                                                <UserCheck className="w-4 h-4 text-green-600" />
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-semibold text-gray-900">
                                                                    {customer.assignedDesigner.firstName} {customer.assignedDesigner.lastName}
                                                                </div>
                                                                <div className="text-xs text-gray-500">{customer.assignedDesigner.email}</div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-red-600 font-semibold">Unassigned</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className="inline-block bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">
                                                        {fileCount}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {hasDesigner ? (
                                                        <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                                                            Assigned
                                                        </span>
                                                    ) : (
                                                        <span className="inline-block bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold">
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDrawingDashboard;
