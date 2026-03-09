import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building, Phone, Mail, MapPin, FileText, Package, Plus, Trash2 } from 'lucide-react';
import { vendorAPI } from '../services/api';
import { toast } from '../hooks/useToast';

export default function CreateVendor() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    vendorId: '',
    vendorName: '',
    contactNumber: '',
    email: '',
    altContactNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
    status: 'Active',
    paymentStatus: 'Pending',
    totalAmount: 0,
    paidAmount: 0,
    balance: 0,
    purchaseHistory: []
  });

  const [newPurchase, setNewPurchase] = useState({
    purchaseDate: '',
    itemName: '',
    brand: '',
    finish: '',
    thickness: '',
    materialName: '',
    length: '',
    width: '',
    quantity: 0,
    unitPrice: 0,
    totalAmount: 0,
    amountPaid: 0,
    balance: 0,
    status: 'Pending'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePurchaseChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (['quantity', 'unitPrice', 'totalAmount', 'amountPaid', 'balance'].includes(name)) {
      newValue = parseFloat(value) || 0;
    }

    setNewPurchase(prev => {
      const updated = { ...prev, [name]: newValue };

      if (name === 'quantity' || name === 'unitPrice') {
        updated.totalAmount = (updated.quantity * updated.unitPrice).toFixed(2);
      }

      if (name === 'totalAmount' || name === 'amountPaid') {
        updated.balance = (updated.totalAmount - updated.amountPaid).toFixed(2);
      }

      return updated;
    });
  };

  const addPurchaseHistory = () => {
    if (!newPurchase.purchaseDate || !newPurchase.itemName || newPurchase.quantity <= 0 || newPurchase.unitPrice <= 0) {
      toast.warning('Please fill in all required fields');
      return;
    }

    const purchase = { ...newPurchase };
    const updatedHistory = [...form.purchaseHistory, purchase];

    const newTotalAmount = form.totalAmount + parseFloat(purchase.totalAmount);
    const newPaidAmount = form.paidAmount + parseFloat(purchase.amountPaid);
    const newBalance = newTotalAmount - newPaidAmount;

    let paymentStatus = 'Pending';
    if (newBalance === 0) {
      paymentStatus = 'Done';
    } else if (newPaidAmount > 0) {
      paymentStatus = 'Half';
    }

    setForm(prev => ({
      ...prev,
      purchaseHistory: updatedHistory,
      totalAmount: newTotalAmount,
      paidAmount: newPaidAmount,
      balance: newBalance,
      paymentStatus
    }));

    setNewPurchase({
      purchaseDate: '',
      itemName: '',
      brand: '',
      finish: '',
      thickness: '',
      materialName: '',
      quantity: 0,
      unitPrice: 0,
      totalAmount: 0,
      amountPaid: 0,
      balance: 0,
      status: 'Pending'
    });
  };

  const removePurchaseHistory = (index) => {
    const purchase = form.purchaseHistory[index];
    const updatedHistory = form.purchaseHistory.filter((_, i) => i !== index);

    const newTotalAmount = form.totalAmount - parseFloat(purchase.totalAmount);
    const newPaidAmount = form.paidAmount - parseFloat(purchase.amountPaid);
    const newBalance = newTotalAmount - newPaidAmount;

    let paymentStatus = 'Pending';
    if (newBalance === 0 && newTotalAmount > 0) {
      paymentStatus = 'Done';
    } else if (newPaidAmount > 0) {
      paymentStatus = 'Half';
    }

    setForm(prev => ({
      ...prev,
      purchaseHistory: updatedHistory,
      totalAmount: newTotalAmount,
      paidAmount: newPaidAmount,
      balance: newBalance,
      paymentStatus
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      if (!form.vendorId || !form.vendorName || !form.contactNumber || !form.email || !form.gstNumber) {
        setError('Please fill in all required fields');
        setCreating(false);
        return;
      }

      // Save to database
      const response = await vendorAPI.create(form);
      console.log('Vendor created successfully:', response.data);

      // Update localStorage cache with new vendor
      try {
        const cachedData = localStorage.getItem('vendorData');
        let vendors = cachedData ? JSON.parse(cachedData) : [];
        const newVendor = response.data.data || response.data.vendor || response.data;
        vendors.push(newVendor);
        localStorage.setItem('vendorData', JSON.stringify(vendors));
        console.log('Updated localStorage cache with new vendor');
      } catch (storageError) {
        console.warn('Failed to update localStorage cache:', storageError);
        // Don't fail the operation if localStorage fails
      }

      toast.success('Vendor created! ✅ Purchase history synced.');
      navigate('/vendors/details');
    } catch (apiError) {
      console.error('Error creating vendor:', apiError);
      setError(apiError.response?.data?.message || 'Failed to create vendor. Please try again.');
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/vendors/details')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Vendor Details
        </button>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b">
            <h1 className="text-2xl font-semibold text-gray-900">Create New Vendor</h1>
            <p className="text-sm text-gray-600 mt-1">Fill in the vendor details</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building className="w-5 h-5 text-red-700" />
                <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="vendorId"
                    value={form.vendorId}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., VEN-009"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="vendorName"
                    value={form.vendorName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., ABC Suppliers"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <Phone className="w-5 h-5 text-red-700" />
                <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="contactNumber"
                    value={form.contactNumber}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., 9876543210"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alt Contact Number
                  </label>
                  <input
                    type="tel"
                    name="altContactNumber"
                    value={form.altContactNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., 9876543211"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., contact@vendor.com"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-red-700" />
                <h2 className="text-lg font-semibold text-gray-900">Address Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., 123 Business Street"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., Mumbai"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., Maharashtra"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={form.pincode}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., 400001"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-red-700" />
                <h2 className="text-lg font-semibold text-gray-900">Tax Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="gstNumber"
                    value={form.gstNumber}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                    placeholder="e.g., 27AABCT1234A1Z5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Purchase History Section */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-red-700" />
                  <h2 className="text-lg font-semibold text-gray-900">Purchase History</h2>
                </div>
                <span className="text-sm text-gray-500">(Optional)</span>
              </div>

              {/* Add Purchase Form */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Add Purchase Entry</h3>

                <div className="space-y-4">
                  {/* Purchase Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                      <input
                        type="date"
                        name="purchaseDate"
                        value={newPurchase.purchaseDate}
                        onChange={handlePurchaseChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                      <input
                        type="text"
                        name="itemName"
                        value={newPurchase.itemName}
                        onChange={handlePurchaseChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                        placeholder="e.g., Laminate Sheet"
                      />
                    </div>
                  </div>

                  {/* Material Specifications */}
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Material Specifications</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Brand</label>
                        <input
                          type="text"
                          name="brand"
                          value={newPurchase.brand}
                          onChange={handlePurchaseChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none text-sm"
                          placeholder="e.g., Greenlam"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Finish</label>
                        <input
                          type="text"
                          name="finish"
                          value={newPurchase.finish}
                          onChange={handlePurchaseChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none text-sm"
                          placeholder="e.g., Matte"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Thickness</label>
                        <input
                          type="text"
                          name="thickness"
                          value={newPurchase.thickness}
                          onChange={handlePurchaseChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none text-sm"
                          placeholder="e.g., 1mm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Material Name</label>
                        <input
                          type="text"
                          name="materialName"
                          value={newPurchase.materialName}
                          onChange={handlePurchaseChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none text-sm"
                          placeholder="e.g., Plywood"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Length</label>
                        <input
                          type="text"
                          name="length"
                          value={newPurchase.length}
                          onChange={handlePurchaseChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none text-sm"
                          placeholder="e.g., 2440mm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Width</label>
                        <input
                          type="text"
                          name="width"
                          value={newPurchase.width}
                          onChange={handlePurchaseChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none text-sm"
                          placeholder="e.g., 1220mm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quantity & Price */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        name="quantity"
                        value={newPurchase.quantity}
                        onChange={handlePurchaseChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹)</label>
                      <input
                        type="number"
                        name="unitPrice"
                        value={newPurchase.unitPrice}
                        onChange={handlePurchaseChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                      <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-semibold">
                        {formatCurrency(newPurchase.totalAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (₹)</label>
                      <input
                        type="number"
                        name="amountPaid"
                        value={newPurchase.amountPaid}
                        onChange={handlePurchaseChange}
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Balance</label>
                      <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-red-700 font-semibold">
                        {formatCurrency(newPurchase.balance)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                      <select
                        name="status"
                        value={newPurchase.status}
                        onChange={handlePurchaseChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-red-700 focus:ring-1 focus:ring-red-700 outline-none"
                      >
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addPurchaseHistory}
                    className="w-full px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Purchase Entry
                  </button>
                </div>
              </div>

              {/* Purchase History List */}
              {form.purchaseHistory.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Added Purchases ({form.purchaseHistory.length})</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {form.purchaseHistory.map((purchase, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div>
                            <p className="text-gray-500">Item</p>
                            <p className="font-medium text-gray-900">{purchase.itemName}</p>
                            {purchase.brand && <p className="text-gray-600">{purchase.brand}</p>}
                          </div>
                          <div>
                            <p className="text-gray-500">Specs</p>
                            <p className="text-gray-700">{purchase.finish || 'N/A'} • {purchase.thickness || 'N/A'}</p>
                            <p className="text-gray-600">{purchase.materialName || 'N/A'}</p>
                            {(purchase.length || purchase.width) && (
                              <p className="text-gray-600">L:{purchase.length || 'N/A'} × W:{purchase.width || 'N/A'}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-500">Qty × Price</p>
                            <p className="text-gray-700">{purchase.quantity} × {formatCurrency(purchase.unitPrice)}</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(purchase.totalAmount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Payment</p>
                            <p className="text-green-600">Paid: {formatCurrency(purchase.amountPaid)}</p>
                            <p className="text-red-600">Balance: {formatCurrency(purchase.balance)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Total Amount</p>
                        <p className="font-bold text-gray-900">{formatCurrency(form.totalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Paid</p>
                        <p className="font-bold text-green-600">{formatCurrency(form.paidAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Balance</p>
                        <p className="font-bold text-red-600">{formatCurrency(form.balance)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Payment Status</p>
                        <p className="font-bold text-blue-700">{form.paymentStatus}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => navigate('/vendors')}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors font-medium disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Vendor'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
