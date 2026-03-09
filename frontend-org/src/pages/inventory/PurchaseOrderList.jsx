import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Package, Search, Filter, Eye, Calendar, IndianRupee } from 'lucide-react';

const PurchaseOrderList = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/inventory/purchase-orders');
      setOrders(response.data.data || []);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.indentNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.orderName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.poStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'Approved': return 'bg-green-100 text-green-700 border-green-300';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-300';
      case 'Cancelled': return 'bg-red-100 text-red-700 border-red-300';
      case 'Completed': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const stats = {
    total: orders.length,
    approved: orders.filter(o => o.poStatus === 'Approved').length,
    pending: orders.filter(o => o.poStatus === 'Pending').length,
    totalValue: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">Complete list of all purchase orders</p>
        </div>
        <button
          onClick={() => navigate('/inventory/dashboard')}
          className="px-6 py-3 bg-red-700 text-white rounded-xl hover:bg-red-800 transition-colors font-medium"
        >
          Back to Dashboard
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 border border-red-200 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-red-700" />
            </div>
            <p className="text-gray-600 text-sm">Total POs</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-green-200 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-green-700" />
            </div>
            <p className="text-gray-600 text-sm">Approved</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.approved}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-yellow-200 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-yellow-700" />
            </div>
            <p className="text-gray-600 text-sm">Pending</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-blue-200 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-blue-700" />
            </div>
            <p className="text-gray-600 text-sm">Total Value</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">₹{stats.totalValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-6 mb-6 border border-red-200 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by PO no, customer, order..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none"
            >
              <option value="all">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <button
            onClick={fetchOrders}
            className="px-6 py-3 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-red-200 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-red-700 text-white">
                <th className="px-6 py-4 text-left font-semibold">PO No</th>
                <th className="px-6 py-4 text-left font-semibold">Customer</th>
                <th className="px-6 py-4 text-left font-semibold">Order Name</th>
                <th className="px-6 py-4 text-left font-semibold">PO Date</th>
                <th className="px-6 py-4 text-left font-semibold">Delivery Date</th>
                <th className="px-6 py-4 text-left font-semibold">Items</th>
                <th className="px-6 py-4 text-left font-semibold">Amount</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    No purchase orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-red-50 transition-colors">
                    <td className="px-6 py-4 text-gray-900 font-medium">{order.indentNo}</td>
                    <td className="px-6 py-4 text-gray-700">{order.customer || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-700">{order.orderName || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {order.poDate ? new Date(order.poDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{order.items?.length || 0}</td>
                    <td className="px-6 py-4 text-gray-900 font-semibold">
                      ₹{order.totalAmount?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.poStatus)}`}>
                        {order.poStatus || 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => navigate(`/inventory/purchase/${order._id}`)}
                        className="text-red-700 hover:text-red-900 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderList;
