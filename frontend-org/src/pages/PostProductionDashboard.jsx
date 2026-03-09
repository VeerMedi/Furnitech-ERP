import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, CheckCircle, Truck, FileText, Eye, AlertCircle, Calendar, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../services/api';

export default function PostProductionDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalCompleted: 0,
    readyForDispatch: 0,
    inTransit: 0,
    delivered: 0,
  });

  // 🔥 Initialize currentUser FIRST before loading orders
  useEffect(() => {
    try {
      // 1. Try 'auth' first (User Login)
      const authData = localStorage.getItem('auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed.user) {
          console.log('✅ [PostProduction] User loaded from auth:', parsed.user.userRole);
          setCurrentUser(parsed.user);
          return;
        }
      }

      // 2. Try 'orgUser' fallback (Organization Login)
      const orgUser = localStorage.getItem('orgUser');
      if (orgUser) {
        const parsed = JSON.parse(orgUser);
        console.log('✅ [PostProduction] User loaded from orgUser:', parsed.userRole);
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

  // 🔥 Load orders ONLY after currentUser is set
  useEffect(() => {
    if (currentUser) {
      console.log('✅ [PostProduction] CurrentUser available, fetching orders...');
      fetchCompletedOrders();
    }
  }, [currentUser]);

  const fetchCompletedOrders = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getAll();
      const allOrders = response.data.data || response.data || [];

      // Filter orders that are completed in production
      const completedOrders = allOrders.filter(order => {
        console.log('🔍 [Post-Production] Checking Order:', order.orderNumber);
        console.log('   Product Type:', order.productType);
        console.log('   Order Status:', order.orderStatus);
        console.log('   Packaging Status:', order.packagingStatus);

        let isCompleted = false;
        const pType = order.productType || order.customer?.productType;

        if (['Wood', 'WOOD'].includes(pType)) {
          // Check if all 7 wood workflow steps are completed
          isCompleted = order.woodWorkflowStatus?.beamSaw &&
            order.woodWorkflowStatus?.edgeBending &&
            order.woodWorkflowStatus?.profiling &&
            order.woodWorkflowStatus?.grooming &&
            order.woodWorkflowStatus?.boringMachine &&
            order.woodWorkflowStatus?.finish &&
            order.woodWorkflowStatus?.packaging;
        } else if (['Steel', 'STEEL'].includes(pType)) {
          // Check if all 6 steel workflow steps are completed
          isCompleted = order.steelWorkflowStatus?.steelCutting &&
            order.steelWorkflowStatus?.cncCutting &&
            order.steelWorkflowStatus?.bending &&
            order.steelWorkflowStatus?.welding &&
            order.steelWorkflowStatus?.finishing &&
            order.steelWorkflowStatus?.packaging;
        }

        // 🎯 FALLBACK: Only accept if packagingStatus is explicitly COMPLETED
        // We removed deliveryStatus check because default is 'READY_FOR_DISPATCH' which causes false positives
        if (!isCompleted && order.packagingStatus === 'COMPLETED') {
          console.log('   ✅ FALLBACK: Accepted via packagingStatus');
          isCompleted = true;
        }

        console.log('   ✅ Production Completed?', isCompleted);

        if (!isCompleted) {
          console.log('   ❌ REJECTED - Production not complete');
          return false;
        }

        // Role Based Filtering
        if (!currentUser) {
          console.log('   ⚠️ No currentUser available, skipping role filter');
          return true; // Don't filter if user not loaded yet
        }

        const userRole = currentUser.userRole;
        const userId = currentUser._id;

        console.log('   🔍 Checking role filter for:', userRole);

        // Salesman: Only see own orders (Created or Assigned)
        if (userRole === 'Salesman') {
          const custCreator = order.customer?.createdBy;
          const custCreatorId = custCreator?._id || custCreator;
          if (custCreatorId && String(custCreatorId) === String(userId)) return true;

          const quoteCreator = order.quotation?.createdBy;
          const quoteCreatorId = quoteCreator?._id || quoteCreator;
          if (quoteCreatorId && String(quoteCreatorId) === String(userId)) return true;

          const inquiryAssignee = order.quotation?.inquiry?.assignedTo;
          const inquiryAssigneeId = inquiryAssignee?._id || inquiryAssignee;
          if (inquiryAssigneeId && String(inquiryAssigneeId) === String(userId)) return true;

          // Customer Source Inquiry Assignment (PRIMARY)
          const sourceInquiry = order.customer?.fromInquiry;
          const sourceInquiryAssignee = sourceInquiry?.assignedTo;
          const sourceInquiryAssigneeId = sourceInquiryAssignee?._id || sourceInquiryAssignee;
          if (sourceInquiryAssigneeId && String(sourceInquiryAssigneeId) === String(userId)) return true;

          console.log('   ❌ REJECTED - Salesman not assigned to this order');
          return false;
        }

        // 🔧 Factory Workers (Steel/Wood): Only see orders matching their product type
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

        const orderProductType = order.productType || order.customer?.productType;

        // If Steel worker, reject non-Steel orders
        if (steelRoles.includes(userRole)) {
          if (!['Steel', 'STEEL'].includes(orderProductType)) {
            console.log('   ❌ REJECTED - Steel worker cannot see non-Steel order');
            return false;
          }
        }

        // If Wood worker, reject non-Wood orders
        if (woodRoles.includes(userRole)) {
          if (!['Wood', 'WOOD'].includes(orderProductType)) {
            console.log('   ❌ REJECTED - Wood worker cannot see non-Wood order');
            return false;
          }
        }

        console.log('   ✅ ACCEPTED - Added to Post-Production');
        return true;
      });

      setOrders(completedOrders);
      calculateStats(completedOrders);
      setError(null);
    } catch (err) {
      console.error('Error fetching completed orders:', err);
      setError('Failed to load completed orders');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ordersList) => {
    const stats = {
      totalCompleted: ordersList.length,
      readyForDispatch: ordersList.filter(o => o.deliveryStatus === 'READY_FOR_DISPATCH').length,
      inTransit: ordersList.filter(o => o.deliveryStatus === 'IN_TRANSIT').length,
      delivered: ordersList.filter(o => o.deliveryStatus === 'DELIVERED').length,
    };
    setStats(stats);
  };

  const getDeliveryStatusBadge = (status) => {
    const badges = {
      'READY_FOR_DISPATCH': { label: 'Ready for Dispatch', class: 'bg-blue-100 text-blue-800' },
      'IN_TRANSIT': { label: 'In Transit', class: 'bg-yellow-100 text-yellow-800' },
      'OUT_FOR_DELIVERY': { label: 'Out for Delivery', class: 'bg-purple-100 text-purple-800' },
      'DELIVERED': { label: 'Delivered', class: 'bg-green-100 text-green-800' },
      'FAILED_DELIVERY': { label: 'Failed Delivery', class: 'bg-red-100 text-red-800' },
    };
    return badges[status] || { label: status, class: 'bg-gray-100 text-gray-800' };
  };

  const getPaymentStatusBadge = (status) => {
    const badges = {
      'PENDING': { label: 'Pending', class: 'bg-red-100 text-red-800' },
      'PARTIAL': { label: 'Partial', class: 'bg-yellow-100 text-yellow-800' },
      'COMPLETED': { label: 'Paid', class: 'bg-green-100 text-green-800' },
    };
    return badges[status] || { label: status, class: 'bg-gray-100 text-gray-800' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not Set';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-primary"></div>
            <p className="text-gray-600 mt-4">Loading completed orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Post-Production Dashboard</h1>
          <p className="text-gray-600 mt-1">Track completed orders ready for dispatch and delivery</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Completed</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalCompleted}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ready for Dispatch</p>
                <p className="text-3xl font-bold text-blue-600">{stats.readyForDispatch}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">In Transit</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.inTransit}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Delivered</p>
                <p className="text-3xl font-bold text-green-600">{stats.delivered}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Orders List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Completed Orders</h2>
            <p className="text-sm text-gray-500 mt-1">All orders that have completed production workflow</p>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No completed orders found</p>
              <p className="text-sm text-gray-400 mt-1">Orders will appear here after all production steps are completed</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Delivery</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => {
                    const deliveryBadge = getDeliveryStatusBadge(order.deliveryStatus || 'READY_FOR_DISPATCH');
                    const paymentBadge = getPaymentStatusBadge(order.paymentStatus);

                    return (
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-gray-900">{order.orderNumber}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {order.customer?.firstName} {order.customer?.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{order.customer?.phone}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const pType = order.productType || order.customer?.productType || 'N/A';
                            let badgeClass = 'bg-gray-100 text-gray-800';
                            if (['Wood', 'WOOD'].includes(pType)) badgeClass = 'bg-amber-100 text-amber-800';
                            if (['Steel', 'STEEL'].includes(pType)) badgeClass = 'bg-blue-100 text-blue-800';

                            return (
                              <span className={`px-3 py-1 rounded text-sm font-medium ${badgeClass}`}>
                                {pType}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded text-sm font-medium ${deliveryBadge.class}`}>
                            {deliveryBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded text-sm font-medium ${paymentBadge.class}`}>
                            {paymentBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {order.invoice?.invoiceNumber ? (
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-gray-900">{order.invoice.invoiceNumber}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Not Generated</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{formatDate(order.expectedDeliveryDate)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/production/post-production/${order._id}`)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
