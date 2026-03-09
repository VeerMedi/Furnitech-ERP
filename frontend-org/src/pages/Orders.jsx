import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  IndianRupee,
  TrendingUp,
  ShoppingCart,
  AlertCircle,
  Calendar,
  Filter,
  Search,
  Eye,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { orderAPI } from '../services/api';
import Button from '../components/Button';
import { useEditPermission } from '../components/ProtectedAction';
import axios from 'axios';
import { toast } from '../hooks/useToast';
import { confirm } from '../hooks/useConfirm';

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Utility function to format date as DD/MM/YYYY
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function Orders() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canEditOrders = useEditPermission('orders');
  const [stats, setStats] = useState(null);
  const [customersWithOrders, setCustomersWithOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    hasOrder: '', // 'yes', 'no', or '' for all
    paymentStatus: '',
    priority: ''
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0, page: 1, limit: 10 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orderFormData, setOrderFormData] = useState({
    customer: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    orderStatus: 'DRAFT',
    paymentStatus: 'PENDING',
    priority: 'MEDIUM',
    productType: '',
    advanceReceived: 0,
    deliveryAddress: {
      street: '',
      area: '',
      city: '',
      state: '',
      zipCode: ''
    },
    items: [],
    productionNotes: '',
    customerNotes: '',
    internalNotes: ''
  });
  const [creatingOrder, setCreatingOrder] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    fetchCustomersWithOrderStatus();
  }, [filters, page]);

  const fetchDashboardData = async () => {
    try {
      console.log('🔍 [Orders] Loading stats from DATABASE (primary source)...');
      const response = await orderAPI.getStats();
      setStats(response.data.data);

      // BACKUP: Cache to localStorage for offline fallback only
      try {
        localStorage.setItem('orderStatsData', JSON.stringify(response.data.data));
        console.log('💾 [Orders] Stats cached to localStorage');
      } catch (storageError) {
        console.warn('Failed to cache stats to localStorage:', storageError);
      }
    } catch (error) {
      console.error('❌ [Orders] Error fetching stats from database:', error);

      // FALLBACK: Try localStorage only if database fails
      try {
        const cachedStats = localStorage.getItem('orderStatsData');
        if (cachedStats) {
          console.log('📦 [Orders] Loading stats from localStorage (fallback)');
          setStats(JSON.parse(cachedStats));
        } else {
          // Default empty stats
          setStats({
            overview: { totalOrdersToday: 0, totalOrdersWeek: 0, totalOrdersMonth: 0, totalOrders: 0 },
            statusBreakdown: { pending: 0, inProduction: 0, completed: 0, delivered: 0, cancelled: 0 },
            paymentBreakdown: { paid: 0, partial: 0, pending: 0 },
            revenue: { totalRevenue: 0, totalPaid: 0, totalPending: 0, avgOrderValue: 0 }
          });
        }
      } catch (storageError) {
        console.error('Failed to load from localStorage:', storageError);
        setStats({
          overview: { totalOrdersToday: 0, totalOrdersWeek: 0, totalOrdersMonth: 0, totalOrders: 0 },
          statusBreakdown: { pending: 0, inProduction: 0, completed: 0, delivered: 0, cancelled: 0 },
          paymentBreakdown: { paid: 0, partial: 0, pending: 0 },
          revenue: { totalRevenue: 0, totalPaid: 0, totalPending: 0, avgOrderValue: 0 }
        });
      }
    }
  };

  const fetchCustomersWithOrderStatus = async () => {
    try {
      setLoading(true);
      console.log('🔍 [Orders] Fetching customers with order status...');

      const token = localStorage.getItem('orgToken');
      const tenantId = localStorage.getItem('tenantId');

      // Fetch all customers
      const customersResponse = await axios.get(`${API_BASE_URL}/customers`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenantId
        }
      });
      const allCustomers = customersResponse.data.data || [];

      // Fetch all orders
      const ordersResponse = await orderAPI.getAll({ limit: 1000 });
      const allOrders = ordersResponse.data.data || [];

      // Create map of customer ID to their order
      const ordersByCustomer = {};
      allOrders.forEach(order => {
        const customerId = order.customer?._id || order.customer;
        if (customerId && !ordersByCustomer[customerId]) {
          ordersByCustomer[customerId] = order;
        }
      });

      // Merge customer data with order status
      const customersWithOrderData = await Promise.all(
        allCustomers.map(async (customer) => {
          const order = ordersByCustomer[customer._id];

          // Fetch inquiry items count for customer (if customer was onboarded from inquiry)
          let inquiryItemsCount = 0;
          try {
            const inquiryResponse = await axios.get(`${API_BASE_URL}/inquiries`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'x-tenant-id': tenantId
              },
              params: {
                showHistory: 'true' // Fetch onboarded inquiries
              }
            });
            const allInquiries = inquiryResponse.data.data || [];

            // Find inquiry linked to this customer
            const linkedInquiry = allInquiries.find(inq =>
              inq.onboardedCustomer?.toString() === customer._id.toString() ||
              inq.onboardedCustomerCode === customer.customerCode
            );

            if (linkedInquiry && linkedInquiry.items) {
              inquiryItemsCount = linkedInquiry.items.length;
            }
          } catch (error) {
            console.warn(`Could not fetch inquiry for customer ${customer._id}`);
          }

          return {
            ...customer,
            order: order || null,
            hasOrder: !!order,
            inquiryItemsCount
          };
        })
      );

      // Apply filters
      let filtered = customersWithOrderData;

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(c =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchLower) ||
          c.phone?.includes(filters.search) ||
          c.email?.toLowerCase().includes(searchLower)
        );
      }

      if (filters.hasOrder === 'yes') {
        filtered = filtered.filter(c => c.hasOrder);
      } else if (filters.hasOrder === 'no') {
        filtered = filtered.filter(c => !c.hasOrder);
      }

      setCustomersWithOrders(filtered);
      setPagination({
        total: filtered.length,
        pages: Math.ceil(filtered.length / 10),
        page: 1,
        limit: 10
      });

      console.log(`✅ [Orders] Loaded ${filtered.length} customers`);
    } catch (error) {
      console.error('❌ [Orders] Error fetching customers:', error);
      setCustomersWithOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      hasOrder: '',
      paymentStatus: '',
      priority: ''
    });
    setPage(1);
  };

  const handleDeleteOrder = async (orderId, orderNumber) => {
    const confirmed = await confirm(
      `Are you sure you want to delete order ${orderNumber}? This action cannot be undone.`,
      'Delete Order'
    );
    if (!confirmed) return;

    console.log('🗑️ Attempting to delete Order ID:', orderId);

    try {
      await orderAPI.delete(orderId);
      toast.success('Order deleted successfully! ✅');
      fetchCustomersWithOrderStatus(); // Changed to refresh specific list
      fetchDashboardData(); // Refresh stats
    } catch (error) {
      console.error('Error deleting order:', error);
      const msg = error.response?.data?.message || error.message || 'Unknown Error';
      const details = JSON.stringify(error.response?.data || {}, null, 2);
      toast.error(`DELETE FAILED:\n${msg}\n\nDetails:\n${details}`);
    }
  };

  const handleOpenCreateModal = async (customer) => {
    try {
      const token = localStorage.getItem('orgToken');
      const tenantId = localStorage.getItem('tenantId');

      // Fetch customer's quotation to pre-fill items with detailed specifications
      let orderItems = [];
      let quotationId = null;
      let priority = 'MEDIUM'; // Default
      let productType = customer.productType || '';

      try {
        const quotationResponse = await axios.get(`${API_BASE_URL}/quotations`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-tenant-id': tenantId
          },
          params: { customer: customer._id }
        });

        const quotations = quotationResponse.data.data || [];
        console.log('🔍 [Debug] Quotations found:', quotations.length);

        if (quotations.length > 0 && quotations[0].items) {
          const latestQuotation = quotations[0];
          quotationId = latestQuotation._id;
          console.log('✅ [Debug] Using quotation:', latestQuotation.quotationNumber);
          console.log('🔍 [Debug] Quotation items:', latestQuotation.items);

          // Get inquiry linked to quotation for priority
          if (latestQuotation.inquiry) {
            try {
              const inquiryResponse = await axios.get(`${API_BASE_URL}/inquiries/${latestQuotation.inquiry}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'x-tenant-id': tenantId
                }
              });
              const inquiry = inquiryResponse.data.data;
              if (inquiry && inquiry.priority) {
                priority = inquiry.priority.toUpperCase(); // Convert 'low' -> 'LOW'
                console.log('✅ [Debug] Got priority from inquiry:', priority);
              }
            } catch (err) {
              console.warn('Could not fetch inquiry for quotation:', err);
            }
          }

          orderItems = latestQuotation.items.map(item => {
            console.log('📦 [Debug] Mapping item:', item);

            // Extract specifications (can be string or object)
            let specifications = '';
            if (typeof item.specifications === 'string') {
              specifications = item.specifications;
            } else if (typeof item.specifications === 'object' && item.specifications !== null) {
              specifications = JSON.stringify(item.specifications);
            }

            // Also check details field
            if (!specifications && item.details) {
              specifications = item.details;
            }

            console.log('📝 [Debug] Description:', item.description);
            console.log('📋 [Debug] Specifications:', specifications);
            console.log('💰 [Debug] Price:', item.unitPrice);

            return {
              description: item.description || '',
              specifications: specifications,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              totalPrice: (item.quantity || 1) * (item.unitPrice || 0),
              productionStatus: 'PENDING'
            };
          });

          console.log('✅ [Debug] Mapped order items from quotation:', orderItems);
        } else {
          console.warn('⚠️ [Debug] No quotation found for customer, trying inquiry as fallback...');

          // Fallback to inquiry if no quotation
          const inquiryResponse = await axios.get(`${API_BASE_URL}/inquiries`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'x-tenant-id': tenantId
            },
            params: {
              customer: customer._id,
              showHistory: 'true' // Include onboarded inquiries
            }
          });

          const inquiries = inquiryResponse.data.data || [];

          // Find inquiry linked to this customer
          const linkedInquiry = inquiries.find(inq =>
            inq.onboardedCustomer?.toString() === customer._id.toString() ||
            inq.onboardedCustomerCode === customer.customerCode ||
            (customer.fromInquiry && inq._id.toString() === customer.fromInquiry.toString())
          );

          if (linkedInquiry) {
            console.log('✅ [Debug] Found linked inquiry:', linkedInquiry);

            // Get priority from inquiry
            if (linkedInquiry.priority) {
              priority = linkedInquiry.priority.toUpperCase();
              console.log('✅ [Debug] Got priority from inquiry:', priority);
            }

            // Map inquiry items
            if (linkedInquiry.items && linkedInquiry.items.length > 0) {
              orderItems = linkedInquiry.items.map(item => ({
                description: item.description || '',
                specifications: item.meta?.details || item.meta?.specifications || '',
                quantity: item.quantity || 1,
                unitPrice: item.meta?.unitPrice || item.meta?.price || 0,
                totalPrice: (item.quantity || 1) * (item.meta?.unitPrice || item.meta?.price || 0),
                productionStatus: 'PENDING'
              }));
              console.log('✅ [Debug] Mapped order items from inquiry (fallback):', orderItems);
            }
          }
        }
      } catch (error) {
        console.warn('Could not fetch quotation/inquiry:', error);
      }

      // Set form data with customer and order items
      setOrderFormData({
        customer: customer._id,
        quotation: quotationId, // Link to quotation if available
        orderDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: '',
        orderStatus: 'DRAFT',
        paymentStatus: 'PENDING',
        priority: priority, // Use priority from inquiry/quotation
        productType: productType,
        advanceReceived: customer.advancePaymentAmount || 0, // Auto-fill from customer's advance payment
        deliveryAddress: customer.address || {
          street: '',
          area: '',
          city: '',
          state: '',
          zipCode: ''
        },
        items: orderItems,
        productionNotes: '',
        customerNotes: '',
        internalNotes: ''
      });

      console.log('✅ [Debug] Order form data set with priority:', priority);
      console.log('💰 [Debug] Advance payment loaded:', customer.advancePaymentAmount || 0);

      setSelectedCustomer(customer);
      setShowCreateModal(true);
    } catch (error) {
      console.error('Error opening create modal:', error);
      toast.error('Failed to load customer data');
    }
  };

  const handleFormChange = (field, value) => {
    if (field.startsWith('deliveryAddress.')) {
      const addressField = field.split('.')[1];
      setOrderFormData(prev => ({
        ...prev,
        deliveryAddress: {
          ...prev.deliveryAddress,
          [addressField]: value
        }
      }));
    } else {
      setOrderFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...orderFormData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculate totalPrice if quantity or unitPrice changes
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].totalPrice =
        (newItems[index].quantity || 0) * (newItems[index].unitPrice || 0);
    }

    setOrderFormData(prev => ({ ...prev, items: newItems }));
  };

  const handleRemoveItem = (index) => {
    setOrderFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleCreateOrder = async () => {
    try {
      setCreatingOrder(true);

      // Calculate total amount
      const totalAmount = orderFormData.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

      const orderData = {
        ...orderFormData,
        totalAmount,
        balanceAmount: totalAmount - (orderFormData.advanceReceived || 0)
      };

      // Remove productType if empty (backend only accepts 'Wood' or 'Steel')
      if (!orderData.productType) {
        delete orderData.productType;
      }

      console.log('📤 [Create Order] Sending data:', JSON.stringify(orderData, null, 2));

      await orderAPI.create(orderData);
      toast.success('Order created successfully! ✅');

      // Close modal and refresh
      setShowCreateModal(false);
      setSelectedCustomer(null);
      fetchCustomersWithOrderStatus();
      fetchDashboardData();
    } catch (error) {
      console.error('❌ [Create Order] Error:', error);
      console.error('📋 [Create Order] Error response:', error.response?.data);
      console.error('📋 [Create Order] Error message:', error.response?.data?.message);
      toast.error(error.response?.data?.message || 'Failed to create order');
    } finally {
      setCreatingOrder(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      'DRAFT': 'bg-gray-50 text-gray-700 border border-gray-300',  // Draft orders
      'CONFIRMED': 'bg-blue-100 text-blue-800',
      'IN_PRODUCTION': 'bg-yellow-100 text-yellow-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'DELIVERED': 'bg-purple-100 text-purple-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'ON_HOLD': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      'PENDING': 'bg-red-100 text-red-800',
      'PARTIAL': 'bg-yellow-100 text-yellow-800',
      'COMPLETED': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'LOW': 'bg-gray-100 text-gray-600',
      'MEDIUM': 'bg-blue-100 text-blue-600',
      'HIGH': 'bg-orange-100 text-orange-600',
      'URGENT': 'bg-red-100 text-red-600'
    };
    return colors[priority] || 'bg-gray-100 text-gray-600';
  };

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600 mt-1">Track and manage all your orders</p>
        </div>
        {canEditOrders && (
          <Button onClick={() => navigate('/orders/create')}>
            + Create New Order
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Today's Orders */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Today's Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats?.overview?.totalOrdersToday || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Week: {stats?.overview?.totalOrdersWeek || 0} | Month: {stats?.overview?.totalOrdersMonth || 0}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pending Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats?.statusBreakdown?.pending || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                In Production: {stats?.statusBreakdown?.inProduction || 0}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Completed Orders */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Completed</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats?.statusBreakdown?.completed || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Delivered: {stats?.statusBreakdown?.delivered || 0}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(stats?.revenue?.totalRevenue || 0)}
              </p>
              <p className="text-sm text-green-600 mt-1">
                Paid: {formatCurrency(stats?.revenue?.totalPaid || 0)}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <IndianRupee className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Cancelled Orders</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {stats?.statusBreakdown?.cancelled || 0}
              </p>
            </div>
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Average Order Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats?.revenue?.avgOrderValue || 0)}
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending Payment</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {formatCurrency(stats?.revenue?.totalPending || 0)}
              </p>
            </div>
            <AlertCircle className="w-6 h-6 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>
          {(filters.search || filters.hasOrder) && (
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Customer name, phone, or email..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              />
            </div>
          </div>

          {/* Order Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order Status</label>
            <select
              value={filters.hasOrder}
              onChange={(e) => handleFilterChange('hasOrder', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            >
              <option value="">All Customers</option>
              <option value="yes">Has Order</option>
              <option value="no">No Order</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Inquiry Items</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-700"></div>
                    </div>
                  </td>
                </tr>
              ) : customersWithOrders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                    No customers found
                  </td>
                </tr>
              ) : (
                customersWithOrders.map((customer) => (
                  <tr key={customer._id} className="hover:bg-gray-50 transition-colors">
                    {/* Customer Name */}
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">
                          {customer.firstName} {customer.lastName}
                        </div>
                        <div className="text-gray-500 text-xs">{customer.email}</div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {customer.phone || '-'}
                    </td>

                    {/* Inquiry Items Count */}
                    <td className="px-4 py-3 text-sm text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {customer.inquiryItemsCount} items
                      </span>
                    </td>

                    {/* Order Status */}
                    <td className="px-4 py-3 text-sm">
                      {customer.hasOrder ? (
                        <div>
                          <div className="font-medium text-gray-900">
                            {customer.order.orderNumber}
                          </div>
                          <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(customer.order.orderStatus)}`}>
                            {customer.order.orderStatus?.replace('_', ' ')}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          No Order
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {customer.hasOrder ? (
                          <>
                            <button
                              onClick={() => navigate(`/orders/${customer.order._id}`)}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              title="View Order"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Order
                            </button>
                            {/* Debug Role Permission */}
                            {(['admin', 'superadmin', 'owner'].includes(String(user?.role).toLowerCase()) || user?.email === 'jasleen@vlite.com') && (
                              <button
                                onClick={() => handleDeleteOrder(customer.order._id, customer.order.orderNumber)}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                title="Delete Order"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Check if customer has advance payment */}
                            {customer.advancePaymentStatus === 'Paid' || customer.advancePaymentStatus === 'Partial' ? (
                              <button
                                onClick={() => handleOpenCreateModal(customer)}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-700 rounded-lg hover:bg-red-800 transition-colors"
                                title="Create Order"
                              >
                                <Package className="w-4 h-4 mr-1" />
                                Create Order
                              </button>
                            ) : (
                              <div className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg border border-orange-200">
                                <Clock className="w-4 h-4 mr-1" />
                                Waiting for Adv. Payment
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing page {page} of {pagination.pages} ({pagination.total} total customers)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Order Creation Modal */}
      {showCreateModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Create New Order</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Customer: {selectedCustomer.firstName} {selectedCustomer.lastName}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedCustomer(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Form Content - Scrollable */}
            <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="space-y-6">
                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Date <span className="text-red-500">*</span></label>
                    <input type="date" value={orderFormData.orderDate} onChange={(e) => handleFormChange('orderDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
                    <input type="date" value={orderFormData.expectedDeliveryDate} onChange={(e) => handleFormChange('expectedDeliveryDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" />
                  </div>
                </div>

                {/* Status & Payment */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                    <select value={orderFormData.paymentStatus} onChange={(e) => handleFormChange('paymentStatus', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500">
                      <option value="PENDING">Pending</option>
                      <option value="PARTIAL">Partial</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select value={orderFormData.priority} onChange={(e) => handleFormChange('priority', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500">
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Advance (₹)</label>
                    <input type="number" value={orderFormData.advanceReceived} onChange={(e) => handleFormChange('advanceReceived', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500" />
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Order Items ({orderFormData.items.length})</h3>
                  {orderFormData.items.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No items. Customer has no inquiry items.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orderFormData.items.map((item, idx) => (
                        <div key={idx} className="p-3 border rounded-lg bg-gray-50">
                          <div className="grid grid-cols-12 gap-2">
                            <div className="col-span-4">
                              <label className="text-xs text-gray-600">Description</label>
                              <input type="text" value={item.description} onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                                className="w-full mt-1 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-red-500" />
                            </div>
                            <div className="col-span-3">
                              <label className="text-xs text-gray-600">Specifications</label>
                              <input type="text" value={item.specifications} onChange={(e) => handleItemChange(idx, 'specifications', e.target.value)}
                                className="w-full mt-1 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-red-500" />
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs text-gray-600">Qty</label>
                              <input type="number" value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                                className="w-full mt-1 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-red-500" />
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs text-gray-600">Price</label>
                              <input type="number" value={item.unitPrice} onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-full mt-1 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-red-500" />
                            </div>
                            <div className="col-span-1 flex items-end">
                              <button onClick={() => handleRemoveItem(idx)} className="w-full py-1 text-red-600 hover:bg-red-50 rounded">
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-gray-600">Total: <span className="font-semibold">₹{item.totalPrice?.toLocaleString() || 0}</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Address */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Delivery Address</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-sm text-gray-700">Street</label>
                      <input type="text" value={orderFormData.deliveryAddress.street} onChange={(e) => handleFormChange('deliveryAddress.street', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">City</label>
                      <input type="text" value={orderFormData.deliveryAddress.city} onChange={(e) => handleFormChange('deliveryAddress.city', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">State</label>
                      <input type="text" value={orderFormData.deliveryAddress.state} onChange={(e) => handleFormChange('deliveryAddress.state', e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <textarea value={orderFormData.customerNotes} onChange={(e) => handleFormChange('customerNotes', e.target.value)} rows="2"
                    className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" />
                </div>

                {/* Summary */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-medium">₹{orderFormData.items.reduce((s, i) => s + (i.totalPrice || 0), 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Advance:</span>
                      <span>₹{orderFormData.advanceReceived?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-blue-200 font-semibold">
                      <span>Balance:</span>
                      <span className="text-red-600">₹{(orderFormData.items.reduce((s, i) => s + (i.totalPrice || 0), 0) - (orderFormData.advanceReceived || 0)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex gap-3 justify-end">
              <button onClick={() => { setShowCreateModal(false); setSelectedCustomer(null); }}
                className="px-4 py-2 border text-gray-700 rounded-lg hover:bg-gray-50" disabled={creatingOrder}>
                Cancel
              </button>
              <button onClick={handleCreateOrder} disabled={creatingOrder || orderFormData.items.length === 0}
                className="px-6 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:bg-gray-300 flex items-center gap-2">
                {creatingOrder ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Creating...</> :
                  <><Package className="w-4 h-4" />Create Order</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
