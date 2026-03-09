import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Plus, Trash2, Save } from 'lucide-react';
import { orderAPI } from '../services/api';
import axios from 'axios';
import { toast } from '../hooks/useToast';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const EditOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [customers, setCustomers] = useState([]);

  const [formData, setFormData] = useState({
    customer: '',
    customerName: '',
    customerPhone: '',
    companyName: '',
    orderDate: '',
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

  const [currentItem, setCurrentItem] = useState({
    description: '',
    specifications: '',
    quantity: 1,
    unitPrice: 0,
    productionStatus: 'PENDING'
  });

  useEffect(() => {
    fetchCustomers();
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setLoadingOrder(true);
      const response = await orderAPI.getOne(id);
      const order = response.data.data;

      // Fetch full customer data to get company name, product type, and advance payment
      const token = localStorage.getItem('orgToken');
      const tenantId = localStorage.getItem('tenantId');
      let customerData = order.customer;

      if (order.customer?._id) {
        try {
          const customerResponse = await axios.get(`${API_BASE_URL}/customers/${order.customer._id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'x-tenant-id': tenantId
            }
          });
          customerData = customerResponse.data.data;
          console.log('✅ [EditOrder] Customer data:', customerData);
        } catch (error) {
          console.warn('Could not fetch full customer data:', error);
        }
      }

      setFormData({
        customer: order.customer?._id || order.customer,
        customerName: customerData?.firstName && customerData?.lastName
          ? `${customerData.firstName} ${customerData.lastName}`
          : '',
        customerPhone: customerData?.phone || '',
        companyName: customerData?.companyName || '',
        orderDate: order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : '',
        expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toISOString().split('T')[0] : '',
        orderStatus: order.orderStatus || 'CONFIRMED',
        paymentStatus: order.paymentStatus || 'PENDING',
        priority: order.priority || 'MEDIUM',
        productType: customerData?.productType || order.productType || '',
        advanceReceived: customerData?.advancePaymentAmount || order.advanceReceived || 0,
        deliveryAddress: order.deliveryAddress || {
          street: '',
          area: '',
          city: '',
          state: '',
          zipCode: ''
        },
        items: (order.items || []).map(item => ({
          ...item,
          amount: item.amount || (item.quantity || 0) * (item.unitPrice || 0)
        })),
        productionNotes: order.productionNotes || '',
        customerNotes: order.customerNotes || '',
        internalNotes: order.internalNotes || ''
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load');
      navigate('/orders');
    } finally {
      setLoadingOrder(false);
    }
  };

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
    }
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'unitPrice' ? parseFloat(value) || 0 : value
    }));
  };

  const addItem = () => {
    if (!currentItem.description || !currentItem.quantity || !currentItem.unitPrice) {
      toast.warning('Please fill in all item fields');
      return;
    }

    const item = {
      ...currentItem,
      amount: currentItem.quantity * currentItem.unitPrice
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));

    setCurrentItem({
      description: '',
      specifications: '',
      quantity: 1,
      unitPrice: 0,
      productionStatus: 'PENDING'
    });
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value
      };

      if (field === 'quantity' || field === 'unitPrice') {
        newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
      }

      return {
        ...prev,
        items: newItems
      };
    });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const gst = subtotal * 0.18;
    const total = subtotal + gst;
    return { subtotal, gst, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customerName || !formData.customerPhone) {
      toast.warning('Please enter customer details');
      return;
    }

    if (!formData.productType) {
      toast.warning('Please select product type');
      return;
    }

    if (formData.items.length === 0) {
      toast.warning('Please add at least one item');
      return;
    }

    setLoading(true);
    try {
      const { subtotal, gst, total } = calculateTotals();

      const orderData = {
        ...formData,
        subtotalAmount: subtotal,
        gstAmount: gst,
        totalAmount: total
      };

      console.log('📤 [EditOrder] productType in formData:', formData.productType);
      console.log('📤 [EditOrder] productType in orderData:', orderData.productType);
      console.log('📤 [EditOrder] Sending update data:', JSON.stringify(orderData, null, 2));

      await orderAPI.update(id, orderData);
      toast.success('Updated! ✅');
      navigate(`/orders/${id}`);
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loadingOrder) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
      </div>
    );
  }

  const { subtotal, gst, total } = calculateTotals();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/orders/${id}`)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Order</h1>
              <p className="text-gray-600 mt-1">Update order details and items</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer & Quotation */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Order Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      readOnly
                      placeholder="Customer name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed outline-none"
                      title="Customer name can only be edited from Customer Dashboard"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="customerPhone"
                      value={formData.customerPhone}
                      readOnly
                      placeholder="Customer phone"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed outline-none"
                      title="Customer phone can only be edited from Customer Dashboard"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      readOnly
                      placeholder="Company name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed outline-none"
                      title="Company name is fetched from Customer data"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Type <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.productType}
                      readOnly
                      placeholder="Product type"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600 cursor-not-allowed outline-none"
                      title="Product type is fetched from Customer data"
                    />
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Delivery <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="expectedDeliveryDate"
                      value={formData.expectedDeliveryDate}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Advance Received (₹)
                    </label>
                    <input
                      type="number"
                      name="advanceReceived"
                      value={formData.advanceReceived}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Delivery Address</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                    <input
                      type="text"
                      name="deliveryAddress.street"
                      value={formData.deliveryAddress.street}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                    <input
                      type="text"
                      name="deliveryAddress.area"
                      value={formData.deliveryAddress.area}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      name="deliveryAddress.city"
                      value={formData.deliveryAddress.city}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      name="deliveryAddress.state"
                      value={formData.deliveryAddress.state}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                    <input
                      type="text"
                      name="deliveryAddress.zipCode"
                      value={formData.deliveryAddress.zipCode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Order Items</h2>

                {/* Add Item Form */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Add New Item</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                      <input
                        type="text"
                        name="description"
                        value={currentItem.description}
                        onChange={handleItemChange}
                        placeholder="Item Description"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        name="specifications"
                        value={currentItem.specifications}
                        onChange={handleItemChange}
                        placeholder="Specifications"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        name="quantity"
                        value={currentItem.quantity}
                        onChange={handleItemChange}
                        placeholder="Qty"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        name="unitPrice"
                        value={currentItem.unitPrice}
                        onChange={handleItemChange}
                        placeholder="Unit Price"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={addItem}
                        className="w-full px-3 py-2 bg-red-700 hover:bg-red-800 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                {formData.items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No items added yet
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specifications</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {formData.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateItem(index, 'description', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={item.specifications}
                                onChange={(e) => updateItem(index, 'specifications', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                min="1"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                min="0"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold">
                              {formatCurrency(item.amount || 0)}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => removeItem(index)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Notes</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Production Notes</label>
                    <textarea
                      name="productionNotes"
                      value={formData.productionNotes}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                      placeholder="Internal production notes..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Notes</label>
                    <textarea
                      name="customerNotes"
                      value={formData.customerNotes}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                      placeholder="Customer requirements and preferences..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                    <textarea
                      name="internalNotes"
                      value={formData.internalNotes}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                      placeholder="Internal comments..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

                <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Items</span>
                    <span className="font-medium">{formData.items.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">GST (18%)</span>
                    <span className="font-medium">{formatCurrency(gst)}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total Amount</span>
                    <span className="text-2xl font-bold text-red-700">{formatCurrency(total)}</span>
                  </div>
                </div>

                <div className="mb-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Advance Received</span>
                    <span className="font-medium text-blue-700">{formatCurrency(formData.advanceReceived)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Balance Due</span>
                    <span className="font-bold text-orange-600">{formatCurrency(total - formData.advanceReceived)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-red-700 hover:bg-red-800 disabled:bg-red-400 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Updating...' : 'Update Order'}
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/orders/${id}`)}
                  className="w-full mt-3 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOrder;
