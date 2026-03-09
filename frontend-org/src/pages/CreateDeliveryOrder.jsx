import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../services/api';
import { toast } from '../hooks/useToast';
import { ArrowLeft, Package, User, Truck, UserCircle } from 'lucide-react';
import { transportAPI } from '../services/api';

export default function CreateDeliveryOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  // Get pre-filled data from location state (from Post-Production)
  const orderData = location.state?.orderData || {};

  const [form, setForm] = useState({
    // Order Reference
    orderNumber: orderData.orderNumber || '',
    orderId: orderData.orderId || '',

    // Product Details
    productId: orderData.productId || '',
    productName: orderData.productName || '',

    // Client Information
    clientName: orderData.clientName || '',
    clientAddress: orderData.clientAddress || '',
    clientContact: orderData.clientContact || '',

    // Vehicle Information
    vehicleType: '',
    vehicleNumber: '',

    // Driver Information
    driverId: '',
    driverName: '',
    driverContact: '',

    // Delivery Details
    deliveryDate: orderData.deliveryDate || '',
    distance: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      // Validate required fields
      if (!form.productId || !form.productName || !form.clientName ||
        !form.vehicleType || !form.vehicleNumber || !form.driverName) {
        setError('Please fill in all required fields');
        setCreating(false);
        return;
      }

      // Create new transport record
      const newTransport = {
        orderNumber: form.orderNumber || form.productId,
        productId: form.productId,
        productName: form.productName,
        clientName: form.clientName,
        clientAddress: form.clientAddress,
        clientContact: form.clientContact,
        vehicleType: form.vehicleType,
        vehicleNumber: form.vehicleNumber,
        driverId: form.driverId,
        driverName: form.driverName,
        driverContact: form.driverContact,
        status: 'Scheduled',
        deliveryDate: form.deliveryDate || new Date().toISOString().split('T')[0],
        distance: parseFloat(form.distance) || 0,
      };

      const response = await transportAPI.create(newTransport);
      const createdTransport = response.data.data || response.data;

      // If this transport is created from Post-Production order, update the order with transportId
      if (form.orderId && createdTransport._id) {
        try {
          const { orderAPI } = await import('../services/api');
          await orderAPI.update(form.orderId, {
            transportId: createdTransport._id,
            deliveryStatus: 'IN_TRANSIT'
          });
          console.log('Order updated with transport ID');
        } catch (updateErr) {
          console.error('Error updating order with transport ID:', updateErr);
          // Don't fail the whole operation if order update fails
        }
      }

      toast.success('Created! ✅');

      // Navigate back to Post-Production if came from there, otherwise to Transport
      if (form.orderId) {
        navigate(`/production/post-production/${form.orderId}`);
      } else {
        navigate('/transport');
      }
    } catch (err) {
      console.error('Error creating delivery order:', err);
      setError('Error creating delivery order: ' + (err.response?.data?.message || err.message));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/transport')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Transport Dashboard
        </button>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b">
            <h1 className="text-2xl font-semibold text-gray-900">Create Delivery Order</h1>
            <p className="text-sm text-gray-600 mt-1">Fill in the details to create a new delivery order</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Product Details */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-red-700" />
                <h2 className="text-lg font-semibold text-gray-900">Product Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="productId"
                    value={form.productId}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., PROD-016"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="productName"
                    value={form.productName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., Wooden Dining Table"
                  />
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-red-700" />
                <h2 className="text-lg font-semibold text-gray-900">Client Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="clientName"
                    value={form.clientName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., John Doe"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    name="clientAddress"
                    value={form.clientAddress}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., 123 Main Street, City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Contact
                  </label>
                  <input
                    type="tel"
                    name="clientContact"
                    value={form.clientContact}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., 9876543210"
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Truck className="w-5 h-5 text-red-700" />
                <h2 className="text-lg font-semibold text-gray-900">Vehicle Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="vehicleType"
                    value={form.vehicleType}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none bg-white"
                  >
                    <option value="">Select Vehicle Type</option>
                    <option value="Truck">Truck</option>
                    <option value="Van">Van</option>
                    <option value="Bike">Bike</option>
                    <option value="Auto">Auto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="vehicleNumber"
                    value={form.vehicleNumber}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., MH-02-AB-1234"
                  />
                </div>
              </div>
            </div>

            {/* Driver Information */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <UserCircle className="w-5 h-5 text-red-700" />
                <h2 className="text-lg font-semibold text-gray-900">Driver Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="driverName"
                    value={form.driverName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., Ravi Singh"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver ID
                  </label>
                  <input
                    type="text"
                    name="driverId"
                    value={form.driverId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., DRV-016"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver Contact
                  </label>
                  <input
                    type="tel"
                    name="driverContact"
                    value={form.driverContact}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., 9123456789"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Details */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-red-700" />
                <h2 className="text-lg font-semibold text-gray-900">Delivery Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Date
                  </label>
                  <input
                    type="date"
                    name="deliveryDate"
                    value={form.deliveryDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Distance (km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="distance"
                    value={form.distance}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., 45.5"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => navigate('/transport')}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors font-medium disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Delivery Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
