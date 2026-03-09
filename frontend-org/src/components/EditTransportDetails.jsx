import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { transportAPI } from '../services/api';

export default function EditTransportDetails({ transport, onClose, onSave }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);
  
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    productId: transport.productId || '',
    productName: transport.productName || '',
    clientName: transport.clientName || '',
    clientAddress: transport.clientAddress || '',
    clientContact: transport.clientContact || '',
    vehicleType: transport.vehicleType || '',
    vehicleNumber: transport.vehicleNumber || '',
    driverId: transport.driverId || '',
    driverName: transport.driverName || '',
    driverContact: transport.driverContact || '',
  });
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      const payload = {
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
      };

      await transportAPI.update(transport._id, payload);
      const updatedTransport = { ...transport, ...payload };
      onSave(updatedTransport);
    } catch (err) {
      console.error('Error updating transport:', err);
      setError(err.response?.data?.message || err.message || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Edit Transport</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Product Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600">Product ID</label>
                <input name="productId" value={form.productId} onChange={handleChange} className="mt-1 block w-full rounded border border-gray-300 text-sm px-3 py-2 focus:border-maroon-500 focus:ring-1 focus:ring-maroon-500 outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Product Name</label>
                <input name="productName" value={form.productName} onChange={handleChange} className="mt-1 block w-full rounded border border-gray-300 text-sm px-3 py-2 focus:border-maroon-500 focus:ring-1 focus:ring-maroon-500 outline-none" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Client Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-600">Client Name</label>
                <input name="clientName" value={form.clientName} onChange={handleChange} className="mt-1 block w-full rounded border border-gray-300 text-sm px-3 py-2 focus:border-maroon-500 focus:ring-1 focus:ring-maroon-500 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-600">Delivery Address</label>
                <input name="clientAddress" value={form.clientAddress} onChange={handleChange} className="mt-1 block w-full rounded border border-gray-300 text-sm px-3 py-2 focus:border-maroon-500 focus:ring-1 focus:ring-maroon-500 outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Client Contact</label>
                <input name="clientContact" value={form.clientContact} onChange={handleChange} className="mt-1 block w-full rounded border border-gray-300 text-sm px-3 py-2 focus:border-maroon-500 focus:ring-1 focus:ring-maroon-500 outline-none" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Vehicle Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-600">Vehicle Type</label>
                <select name="vehicleType" value={form.vehicleType} onChange={handleChange} className="mt-1 block w-full rounded border border-gray-300 text-sm px-3 py-2 focus:border-maroon-500 focus:ring-1 focus:ring-maroon-500 outline-none bg-white">
                  <option value="">Select</option>
                  <option value="Truck">Truck</option>
                  <option value="Van">Van</option>
                  <option value="Bike">Bike</option>
                  <option value="Auto">Auto</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Vehicle Number</label>
                <input name="vehicleNumber" value={form.vehicleNumber} onChange={handleChange} className="mt-1 block w-full rounded border border-gray-300 text-sm px-3 py-2 focus:border-maroon-500 focus:ring-1 focus:ring-maroon-500 outline-none" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Driver Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-600">Driver Name</label>
                <input name="driverName" value={form.driverName} onChange={handleChange} className="mt-1 block w-full rounded border border-gray-300 text-sm px-3 py-2 focus:border-maroon-500 focus:ring-1 focus:ring-maroon-500 outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Driver ID</label>
                <input name="driverId" value={form.driverId} onChange={handleChange} className="mt-1 block w-full rounded border border-gray-300 text-sm px-3 py-2 focus:border-maroon-500 focus:ring-1 focus:ring-maroon-500 outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Driver Contact</label>
                <input name="driverContact" value={form.driverContact} onChange={handleChange} className="mt-1 block w-full rounded border border-gray-300 text-sm px-3 py-2 focus:border-maroon-500 focus:ring-1 focus:ring-maroon-500 outline-none" />
              </div>
            </div>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors font-medium disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
