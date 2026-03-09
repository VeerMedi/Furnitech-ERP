import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Save, Plus, Trash2 } from 'lucide-react';
import { orderAPI, rawMaterialAPI } from '../services/api';
import { toast } from '../hooks/useToast';

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
        loadRawMaterials();
        loadOrder();
    }, [id]);

    const loadRawMaterials = async () => {
        try {
            const response = await rawMaterialAPI.getAll();
            const materials = response.data.data || response.data || [];
            setRawMaterials(materials);

            const uniqueCategories = [...new Set(materials.map(m => m.category).filter(Boolean))];
            setCategories(uniqueCategories.sort());
        } catch (error) {
            console.error('Error loading raw materials:', error);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const loadOrder = async () => {
        try {
            setLoading(true);
            const response = await orderAPI.getOne(id);
            const orderData = response.data.data || response.data;
            setOrder(orderData);
            setEditFormData({
                priority: orderData.priority,
                orderStatus: orderData.orderStatus,
                productType: orderData.productType,
                expectedDeliveryDate: orderData.expectedDeliveryDate ? orderData.expectedDeliveryDate.split('T')[0] : '',
                items: orderData.items.map(item => ({
                    ...item,
                    bom: item.bom || []
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

    const handleUpdateOrder = async (e) => {
        e.preventDefault();
        if (!order) return;

        try {
            setLoading(true);

            // 🔍 Debug: Log the full form data being sent
            console.log('💾 [Save Order] Sending update data:', JSON.stringify(editFormData, null, 2));
            console.log('💾 [Save Order] Items count:', editFormData.items?.length);

            // Debug each item's BOM
            editFormData.items?.forEach((item, idx) => {
                console.log(`💾 [Save Order] Item ${idx + 1}:`, {
                    product: item.product?.name || item.description,
                    bomCount: item.bom?.length || 0
                });

                item.bom?.forEach((bomItem, bomIdx) => {
                    console.log(`   📦 BOM ${bomIdx + 1}:`, {
                        material: bomItem.material,
                        quantity: bomItem.requiredQuantity,
                        length: bomItem.length,
                        width: bomItem.width,
                        height: bomItem.height
                    });
                });
            });

            await orderAPI.update(order._id, editFormData);
            console.log('✅ [Save Order] Order updated successfully');
            setLoading(false);
            navigate('/production/pre-production');
        } catch (error) {
            console.error('❌ [Save Order] Error updating order:', error);
            console.error('❌ [Save Order] Error response:', error.response?.data);
            toast.error('Failed to update order');
            setLoading(false);
        }
    };

    const handleAddRawMaterial = (itemIndex) => {
        console.log('🔵 [Add Material] Clicked for item index:', itemIndex);
        console.log('🔵 [Add Material] Current BOM count:', editFormData.items[itemIndex]?.bom?.length || 0);

        setEditFormData(prev => {
            const newItems = [...prev.items];
            if (!newItems[itemIndex].bom) {
                newItems[itemIndex].bom = [];
            }

            const newBomItem = {
                material: '',
                requiredQuantity: 0,
                selectedCategory: '',
                length: 0,
                width: 0,
                height: 0
            };

            newItems[itemIndex].bom.push(newBomItem);
            console.log('✅ [Add Material] BOM item added. New count:', newItems[itemIndex].bom.length);
            return { ...prev, items: newItems };
        });
    };

    const handleRawMaterialChange = (itemIndex, bomIndex, field, value) => {
        setEditFormData(prev => {
            const newItems = [...prev.items];
            newItems[itemIndex].bom[bomIndex][field] = value;

            // Auto-fill dimensions when material is selected
            if (field === 'material' && value) {
                const selectedMaterial = rawMaterials.find(m => m._id === value);
                if (selectedMaterial) {
                    // Try to get dimensions from material specifications first
                    let dimensions = { length: 0, width: 0, height: 0 };

                    // Check if specifications object has length, width, height
                    if (selectedMaterial.specifications?.length) {
                        dimensions.length = parseFloat(selectedMaterial.specifications.length) || 0;
                        dimensions.width = parseFloat(selectedMaterial.specifications.width) || 0;
                        dimensions.height = parseFloat(selectedMaterial.specifications.height) || 0;
                    } else {
                        // Extract from material name (e.g., MOK 3000X450X2100)
                        const materialName = selectedMaterial.itemName || selectedMaterial.name || '';
                        const extracted = extractDimensions(materialName);

                        if (extracted.length) {
                            dimensions.length = parseFloat(extracted.length) || 0;
                            dimensions.width = parseFloat(extracted.width) || 0;
                            dimensions.height = parseFloat(extracted.height) || 0;
                        }
                    }

                    // Apply dimensions
                    newItems[itemIndex].bom[bomIndex].length = dimensions.length;
                    newItems[itemIndex].bom[bomIndex].width = dimensions.width;
                    newItems[itemIndex].bom[bomIndex].height = dimensions.height;

                    console.log('📏 Auto-filled dimensions:', {
                        material: selectedMaterial.itemName || selectedMaterial.name,
                        source: dimensions.length > 0 ? 'Extracted from name' : 'Not found',
                        dimensions: dimensions
                    });
                }
            }

            return { ...prev, items: newItems };
        });
    };

    const handleRemoveRawMaterial = (itemIndex, bomIndex) => {
        setEditFormData(prev => {
            const newItems = [...prev.items];
            newItems[itemIndex].bom.splice(bomIndex, 1);
            return { ...prev, items: newItems };
        });
    };

    const handleCategoryChange = (itemIndex, bomIndex, category) => {
        setEditFormData(prev => {
            const newItems = [...prev.items];
            newItems[itemIndex].bom[bomIndex].selectedCategory = category;
            newItems[itemIndex].bom[bomIndex].material = '';
            return { ...prev, items: newItems };
        });
    };

    const getFilteredMaterials = (category) => {
        if (!category) return [];

        // Normalize category for comparison (handle PROCESSED_PANEL vs PROCESSED PANEL)
        const normalizedCategory = category.toUpperCase().replace(/[_\s-]/g, '');

        const filtered = rawMaterials.filter(m => {
            if (!m.category) return false;
            const matCategory = m.category.toUpperCase().replace(/[_\s-]/g, '');
            return matCategory === normalizedCategory;
        });

        console.log(`🔍 Filtering materials for category: "${category}"`);
        console.log(`   Normalized to: "${normalizedCategory}"`);
        console.log(`   Found ${filtered.length} materials`);
        if (filtered.length > 0) {
            console.log(`   Sample material categories:`, filtered.slice(0, 3).map(m => m.category));
        }

        return filtered;
    };

    // Helper function to extract dimensions from specifications
    const extractDimensions = (specs) => {
        if (!specs) return { length: null, width: null, height: null };

        const specsStr = typeof specs === 'string' ? specs : JSON.stringify(specs);

        // Try to match patterns like "1200x600x25mm" or "1200 x 600 x 25"
        const pattern = /(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/;
        const match = specsStr.match(pattern);

        if (match) {
            return {
                length: match[1],
                width: match[2],
                height: match[3]
            };
        }

        return { length: null, width: null, height: null };
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
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/production/pre-production')}
                        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Pre-Production
                    </button>

                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h1 className="text-2xl font-semibold text-gray-900">Edit Order #{order.orderNumber}</h1>
                    </div>
                </div>

                <form onSubmit={handleUpdateOrder} className="space-y-6">
                    {/* Order Information */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                                <div className="p-3 bg-gray-50 rounded-md">{order.customer?.firstName} {order.customer?.lastName}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                <div className="p-3 bg-gray-50 rounded-md">{order.customer?.companyName || 'N/A'}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
                                <div className="p-3 bg-gray-50 rounded-md">
                                    {order.productType || order.customer?.productType || 'N/A'}
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
                                    className="w-full rounded-md border-gray-300 border p-2"
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
                                    className="w-full rounded-md border-gray-300 border p-2"
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
                                    className="w-full rounded-md border-gray-300 border p-2"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Product Details */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Package className="w-5 h-5 mr-2" />
                            Product Details
                        </h2>
                        <div className="space-y-6">
                            {editFormData.items && editFormData.items.map((item, itemIndex) => (
                                <div key={itemIndex} className="border border-gray-200 rounded-lg p-4">
                                    {/* Product Info */}
                                    <div className="grid grid-cols-12 gap-4 mb-4 pb-4 border-b">
                                        <div className="col-span-1">
                                            <div className="text-xs text-gray-500">Item #</div>
                                            <div className="font-medium">{itemIndex + 1}</div>
                                        </div>
                                        <div className="col-span-7">
                                            <div className="text-xs text-gray-500">Product</div>
                                            <div className="font-medium truncate pr-4" title={item.product?.name || item.description}>
                                                {item.product?.name || item.description}
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="text-xs text-gray-500">Quantity</div>
                                            <div className="font-medium">{item.quantity}</div>
                                        </div>
                                        <div className="col-span-2">
                                            <div className="text-xs text-gray-500">Processed</div>
                                            <div className="font-medium text-gray-500">
                                                {item.bom?.length || 0} materials
                                            </div>
                                        </div>
                                    </div>

                                    {/* Full Specs */}
                                    <div className="mb-4">
                                        <div className="text-xs text-gray-500 mb-1">Full Specifications</div>
                                        <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                                            {typeof item.specifications === 'string' ? item.specifications : JSON.stringify(item.specifications)}
                                        </div>
                                    </div>

                                    {/* Raw Materials */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-sm font-semibold text-gray-700 flex items-center">
                                                <Package className="w-4 h-4 mr-2 text-blue-600" />
                                                Raw Materials (BOM)
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={() => handleAddRawMaterial(itemIndex)}
                                                className="flex items-center text-xs px-3 py-1.5 bg-red-700 text-white rounded-md hover:bg-red-800"
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1" />
                                                Add Material
                                            </button>
                                        </div>

                                        {item.bom && item.bom.length > 0 ? (
                                            <div className="space-y-3">
                                                {item.bom.map((bomItem, bomIndex) => (
                                                    <div key={bomIndex} className="bg-white p-4 rounded border">
                                                        {/* Category Buttons */}
                                                        <div className="mb-3">
                                                            <label className="block text-xs font-semibold text-gray-700 mb-2">1. Select Category:</label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {categories.map((cat) => (
                                                                    <button
                                                                        key={cat}
                                                                        type="button"
                                                                        onClick={() => handleCategoryChange(itemIndex, bomIndex, cat)}
                                                                        className={`px-3 py-1.5 text-xs font-medium rounded ${bomItem.selectedCategory === cat
                                                                            ? 'bg-red-700 text-white'
                                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                            }`}
                                                                    >
                                                                        {cat}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Materials List */}
                                                        {bomItem.selectedCategory && (
                                                            <div className="mb-3" key={`materials-${itemIndex}-${bomIndex}-${bomItem.selectedCategory}`}>
                                                                <label className="block text-xs font-semibold text-gray-700 mb-2">
                                                                    2. Select Material ({getFilteredMaterials(bomItem.selectedCategory).length} available):
                                                                </label>
                                                                <div className="min-h-[200px] max-h-64 overflow-y-auto border-2 border-gray-300 rounded bg-white p-2">
                                                                    {getFilteredMaterials(bomItem.selectedCategory).length === 0 ? (
                                                                        <div className="p-4 bg-yellow-100 text-yellow-800 rounded">
                                                                            <p className="font-bold">Debug Info:</p>
                                                                            <p>Category: {bomItem.selectedCategory}</p>
                                                                            <p>Total rawMaterials: {rawMaterials.length}</p>
                                                                            <p>Filtered count: {getFilteredMaterials(bomItem.selectedCategory).length}</p>
                                                                        </div>
                                                                    ) : (
                                                                        getFilteredMaterials(bomItem.selectedCategory).map((mat, idx) => (
                                                                            <div
                                                                                key={mat._id}
                                                                                onClick={() => handleRawMaterialChange(itemIndex, bomIndex, 'material', mat._id)}
                                                                                className={`px-4 py-3 mb-1 rounded cursor-pointer border ${(bomItem.material?._id || bomItem.material) === mat._id
                                                                                    ? 'bg-blue-500 text-white font-bold border-blue-700'
                                                                                    : 'bg-gray-50 text-gray-900 border-gray-200 hover:bg-blue-100'
                                                                                    }`}
                                                                            >
                                                                                <div className="flex justify-between items-center">
                                                                                    <span>{idx + 1}. {mat.itemName || mat.name}</span>
                                                                                    <span className="text-xs font-semibold text-green-700">
                                                                                        Available: {mat.quantity || mat.availableQuantity || mat.currentStock || mat.stock || 0} {mat.unit || ''}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Selected Material Display */}
                                                        {bomItem.material && (() => {
                                                            const selected = rawMaterials.find(m => m._id === (bomItem.material?._id || bomItem.material));
                                                            if (selected) {
                                                                return (
                                                                    <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg shadow-sm">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-lg">✓</span>
                                                                            <div className="flex-1">
                                                                                <p className="text-sm font-bold text-blue-900">
                                                                                    {selected.itemName || selected.name} <span className="text-blue-600 font-normal">({selected.category})</span>
                                                                                </p>
                                                                                <div className="flex justify-between items-center mt-1">
                                                                                    <p className="text-xs text-blue-700">
                                                                                        Available Stock: <span className="font-bold">{selected.quantity || selected.availableQuantity || selected.currentStock || selected.stock || 0}</span> {selected.unit || ''}
                                                                                    </p>
                                                                                    {bomItem.requiredQuantity > 0 && (
                                                                                        <p className={`text-xs font-bold ${(selected.quantity || 0) - bomItem.requiredQuantity < 0 ? 'text-red-600' : 'text-green-700'
                                                                                            }`}>
                                                                                            Remaining: {(selected.quantity || 0) - bomItem.requiredQuantity}
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                        })()}


                                                        {/* Quantity */}
                                                        <div className="flex gap-3">
                                                            <div className="flex-1">
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">3. Quantity</label>
                                                                <input
                                                                    type="number"
                                                                    placeholder="Enter quantity"
                                                                    value={bomItem.requiredQuantity || ''}
                                                                    onChange={(e) => handleRawMaterialChange(itemIndex, bomIndex, 'requiredQuantity', parseFloat(e.target.value) || 0)}
                                                                    className={`w-full text-sm px-3 py-2 border rounded ${bomItem.material && bomItem.requiredQuantity > 0 &&
                                                                        bomItem.requiredQuantity > (rawMaterials.find(m => m._id === (bomItem.material?._id || bomItem.material))?.quantity || 0)
                                                                        ? 'border-red-500 bg-red-50'
                                                                        : 'border-gray-300'
                                                                        }`}
                                                                    step="0.01"
                                                                />
                                                                {bomItem.material && bomItem.requiredQuantity > 0 && (() => {
                                                                    const selectedMaterial = rawMaterials.find(m => m._id === (bomItem.material?._id || bomItem.material));
                                                                    const available = selectedMaterial?.quantity || selectedMaterial?.availableQuantity || selectedMaterial?.currentStock || selectedMaterial?.stock || 0;
                                                                    const required = bomItem.requiredQuantity || 0;
                                                                    if (required > available) {
                                                                        return (
                                                                            <div className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                                                                                <span>⚠️</span>
                                                                                <span>Insufficient stock! Required: {required}, Available: {available}</span>
                                                                            </div>
                                                                        );
                                                                    } else if (required > 0) {
                                                                        return (
                                                                            <div className="mt-1 text-xs text-green-600 font-medium">
                                                                                ✓ Stock available ({available - required} remaining)
                                                                            </div>
                                                                        );
                                                                    }
                                                                })()}
                                                            </div>
                                                            <div className="flex items-end">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveRawMaterial(itemIndex, bomIndex)}
                                                                    className="px-4 py-2 text-sm text-white bg-red-700 hover:bg-red-700 rounded flex items-center"
                                                                >
                                                                    <Trash2 className="w-4 h-4 mr-1" />
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Length, Width, Height - Auto-filled from material */}
                                                        <div className="grid grid-cols-3 gap-3 mt-3">
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                                    4. Length <span className="text-blue-600">(Auto)</span>
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    placeholder="Auto from material"
                                                                    value={bomItem.length || ''}
                                                                    readOnly
                                                                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded bg-blue-50 text-blue-900 font-semibold cursor-not-allowed"
                                                                    step="0.01"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                                    5. Width <span className="text-blue-600">(Auto)</span>
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    placeholder="Auto from material"
                                                                    value={bomItem.width || ''}
                                                                    readOnly
                                                                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded bg-blue-50 text-blue-900 font-semibold cursor-not-allowed"
                                                                    step="0.01"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                                    6. Height <span className="text-blue-600">(Auto)</span>
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    placeholder="Auto from material"
                                                                    value={bomItem.height || ''}
                                                                    readOnly
                                                                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded bg-blue-50 text-blue-900 font-semibold cursor-not-allowed"
                                                                    step="0.01"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 bg-white rounded border border-dashed">
                                                <Package className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                                                <p className="text-xs text-gray-500">No materials assigned yet</p>
                                                <p className="text-xs text-gray-400 mt-1">Click "+ Add Material" to start</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => navigate('/production/pre-production')}
                            className="px-6 py-2 bg-white text-gray-700 border rounded hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-red-700 text-white rounded hover:bg-red-800 flex items-center"
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
