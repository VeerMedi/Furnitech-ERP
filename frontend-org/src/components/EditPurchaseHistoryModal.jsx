import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { vendorAPI } from '../services/api';

export default function EditPurchaseHistoryModal({ vendor, purchase, purchaseIndex, onClose, onSave }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    purchaseDate: purchase.purchaseDate ? new Date(purchase.purchaseDate).toISOString().split('T')[0] : '',
    itemName: purchase.itemName || '',
    brand: purchase.brand || '',
    finish: purchase.finish || '',
    thickness: purchase.thickness || '',
    materialName: purchase.materialName || '',
    length: purchase.length || '',
    width: purchase.width || '',
    quantity: purchase.quantity || 0,
    unitPrice: purchase.unitPrice || 0,
    totalAmount: purchase.totalAmount || 0,
    amountPaid: purchase.amountPaid || 0,
    balance: purchase.balance || 0,
    status: purchase.status || 'Pending'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    // Convert numeric fields
    if (['quantity', 'unitPrice', 'totalAmount', 'amountPaid', 'balance'].includes(name)) {
      newValue = parseFloat(value) || 0;
    }

    setForm(prev => {
      const updated = { ...prev, [name]: newValue };

      // Auto-calculate totalAmount when quantity or unitPrice changes
      if (name === 'quantity' || name === 'unitPrice') {
        updated.totalAmount = (updated.quantity * updated.unitPrice).toFixed(2);
      }

      // Auto-calculate balance when totalAmount or amountPaid changes
      if (name === 'totalAmount' || name === 'amountPaid') {
        updated.balance = (updated.totalAmount - updated.amountPaid).toFixed(2);
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (purchaseIndex === -1) {
        // Add new purchase history
        const response = await vendorAPI.addPurchase(vendor._id, form);
        alert('Purchase history added and synced to Price Book!');
      } else {
        // Update existing purchase history
        const response = await vendorAPI.updatePurchaseHistory(vendor._id, purchase._id, form);
        alert('Purchase history updated and synced to Price Book!');
      }
      
      // Update local state
      const updatedPurchase = { ...purchase, ...form, _id: purchase._id };
      onSave(updatedPurchase);
    } catch (error) {
      console.error('Error saving purchase history:', error);
      alert('Failed to save purchase history: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h3 className="text-lg font-semibold">{purchaseIndex === -1 ? 'Add Purchase History' : 'Edit Purchase History'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Purchase Details */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Purchase Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="purchaseDate"
                  value={form.purchaseDate}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="itemName"
                  value={form.itemName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                  placeholder="e.g., Laminate Sheet"
                />
              </div>
            </div>
          </div>

          {/* Material Specifications */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Material Specifications</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                <input
                  type="text"
                  name="brand"
                  value={form.brand}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                  placeholder="e.g., Greenlam, Merino"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Finish</label>
                <input
                  type="text"
                  name="finish"
                  value={form.finish}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                  placeholder="e.g., Matte, Glossy, Textured"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thickness</label>
                <input
                  type="text"
                  name="thickness"
                  value={form.thickness}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                  placeholder="e.g., 1mm, 8mm, 18mm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Name</label>
                <input
                  type="text"
                  name="materialName"
                  value={form.materialName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                  placeholder="e.g., Plywood, MDF, Particleboard"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Length</label>
                <input
                  type="text"
                  name="length"
                  value={form.length}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                  placeholder="e.g., 2440mm, 8ft"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                <input
                  type="text"
                  name="width"
                  value={form.width}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                  placeholder="e.g., 1220mm, 4ft"
                />
              </div>
            </div>
          </div>

          {/* Quantity & Price */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Quantity & Price</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="unitPrice"
                  value={form.unitPrice}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-semibold">
                  {formatCurrency(form.totalAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Payment Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
                <input
                  type="number"
                  name="amountPaid"
                  value={form.amountPaid}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Balance</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-red-700 font-semibold">
                  {formatCurrency(form.balance)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                >
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
