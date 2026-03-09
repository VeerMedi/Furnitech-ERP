import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Search, Filter, CheckCircle, Clock, AlertCircle, Truck, XCircle } from 'lucide-react';
import api from '../services/api';

export default function DeliveryOrderList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [stats, setStats] = useState({
    scheduled: 0,
    enRoute: 0,
    delivered: 0,
    delayed: 0,
    cancelled: 0,
  });

  useEffect(() => {
    fetchDeliveryOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, filterStatus]);

  const fetchDeliveryOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/transports/orders');
      const data = response.data.data || generateSampleOrders();
      setOrders(data);
      calculateStats(data);
    } catch (err) {
      console.error('Error fetching orders:', err);
      const sampleOrders = generateSampleOrders();
      setOrders(sampleOrders);
      calculateStats(sampleOrders);
    } finally {
      setLoading(false);
    }
  };

  const generateSampleOrders = () => {
    return [
      {
        _id: 'ORD-001',
        orderNumber: 'ORD-001',
        clientName: 'Raj Kumar',
        productName: 'Wooden Dining Table',
        status: 'Scheduled',
        vehicleNumber: 'MH-02-AB-1234',
        driverName: 'Ravi Singh',
        scheduleDate: '2025-12-06',
        createdAt: '2025-12-05T08:00:00Z',
      },
      {
        _id: 'ORD-002',
        orderNumber: 'ORD-002',
        clientName: 'Priya Sharma',
        productName: 'Office Chair Set',
        status: 'En Route',
        vehicleNumber: 'DL-01-CD-5678',
        driverName: 'Amit Patel',
        scheduleDate: '2025-12-05',
        createdAt: '2025-12-04T10:30:00Z',
      },
      {
        _id: 'ORD-003',
        orderNumber: 'ORD-003',
        clientName: 'Vikram Reddy',
        productName: 'Sofa Set',
        status: 'Delivered',
        vehicleNumber: 'KA-05-EF-9101',
        driverName: 'Suresh Kumar',
        scheduleDate: '2025-12-05',
        createdAt: '2025-12-03T14:00:00Z',
      },
      {
        _id: 'ORD-004',
        orderNumber: 'ORD-004',
        clientName: 'Anjali Desai',
        productName: 'Bed Frame',
        status: 'Delayed',
        vehicleNumber: 'MH-09-GH-1121',
        driverName: 'Mohan Das',
        scheduleDate: '2025-12-04',
        createdAt: '2025-12-02T09:15:00Z',
      },
      {
        _id: 'ORD-005',
        orderNumber: 'ORD-005',
        clientName: 'Sneha Gupta',
        productName: 'Cabinet Set',
        status: 'Cancelled',
        vehicleNumber: 'TS-07-IJ-3141',
        driverName: 'Ramesh Babu',
        scheduleDate: '2025-12-07',
        createdAt: '2025-12-01T11:45:00Z',
      },
      {
        _id: 'ORD-006',
        orderNumber: 'ORD-006',
        clientName: 'Arjun Singh',
        productName: 'Wardrobe Cabinet',
        status: 'Scheduled',
        vehicleNumber: 'MH-02-AB-1234',
        driverName: 'Ravi Singh',
        scheduleDate: '2025-12-08',
        createdAt: '2025-12-05T15:20:00Z',
      },
      {
        _id: 'ORD-007',
        orderNumber: 'ORD-007',
        clientName: 'Deepa Mishra',
        productName: 'Desk Organizer',
        status: 'En Route',
        vehicleNumber: 'DL-01-CD-5678',
        driverName: 'Amit Patel',
        scheduleDate: '2025-12-05',
        createdAt: '2025-12-05T09:00:00Z',
      },
      {
        _id: 'ORD-008',
        orderNumber: 'ORD-008',
        clientName: 'Karan Patel',
        productName: 'Bookshelf',
        status: 'Delivered',
        vehicleNumber: 'KA-05-EF-9101',
        driverName: 'Suresh Kumar',
        scheduleDate: '2025-12-05',
        createdAt: '2025-12-04T12:30:00Z',
      },
    ];
  };

  const calculateStats = (data) => {
    setStats({
      scheduled: data.filter(o => o.status === 'Scheduled').length,
      enRoute: data.filter(o => o.status === 'En Route').length,
      delivered: data.filter(o => o.status === 'Delivered').length,
      delayed: data.filter(o => o.status === 'Delayed').length,
      cancelled: data.filter(o => o.status === 'Cancelled').length,
    });
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(
        order =>
          order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.productName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'All') {
      filtered = filtered.filter(order => order.status === filterStatus);
    }

    setFilteredOrders(filtered);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Delivered': 'bg-green-100 text-green-800',
      'En Route': 'bg-blue-100 text-blue-800',
      'Scheduled': 'bg-yellow-100 text-yellow-800',
      'Delayed': 'bg-red-100 text-red-800',
      'Cancelled': 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'En Route':
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 'Delayed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'Scheduled':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'Cancelled':
        return <XCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/transport')}
            className="text-maroon-600 hover:text-maroon-700"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Delivery Orders</h1>
            <p className="text-gray-600 mt-1">Manage all transport delivery orders</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <p className="text-gray-600 text-sm font-medium">Scheduled</p>
            <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <p className="text-gray-600 text-sm font-medium">En Route</p>
            <p className="text-2xl font-bold text-gray-900">{stats.enRoute}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <p className="text-gray-600 text-sm font-medium">Delivered</p>
            <p className="text-2xl font-bold text-gray-900">{stats.delivered}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <p className="text-gray-600 text-sm font-medium">Delayed</p>
            <p className="text-2xl font-bold text-gray-900">{stats.delayed}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-500">
            <p className="text-gray-600 text-sm font-medium">Cancelled</p>
            <p className="text-2xl font-bold text-gray-900">{stats.cancelled}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search order, client, or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-maroon-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-maroon-500"
              >
                <option>All</option>
                <option>Scheduled</option>
                <option>En Route</option>
                <option>Delivered</option>
                <option>Delayed</option>
                <option>Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-600">Loading delivery orders...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-6 text-center text-gray-600">No delivery orders found</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Order #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Vehicle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Driver</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Schedule Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order._id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => navigate('/transport')}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-maroon-600">{order.orderNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.clientName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{order.productName}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.vehicleNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.driverName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{order.scheduleDate}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="font-medium">{order.status}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
