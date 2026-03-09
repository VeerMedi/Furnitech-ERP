import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, Plus, Trash2, Save, UserPlus } from 'lucide-react';
import { orderAPI, customerAPI } from '../services/api';
import axios from 'axios';
import { toast } from '../hooks/useToast';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const CreateOrder = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [formData, setFormData] = useState({
    customer: '',
    quotation: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    orderStatus: 'CONFIRMED',
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

  const [newCustomer, setNewCustomer] = useState({
    customerCode: '',
    type: 'INDIVIDUAL',
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    alternatePhone: '',
    address: {
      street: '',
      area: '',
      city: '',
      state: '',
      zipCode: ''
    },
    gstNumber: '',
    panNumber: '',
    source: 'WEBSITE',
    creditLimit: 0,
    creditDays: 0,
    status: 'ACTIVE'
  });

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchQuotations();
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('orgToken');
      const tenantId = localStorage.getItem('tenantId');
      const response = await axios.get(`${API_BASE_URL}/customers`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenantId
        }
      });
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('orgToken');
      const tenantId = localStorage.getItem('tenantId');
      const response = await axios.get(`${API_BASE_URL}/products`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenantId
        }
      });
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchQuotations = async () => {
    try {
      const token = localStorage.getItem('orgToken');
      const tenantId = localStorage.getItem('tenantId');
      const response = await axios.get(`${API_BASE_URL}/quotations`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenantId
        }
      });
      setQuotations(response.data.data || []);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      // Quotations are optional, so continue without them
      setQuotations([]);
    }
  };

  const handleCustomerModalChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setNewCustomer(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value
        }
      }));
    } else {
      setNewCustomer(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!newCustomer.firstName || !newCustomer.lastName || !newCustomer.phone) {
      toast.warning('Please fill in customer details');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('orgToken');
      const tenantId = localStorage.getItem('tenantId');

      // Generate customer code if not provided
      const customerData = {
        ...newCustomer,
        customerCode: newCustomer.customerCode || `CUST${Date.now().toString().slice(-6)}`
      };

      const response = await axios.post(`${API_BASE_URL}/customers`, customerData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenantId
        }
      });

      const createdCustomer = response.data.data;

      // Refresh customer list
      await fetchCustomers();

      // Auto-select the new customer
      setFormData(prev => ({
        ...prev,
        customer: createdCustomer._id
      }));

      // Reset and close modal
      setNewCustomer({
        customerCode: '',
        type: 'INDIVIDUAL',
        companyName: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        alternatePhone: '',
        address: {
          street: '',
          area: '',
          city: '',
          state: '',
          zipCode: ''
        },
        gstNumber: '',
        panNumber: '',
        source: 'WEBSITE',
        creditLimit: 0,
        creditDays: 0,
        status: 'ACTIVE'
      });
      setShowCustomerModal(false);
      toast.success('Customer created! ✅');
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerInquiry = async (customerId) => {
    try {
      const token = localStorage.getItem('orgToken');
      const tenantId = localStorage.getItem('tenantId');
      const response = await axios.get(`${API_BASE_URL}/inquiries`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenantId
        },
        params: {
          customer: customerId
        }
      });

      const inquiries = response.data.data || [];
      if (inquiries.length > 0) {
        // Get the most recent inquiry
        const latestInquiry = inquiries[0];

        // Convert inquiry items to order items
        if (latestInquiry.items && latestInquiry.items.length > 0) {
          const orderItems = latestInquiry.items.map(item => ({
            description: item.description || '',
            specifications: item.meta?.specifications || '',
            quantity: item.quantity || 1,
            unitPrice: item.meta?.unitPrice || 0,
            totalPrice: (item.quantity || 1) * (item.meta?.unitPrice || 0),
            productionStatus: 'PENDING'
          }));

          setFormData(prev => ({
            ...prev,
            items: orderItems,
            priority: latestInquiry.priority ? latestInquiry.priority.toUpperCase() : 'MEDIUM'
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching customer inquiry:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('deliveryAddress.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        deliveryAddress: {
          ...prev.deliveryAddress,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));

      // Auto-fetch inquiry when customer is selected
      if (name === 'customer' && value) {
        fetchCustomerInquiry(value);
      }
    }
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const balance = subtotal - (parseFloat(formData.advanceReceived) || 0);
    return { subtotal, balance };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer) {
      toast.warning('Please select a customer');
      return;
    }

    if (formData.items.length === 0) {
      toast.warning('Please add at least one item');
      return;
    }

    setLoading(true);
    try {
      const { subtotal, balance } = calculateTotals();

      // Prepare order data, remove empty quotation field
      const orderData = {
        ...formData,
        totalAmount: subtotal,
        balanceAmount: balance,
        advanceReceived: parseFloat(formData.advanceReceived) || 0
      };

      // Remove quotation field if empty
      if (!orderData.quotation || orderData.quotation === '') {
        delete orderData.quotation;
      }

      console.log('📤 productType in formData:', formData.productType);
      console.log('📤 productType in orderData:', orderData.productType);
      console.log('📤 Sending order data:', JSON.stringify(orderData, null, 2));

      await orderAPI.create(orderData);
      toast.success('Order created! ✅');
      navigate('/orders');
    } catch (error) {
      console.error('❌ Error creating order:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      toast.error('Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, balance } = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Orders</span>
        </button>

        <div className="bg-white rounded-lg shadow-sm mb-6 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-6 h-6 text-red-700" />
            <h1 className="text-2xl font-bold text-gray-900">Create New Order</h1>
          </div>
          <p className="text-gray-600">Add a new order with customer and product details</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form - 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer & Order Details */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer & Order Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        name="customer"
                        value={formData.customer}
                        onChange={handleInputChange}
                        required
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                      >
                        <option value="">Select Customer</option>
                        {customers.map(customer => (
                          <option key={customer._id} value={customer._id}>
                            {customer.firstName} {customer.lastName} - {customer.phone}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowCustomerModal(true)}
                        className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-md transition-colors flex items-center gap-2"
                        title="Add New Customer"
                      >
                        <UserPlus className="w-4 h-4" />
                        New
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quotation (Optional)
                    </label>
                    <select
                      name="quotation"
                      value={formData.quotation}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    >
                      <option value="">Select Quotation</option>
                      {quotations.map(quot => (
                        <option key={quot._id} value={quot._id}>
                          {quot.quotationNumber} - ₹{quot.totalAmount?.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="orderDate"
                      value={formData.orderDate}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Delivery Date
                    </label>
                    <input
                      type="date"
                      name="expectedDeliveryDate"
                      value={formData.expectedDeliveryDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order Status
                    </label>
                    <select
                      name="orderStatus"
                      value={formData.orderStatus}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    >
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="IN_PRODUCTION">In Production</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="DISPATCHED">Dispatched</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="ON_HOLD">On Hold</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="productType"
                      value={formData.productType}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    >
                      <option value="">Select Product Type</option>
                      <option value="Wood">Wood</option>
                      <option value="Steel">Steel</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Address</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      name="deliveryAddress.street"
                      value={formData.deliveryAddress.street || ''}
                      onChange={handleInputChange}
                      placeholder="Enter street address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Area/Locality
                    </label>
                    <input
                      type="text"
                      name="deliveryAddress.area"
                      value={formData.deliveryAddress.area || ''}
                      onChange={handleInputChange}
                      placeholder="Enter area"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      name="deliveryAddress.city"
                      value={formData.deliveryAddress.city || ''}
                      onChange={handleInputChange}
                      placeholder="Enter city"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      name="deliveryAddress.state"
                      value={formData.deliveryAddress.state || ''}
                      onChange={handleInputChange}
                      placeholder="Enter state"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      name="deliveryAddress.zipCode"
                      value={formData.deliveryAddress.zipCode || ''}
                      onChange={handleInputChange}
                      placeholder="Enter pincode"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      name="deliveryAddress.country"
                      value={formData.deliveryAddress.country}
                      onChange={handleInputChange}
                      placeholder="Enter country"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Order Items - Auto-fetched from Customer Inquiry */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Order Items <span className="text-red-500">*</span>
                  </h2>
                  {formData.items.length > 0 && (
                    <span className="text-sm text-gray-500">
                      Auto-fetched from Products Requested
                    </span>
                  )}
                </div>

                {/* Items List */}
                {formData.items.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700">Added Items ({formData.items.length})</h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specifications</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {formData.items.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{item.specifications || '-'}</td>
                              <td className="px-4 py-3 text-sm text-center text-gray-900">{item.quantity}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">₹{item.unitPrice.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">₹{item.totalPrice.toLocaleString()}</td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Select a customer to auto-fetch their requested products</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Production Notes
                    </label>
                    <textarea
                      name="productionNotes"
                      value={formData.productionNotes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Notes for production team..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Notes
                    </label>
                    <textarea
                      name="customerNotes"
                      value={formData.customerNotes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Customer requirements or special instructions..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Internal Notes
                    </label>
                    <textarea
                      name="internalNotes"
                      value={formData.internalNotes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Internal notes (not visible to customer)..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - 1 column */}
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Items</span>
                    <span className="font-medium text-gray-900">{formData.items.length}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">₹{subtotal.toLocaleString()}</span>
                  </div>

                  <div className="border-t pt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Advance Received
                    </label>
                    <input
                      type="number"
                      name="advanceReceived"
                      value={formData.advanceReceived}
                      onChange={handleInputChange}
                      placeholder="0"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-between text-sm pt-3 border-t">
                    <span className="text-gray-600">Balance Amount</span>
                    <span className="font-semibold text-gray-900">₹{balance.toLocaleString()}</span>
                  </div>

                  <div className="pt-3 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Status
                    </label>
                    <select
                      name="paymentStatus"
                      value={formData.paymentStatus}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="PARTIAL">Partial</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <button
                    type="submit"
                    disabled={loading || formData.items.length === 0}
                    className="w-full bg-red-700 hover:bg-red-800 disabled:bg-red-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-md font-semibold transition-colors"
                  >
                    {loading ? 'Creating Order...' : 'Create Order'}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/orders')}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-md font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* New Customer Modal */}
        {showCustomerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Add New Customer</h2>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomer} className="p-6 space-y-6">
                {/* Customer Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="type"
                      value={newCustomer.type}
                      onChange={handleCustomerModalChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    >
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="BUSINESS">Business</option>
                      <option value="DEALER">Dealer</option>
                      <option value="BUILDER">Builder</option>
                      <option value="ARCHITECT">Architect</option>
                    </select>
                  </div>

                  {(newCustomer.type === 'BUSINESS' || newCustomer.type === 'DEALER' || newCustomer.type === 'BUILDER') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        name="companyName"
                        value={newCustomer.companyName}
                        onChange={handleCustomerModalChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                        placeholder="Enter company name"
                      />
                    </div>
                  )}
                </div>

                {/* Contact Person */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={newCustomer.firstName}
                      onChange={handleCustomerModalChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                      placeholder="Enter first name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={newCustomer.lastName}
                      onChange={handleCustomerModalChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                {/* Contact Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={newCustomer.phone}
                      onChange={handleCustomerModalChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={newCustomer.email}
                      onChange={handleCustomerModalChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                      placeholder="Enter email"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street
                      </label>
                      <input
                        type="text"
                        name="address.street"
                        value={newCustomer.address.street}
                        onChange={handleCustomerModalChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                        placeholder="Enter street address"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Area
                      </label>
                      <input
                        type="text"
                        name="address.area"
                        value={newCustomer.address.area}
                        onChange={handleCustomerModalChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                        placeholder="Enter area"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        name="address.city"
                        value={newCustomer.address.city}
                        onChange={handleCustomerModalChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                        placeholder="Enter city"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        name="address.state"
                        value={newCustomer.address.state}
                        onChange={handleCustomerModalChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                        placeholder="Enter state"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pincode
                      </label>
                      <input
                        type="text"
                        name="address.zipCode"
                        value={newCustomer.address.zipCode}
                        onChange={handleCustomerModalChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                        placeholder="Enter pincode"
                      />
                    </div>
                  </div>
                </div>

                {/* Business Details */}
                {(newCustomer.type === 'BUSINESS' || newCustomer.type === 'DEALER') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GST Number
                      </label>
                      <input
                        type="text"
                        name="gstNumber"
                        value={newCustomer.gstNumber}
                        onChange={handleCustomerModalChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                        placeholder="Enter GST number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PAN Number
                      </label>
                      <input
                        type="text"
                        name="panNumber"
                        value={newCustomer.panNumber}
                        onChange={handleCustomerModalChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                        placeholder="Enter PAN number"
                      />
                    </div>
                  </div>
                )}

                {/* Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="source"
                    value={newCustomer.source}
                    onChange={handleCustomerModalChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                  >
                    <option value="WEBSITE">Website</option>
                    <option value="SOCIAL_MEDIA">Social Media</option>
                    <option value="REFERRAL">Referral</option>
                    <option value="EXHIBITION">Exhibition</option>
                    <option value="ADVERTISEMENT">Advertisement</option>
                    <option value="WALK_IN">Walk In</option>
                    <option value="PHONE_CALL">Phone Call</option>
                    <option value="EMAIL">Email</option>
                    <option value="DEALER">Dealer</option>
                    <option value="ARCHITECT">Architect</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-red-700 hover:bg-red-800 disabled:bg-red-400 text-white rounded-md font-medium transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateOrder;
