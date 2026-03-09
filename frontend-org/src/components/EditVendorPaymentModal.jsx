import React, { useState, useEffect } from 'react';
import { X, IndianRupee, CreditCard, Calendar, Package } from 'lucide-react';

const EditVendorPaymentModal = ({ payment, onClose, onSave, readOnly = false }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const [formData, setFormData] = useState({
    ...payment
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };

      // Recalculate totals when order value or GST changes
      if (name === 'orderValue' || name === 'gst') {
        const orderValue = parseFloat(name === 'orderValue' ? value : updated.orderValue) || 0;
        const gst = parseFloat(name === 'gst' ? value : updated.gst) || 0;
        updated.totalAmount = orderValue + gst;
        updated.balanceAmount = updated.totalAmount - (parseFloat(updated.paidAmount) || 0);
      }

      // Recalculate balance when paid amount changes
      if (name === 'paidAmount') {
        const paidAmount = parseFloat(value) || 0;
        updated.balanceAmount = updated.totalAmount - paidAmount;
      }

      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.vendorName || !formData.orderName) {
      alert('Please fill in all required fields');
      return;
    }

    const paymentData = {
      ...formData,
      orderValue: parseFloat(formData.orderValue),
      gst: parseFloat(formData.gst),
      totalAmount: parseFloat(formData.totalAmount),
      paidAmount: parseFloat(formData.paidAmount) || 0,
      balanceAmount: parseFloat(formData.balanceAmount)
    };

    onSave(paymentData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">{readOnly ? 'View Payment Details' : 'Edit Payment Details'}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Vendor Information */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-red-700" />
              <h3 className="text-lg font-semibold text-gray-900">Vendor Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="vendorId"
                  value={formData.vendorId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="vendorName"
                  value={formData.vendorName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-700 focus:border-red-700"
                  required
                  disabled={readOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-700 focus:border-red-700"
                  required
                  disabled={readOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-700 focus:border-red-700"
                  required
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>

          {/* Order Information */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-red-700" />
              <h3 className="text-lg font-semibold text-gray-900">Order Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="orderName"
                  value={formData.orderName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-700 focus:border-red-700"
                  required
                  disabled={readOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Type <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="jobType"
                  value={formData.jobType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-700 focus:border-red-700"
                  required
                  disabled={readOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-700 focus:border-red-700"
                  required
                  disabled={readOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dispatch Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="dispatchDate"
                  value={formData.dispatchDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-700 focus:border-red-700"
                  required
                  disabled={readOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-700 focus:border-red-700"
                  required
                  disabled={readOnly}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <IndianRupee className="w-5 h-5 text-red-700" />
              <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="orderValue"
                  value={formData.orderValue}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-700 focus:border-red-700"
                  required
                  min="0"
                  step="0.01"
                  disabled={readOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GST Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="gst"
                  value={formData.gst}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-700 focus:border-red-700"
                  required
                  min="0"
                  step="0.01"
                  disabled={readOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Amount
                </label>
                <input
                  type="number"
                  name="totalAmount"
                  value={formData.totalAmount}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paid Amount
                </label>
                <input
                  type="number"
                  name="paidAmount"
                  value={formData.paidAmount}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-700 focus:border-red-700"
                  min="0"
                  step="0.01"
                  disabled={readOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Balance Amount
                </label>
                <input
                  type="number"
                  name="balanceAmount"
                  value={formData.balanceAmount}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly && (
              <button
                type="submit"
                className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition font-medium"
              >
                Save Changes
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditVendorPaymentModal;
