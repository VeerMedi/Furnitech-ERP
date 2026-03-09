import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Package, AlertCircle, Wrench, Hammer, Edit2, CheckCircle2, Clock } from 'lucide-react';
import { orderAPI } from '../services/api';

export default function PreProductionDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    try {
      // 1. Try 'auth' first (User Login)
      const authData = localStorage.getItem('auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed.user) {
          console.log('✅ [PreProduction] User loaded from auth:', parsed.user.userRole);
          setCurrentUser(parsed.user);
          return;
        }
      }

      // 2. Try 'orgUser' fallback (Organization Login)
      const orgUser = localStorage.getItem('orgUser');
      if (orgUser) {
        const parsed = JSON.parse(orgUser);
        console.log('✅ [PreProduction] User loaded from orgUser:', parsed.userRole);
        setCurrentUser({
          _id: parsed._id,
          userRole: parsed.userRole || 'Admin',
          firstName: parsed.firstName || 'Admin'
        });
      }
    } catch (e) {
      console.error('Error parsing auth data:', e);
    }
  }, []);

  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'ready', 'pending'
  const [stats, setStats] = useState({
    totalOrders: 0,
    readyOrders: 0,
    pendingOrders: 0,
    highPriority: 0
  });
  const [loading, setLoading] = useState(true);

  // Robust Manager Check
  const isManager = ['Production Manager', 'Production', 'Admin', 'Super Admin', 'Administrator', 'Organization Admin'].includes(currentUser?.userRole);

  // 🔥 Load orders ONLY after currentUser is set
  useEffect(() => {
    if (currentUser) {
      console.log('✅ [PreProduction] CurrentUser available, loading orders...');
      window.scrollTo(0, 0);
      loadOrders();
    }
  }, [currentUser]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      console.log('🔍 [PreProduction] Loading orders from database...');

      const response = await orderAPI.getAll({ _t: Date.now() });
      const data = response.data.data || response.data;

      console.log('✅ [PreProduction] Orders loaded:', data?.length || 0);

      if (data && data.length > 0) {
        setOrders(data);
        calculateStats(data);
      } else {
        setOrders([]);
        setStats({
          totalOrders: 0,
          readyOrders: 0,
          pendingOrders: 0,
          highPriority: 0
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading orders:', error);
      if (error.response?.status === 401) {
        navigate('/login');
        return;
      }
      setOrders([]);
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    setStats({
      totalOrders: data.length,
      readyOrders: data.filter(o => o.productionReady).length,
      pendingOrders: data.filter(o => !o.productionReady).length,
      highPriority: data.filter(o => o.priority === 'HIGH' || o.priority === 'URGENT').length
    });
  };

  const getFilteredOrders = () => {
    // 🔥 Don't filter until currentUser is loaded
    if (!currentUser) {
      console.log('⚠️ [PreProduction] CurrentUser not loaded yet, returning empty orders');
      return [];
    }

    let filtered = orders;

    // Filter for Workers and Salesmen (Non-Managers)
    if (!isManager && currentUser?._id) {
      // Salesman: View only their own customers' orders (Created or Assigned)
      if (currentUser.userRole === 'Salesman') {
        console.log('🔍 [SALESMAN FILTER] Current User ID:', currentUser._id);
        console.log('🔍 [SALESMAN FILTER] Total Orders Before Filter:', filtered.length);

        filtered = filtered.filter(o => {
          const userId = currentUser._id;

          // Debug: Log order structure
          console.log('📦 Order:', o.orderNumber, {
            customer: o.customer?.firstName,
            customerCreatedBy: o.customer?.createdBy,
            customerFromInquiry: o.customer?.fromInquiry,
            quotation: o.quotation?.quotationNumber,
            quotationCreatedBy: o.quotation?.createdBy,
            inquiry: o.quotation?.inquiry,
            inquiryAssignedTo: o.quotation?.inquiry?.assignedTo
          });

          // 1. Customer Creator
          const custCreator = o.customer?.createdBy;
          const custCreatorId = custCreator?._id || custCreator;
          if (custCreatorId && String(custCreatorId) === String(userId)) {
            console.log('✅ Match: Customer Creator');
            return true;
          }

          // 2. Quotation Creator
          const quoteCreator = o.quotation?.createdBy;
          const quoteCreatorId = quoteCreator?._id || quoteCreator;
          if (quoteCreatorId && String(quoteCreatorId) === String(userId)) {
            console.log('✅ Match: Quotation Creator');
            return true;
          }

          // 3. Inquiry Assignment (from quotation)
          const inquiryAssignee = o.quotation?.inquiry?.assignedTo;
          const inquiryAssigneeId = inquiryAssignee?._id || inquiryAssignee;
          if (inquiryAssigneeId && String(inquiryAssigneeId) === String(userId)) {
            console.log('✅ Match: Inquiry Assignee (Quotation)');
            return true;
          }

          // 4. Inquiry Creator
          const inquiryCreator = o.quotation?.inquiry?.createdBy;
          const inquiryCreatorId = inquiryCreator?._id || inquiryCreator;
          if (inquiryCreatorId && String(inquiryCreatorId) === String(userId)) {
            console.log('✅ Match: Inquiry Creator');
            return true;
          }

          // 5. Customer Source Inquiry Assignment (PRIMARY CHECK)
          const sourceInquiry = o.customer?.fromInquiry;
          const sourceInquiryAssignee = sourceInquiry?.assignedTo;
          const sourceInquiryAssigneeId = sourceInquiryAssignee?._id || sourceInquiryAssignee;
          if (sourceInquiryAssigneeId && String(sourceInquiryAssigneeId) === String(userId)) {
            console.log('✅ Match: Customer Source Inquiry Assignee');
            return true;
          }

          console.log('❌ No Match for order:', o.orderNumber);
          return false;
        });

        console.log('🔍 [SALESMAN FILTER] Orders After Filter:', filtered.length);
        // Salesmen continue to Tab filtering below
      } else {
        // Factory Workers: View only assigned production steps
        filtered = filtered.filter(o => {
          // 🔧 Product Type Filter: Steel workers only see Steel, Wood workers only see Wood
          const userRole = currentUser.userRole;
          const orderProductType = o.productType || o.customer?.productType;

          // Steel Worker Roles - Only see Steel orders
          const steelRoles = [
            'Steel (Steel Cutting)',
            'Steel (CNC Cutting)',
            'Steel (Bending)',
            'Steel (Welding)',
            'Steel (Finishing)',
            'Steel (Packing)'
          ];

          // Wood Worker Roles - Only see Wood orders
          const woodRoles = [
            'Wood (Beam Saw)',
            'Wood (Edge Bending)',
            'Wood (Profiling)',
            'Wood (Grooming)',
            'Wood (Boring Machine)',
            'Wood (Finishing)',
            'Wood (Packaging)'
          ];

          // If Steel worker, reject non-Steel orders
          if (steelRoles.includes(userRole)) {
            if (!['Steel', 'STEEL'].includes(orderProductType)) {
              return false;
            }
          }

          // If Wood worker, reject non-Wood orders
          if (woodRoles.includes(userRole)) {
            if (!['Wood', 'WOOD'].includes(orderProductType)) {
              return false;
            }
          }

          // Then check if assigned to this order's workflow
          const steelAssign = Object.values(o.steelWorkflowAssignments || {});
          const woodAssign = Object.values(o.woodWorkflowAssignments || {});
          return steelAssign.includes(currentUser._id) || woodAssign.includes(currentUser._id);
        });
        // Workers see all assigned orders regardless of status (Tabs ignored)
        return filtered;
      }
    }

    switch (activeTab) {
      case 'ready':
        return filtered.filter(o => o.productionReady);
      case 'pending':
        return filtered.filter(o => !o.productionReady);
      default:
        return filtered;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'CONFIRMED': 'bg-blue-100 text-blue-800',
      'PROCESSING': 'bg-yellow-100 text-yellow-800',
      'READY': 'bg-green-100 text-green-800',
      'DELIVERED': 'bg-gray-100 text-gray-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'URGENT': 'bg-red-100 text-red-800',
      'HIGH': 'bg-orange-100 text-orange-800',
      'MEDIUM': 'bg-blue-100 text-blue-800',
      'LOW': 'bg-gray-100 text-gray-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getProductTypeColor = (type) => {
    return type === 'Wood' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading production orders...</p>
        </div>
      </div>
    );
  }

  const filteredOrders = getFilteredOrders();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pre-Production Dashboard</h1>
          <p className="text-gray-600 mt-1">View and manage orders before production</p>
        </div>

        {/* Stats Cards - Only for Managers */}
        {isManager && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalOrders}</p>
                </div>
                <Package className="w-8 h-8 text-blue-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Ready for Production</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.readyOrders}</p>
                  <p className="text-xs text-green-600 mt-1">Drawings Approved</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Drawings Pending</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingOrders}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-600 text-sm font-medium">High Priority</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.highPriority}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500 opacity-20" />
              </div>
            </div>
          </div>
        )}

        {/* Tabs and Table */}
        <div className="bg-white rounded-lg shadow">
          {/* Tabs - Manager Only */}
          {isManager ? (
            <div className="flex border-b border-gray-200 px-6 pt-4 gap-6">
              <button
                onClick={() => setActiveTab('all')}
                className={`pb-4 px-2 text-sm font-medium transition-colors relative ${activeTab === 'all'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                All Orders ({stats.totalOrders})
              </button>
              <button
                onClick={() => setActiveTab('ready')}
                className={`pb-4 px-2 text-sm font-medium transition-colors relative ${activeTab === 'ready'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Ready for Production ({stats.readyOrders})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`pb-4 px-2 text-sm font-medium transition-colors relative ${activeTab === 'pending'
                  ? 'text-yellow-600 border-b-2 border-yellow-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Drawings Pending ({stats.pendingOrders})
                </div>
              </button>
            </div>
          ) : (
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {currentUser?.userRole === 'Salesman' ? 'My Sales Orders' : 'My Production Tasks'}
              </h2>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drawing Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="bg-gray-100 p-4 rounded-full mb-3">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No Custom Orders Found</h3>
                        <p className="text-gray-500 mt-1">Try switching tabs or creating a new order.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr
                      key={order._id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/production/pre-production/${order._id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{order.orderNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">
                          {order.customer?.firstName} {order.customer?.lastName}
                        </div>
                        {order.productType && (
                          <div className={`text-xs mt-1 inline-block px-2 py-0.5 rounded ${getProductTypeColor(order.productType)}`}>
                            {order.productType}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.orderStatus)}`}>
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.productionReady ? (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full w-fit">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(order.orderDate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(order.expectedDeliveryDate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          {isManager && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/production/pre-production/${order._id}/edit`);
                              }}
                              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                              title="Edit Order"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/production/pre-production/${order._id}`);
                            }}
                            className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div >
  );
}
