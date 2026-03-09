import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Save, Plus, Trash2 } from 'lucide-react';
import { orderAPI, rawMaterialAPI } from '../services/api';

export default function EditPreProductionOrder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [categories, setCategories] = useState([]);
    const [editFormData, setEditFormData] = useState({
        priority: '',
        orderStatus: '',
        expectedDeliveryDate: '',
        items: []
    });

    useEffect(() => {
        window.scrollTo(0, 0);
        loadOrder();
        loadRawMaterials();
    }, [id]);

    const loadOrder = async () => {
        try {
            setLoading(true);
            const response = await orderAPI.getOne(id);
            const orderData = response.data.data || response.data;
            setOrder(orderData);
            setEditFormData({
                priority: orderData.priority,
                orderStatus: orderData.orderStatus,
                expectedDeliveryDate: orderData.expectedDeliveryDate ? orderData.expectedDeliveryDate.split('T')[0] : '',
                items: orderData.items.map(item => ({
                    ...item,
                    bom: item.bom ? item.bom.map(bomItem => ({
                        ...bomItem,
                        selectedCategory: rawMaterials.find(rm => rm._id === bomItem.material)?.category || ''
                    })) : []
                }))
            });
            setLoading(false);
        } catch (error) {
            console.error('Error loading order:', error);
            setLoading(false);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const loadRawMaterials = async () => {
        try {
            const response = await rawMaterialAPI.getAll();
            const materials = response.data.data || response.data;
            setRawMaterials(materials);

            // Extract unique categories
            const uniqueCategories = [...new Set(materials.map(m => m.category).filter(Boolean))];
            setCategories(uniqueCategories.sort());
        } catch (error) {
            console.error('Error loading raw materials:', error);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const handleUpdateOrder = async (e) => {
        e.preventDefault();
        if (!order) return;

        try {
            setLoading(true);
            await orderAPI.update(order._id, editFormData);
            setLoading(false);
            navigate('/production/pre-production');
        } catch (error) {
            console.error('Error updating order:', error);
            alert('Failed to update order');
            setLoading(false);
        }
    };

    const handleAddRawMaterial = (itemIndex) => {
        const updatedItems = [...editFormData.items];
        if (!updatedItems[itemIndex].bom) {
            updatedItems[itemIndex].bom = [];
        }
        updatedItems[itemIndex].bom.push({
            material: '',
            requiredQuantity: 0,
            selectedCategory: '' // Track selected category
        });
        setEditFormData({ ...editFormData, items: updatedItems });
    };

    const handleRawMaterialChange = (itemIndex, bomIndex, field, value) => {
        const updatedItems = [...editFormData.items];
        updatedItems[itemIndex].bom[bomIndex][field] = value;
        setEditFormData({ ...editFormData, items: updatedItems });
    };

    const handleRemoveRawMaterial = (itemIndex, bomIndex) => {
        const updatedItems = [...editFormData.items];
        updatedItems[itemIndex].bom.splice(bomIndex, 1);
        setEditFormData({ ...editFormData, items: updatedItems });
    };

    const handleCategoryChange = (itemIndex, bomIndex, category) => {
        const updatedItems = [...editFormData.items];
        updatedItems[itemIndex].bom[bomIndex].selectedCategory = category;
        updatedItems[itemIndex].bom[bomIndex].material = ''; // Reset material when category changes
        setEditFormData({ ...editFormData, items: updatedItems });
    };

    const getFilteredMaterials = (category) => {
        if (!category) return [];
        return rawMaterials.filter(m => m.category === category);
    };

    if (loading) {
        return <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">Loading...</div>;
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <p className="text-gray-600">Order not found</p>
                        <button
                            onClick={() => navigate('/production/pre-production')}
                            className="mt-4 px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800"
                        >
                            Back to Pre-Production
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/production/pre-production')}
                        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        <span>Back to Pre-Production</span>
                    </button>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h1 className="text-2xl font-semibold text-gray-900">Edit Order #{order.orderNumber}</h1>
                        <p className="text-sm text-gray-500 mt-1">Update order details and product information</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleUpdateOrder} className="space-y-6">
                    {/* Read-Only Info */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                                <div className="p-3 bg-gray-50 rounded-md text-gray-900">
                                    {order.customer?.firstName} {order.customer?.lastName}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                <div className="p-3 bg-gray-50 rounded-md text-gray-900">
                                    {order.customer?.companyName || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
                                <div className="p-3 bg-gray-50 rounded-md text-gray-900">
                                    {order.productType}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Editable Fields */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Update Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                                <select
                                    value={editFormData.priority}
                                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                    <option value="URGENT">Urgent</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Order Status</label>
                                <select
                                    value={editFormData.orderStatus}
                                    onChange={(e) => setEditFormData({ ...editFormData, orderStatus: e.target.value })}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                >
                                    <option value="DRAFT">Draft</option>
                                    <option value="CONFIRMED">Confirmed</option>
                                    <option value="PROCESSING">Processing</option>
                                    <option value="READY">Ready</option>
                                    <option value="DELIVERED">Delivered</option>
                                    <option value="CANCELLED">Cancelled</option>
                                    <option value="ON_HOLD">On Hold</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery</label>
                                <input
                                    type="date"
                                    value={editFormData.expectedDeliveryDate}
                                    onChange={(e) => setEditFormData({ ...editFormData, expectedDeliveryDate: e.target.value })}
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Product Details Block */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Package className="w-5 h-5 mr-2 text-gray-500" />
                            Product Details
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item #</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specs</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {editFormData.items && editFormData.items.length > 0 ? (
                                        editFormData.items.map((item, itemIndex) => (
                                            <React.Fragment key={itemIndex}>
                                                <tr>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.itemNumber || itemIndex + 1}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {item.product?.name || item.description || 'Unknown Product'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {item.specifications ? (
                                                            typeof item.specifications === 'string' ? (
                                                                <span className="text-xs">{item.specifications}</span>
                                                            ) : (
                                                                <div className="flex flex-col gap-1">
                                                                    {Object.entries(item.specifications).map(([key, value]) => (
                                                                        <span key={key} className="text-xs">
                                                                            <span className="font-medium">{key}:</span> {value}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )
                                                        ) : 'N/A'}
                                                    </td>
                                                </tr>
                                                {/* Raw Materials Row */}
                                                <tr className="bg-gray-50">
                                                    <td colSpan="4" className="px-6 py-4">
                                                        <div className="space-y-3">
                                                            {/* Header */}
                                                            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                                                                <h4 className="text-sm font-semibold text-gray-700 flex items-center">
                                                                    <Package className="w-4 h-4 mr-2 text-blue-600" />
                                                                    Raw Materials (BOM)
                                                                </h4>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAddRawMaterial(itemIndex)}
                                                                    className="flex items-center text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                                                >
                                                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                                                    Add Material
                                                                </button>
                                                            </div>

                                                            {/* Materials List */}
                                                            {item.bom && item.bom.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {item.bom.map((bomItem, bomIndex) => (
                                                                        <div key={bomIndex} className="bg-white p-3 rounded-lg border border-gray-200">
                                                                            <div className="grid grid-cols-12 gap-3">
                                                                                {/* Category */}
                                                                                <div className="col-span-4">
                                                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                                                                                    <select
                                                                                        value={bomItem.selectedCategory || ''}
                                                                                        onChange={(e) => handleCategoryChange(itemIndex, bomIndex, e.target.value)}
                                                                                        className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                                                                                    >
                                                                                        <option value="">Select Category</option>
                                                                                        {categories.map((cat) => (
                                                                                            <option key={cat} value={cat}>{cat}</option>
                                                                                        ))}
                                                                                    </select>
                                                                                </div>

                                                                                {/* Material */}
                                                                                <div className="col-span-5">
                                                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Material</label>
                                                                                    <select
                                                                                        value={bomItem.material?._id || bomItem.material || ''}
                                                                                        onChange={(e) => handleRawMaterialChange(itemIndex, bomIndex, 'material', e.target.value)}
                                                                                        disabled={!bomItem.selectedCategory}
                                                                                        className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                                                    >
                                                                                        <option value="">{bomItem.selectedCategory ? 'Select Material' : 'Select category first'}</option>
                                                                                        {getFilteredMaterials(bomItem.selectedCategory).map((mat) => (
                                                                                            <option key={mat._id} value={mat._id}>{mat.itemName}</option>
                                                                                        ))}
                                                                                    </select>
                                                                                </div>

                                                                                {/* Quantity */}
                                                                                <div className="col-span-2">
                                                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                                                                                    <input
                                                                                        type="number"
                                                                                        placeholder="0"
                                                                                        value={bomItem.requiredQuantity || ''}
                                                                                        onChange={(e) => handleRawMaterialChange(itemIndex, bomIndex, 'requiredQuantity', parseFloat(e.target.value) || 0)}
                                                                                        className="w-full text-sm rounded border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                                                        step="0.01"
                                                                                    />
                                                                                </div>

                                                                                {/* Delete */}
                                                                                <div className="col-span-1 flex items-end justify-center">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => handleRemoveRawMaterial(itemIndex, bomIndex)}
                                                                                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                                        title="Remove"
                                                                                    >
                                                                                        <Trash2 className="w-4 h-4" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-center py-6 bg-white rounded-lg border border-dashed border-gray-300">
                                                                    <Package className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                                                                    <p className="text-xs text-gray-500">No materials assigned</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">No items found in this order</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => navigate('/production/pre-production')}
                            className="px-6 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center disabled:opacity-50"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
