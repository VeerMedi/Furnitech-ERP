import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from '../../hooks/useToast';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';

const NewIndent = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    customer: '',
    orderName: '',
    indentDate: new Date().toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    requirementDate: '',
    items: [
      { itemName: '', category: '', quantity: '', unit: 'PCS', rate: '' }
    ]
  });

  const [saving, setSaving] = useState(false);

  const handleFieldChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { itemName: '', category: '', quantity: '', unit: 'PCS', rate: '' }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) {
      toast.warning('At least one item is required');
      return;
    }
    const newItems = formData.items.filter((_, idx) => idx !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      return sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0));
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.customer || !formData.orderName) {
      toast.warning('Please fill in customer and order name');
      return;
    }

    const hasInvalidItems = formData.items.some(item =>
      !item.itemName || !item.quantity || !item.rate
    );

    if (hasInvalidItems) {
      toast.warning('Please fill in all item details');
      return;
    }

    setSaving(true);
    try {
      const totalAmount = calculateTotal();
      const payload = {
        ...formData,
        totalAmount,
        poStatus: 'Draft',
        items: formData.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity),
          rate: parseFloat(item.rate)
        }))
      };

      const response = await api.post('/inventory/purchase/indent', payload);
      toast.success('Purchase indent created! ✅');
      navigate(`/inventory/purchase/${response.data.data._id}`);
    } catch (error) {
      console.error('Error creating indent:', error);
      toast.error('Failed to create indent');
    } finally {
      setSaving(false);
    }
  };

  const categories = ['Panel', 'Laminate', 'Hardware', 'Glass', 'Aluminum', 'Fabric', 'HBD', 'Handles', 'Processed Panel'];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <button
          onClick={() => navigate('/inventory/purchase')}
          className="flex items-center gap-2 text-red-700 hover:text-red-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Purchase List
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create New Purchase Indent</h1>
        <p className="text-gray-600 mt-1">Fill in the details to create a new purchase indent</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-red-200 shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name *
              </label>
              <input
                type="text"
                value={formData.customer}
                onChange={(e) => handleFieldChange('customer', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Enter customer name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Name *
              </label>
              <input
                type="text"
                value={formData.orderName}
                onChange={(e) => handleFieldChange('orderName', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Enter order name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Indent Date
              </label>
              <input
                type="date"
                value={formData.indentDate}
                onChange={(e) => handleFieldChange('indentDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleFieldChange('startDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => handleFieldChange('endDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Requirement Date
              </label>
              <input
                type="date"
                value={formData.requirementDate}
                onChange={(e) => handleFieldChange('requirementDate', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-red-200 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={item.itemName}
                    onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Item name"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={item.category}
                    onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Select...</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    value={item.unit}
                    onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="PCS">PCS</option>
                    <option value="KG">KG</option>
                    <option value="MTR">MTR</option>
                    <option value="SQ.FT">SQ.FT</option>
                    <option value="SHEET">SHEET</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rate *
                  </label>
                  <input
                    type="number"
                    value={item.rate}
                    onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="w-full px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-5 h-5 mx-auto" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">Total Amount:</span>
              <span className="text-2xl font-bold text-red-700">
                ₹{calculateTotal().toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4 justify-end">
          <button
            type="button"
            onClick={() => navigate('/inventory/purchase')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-3 bg-red-700 text-white rounded-xl hover:bg-red-800 transition-colors font-medium flex items-center gap-2 ${saving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            <Save className="w-5 h-5" />
            {saving ? 'Creating...' : 'Create Indent'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewIndent;
