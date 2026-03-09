import React, { useState } from 'react';
import { Plus, X, Edit2 } from 'lucide-react';
import Button from './Button';

const ProductMaterialEditor = ({
    selectedProducts = [],
    selectedMaterials = [],
    onProductsChange,
    onMaterialsChange,
    onOpenProductSelector,
    onOpenMaterialSelector
}) => {
    const removeProduct = (index) => {
        const updated = [...selectedProducts];
        updated.splice(index, 1);
        onProductsChange(updated);
    };

    const removeMaterial = (index) => {
        const updated = [...selectedMaterials];
        updated.splice(index, 1);
        onMaterialsChange(updated);
    };

    return (
        <div className="space-y-3 text-sm">
            {/* Products Section */}
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-1">
                        📦 Products Used
                    </h4>
                    <Button
                        type="button"
                        onClick={onOpenProductSelector}
                        size="sm"
                        variant="outline"
                        className="text-xs bg-white border-blue-300 text-blue-700 hover:bg-blue-50 py-1 px-2"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Product
                    </Button>
                </div>

                {selectedProducts.length > 0 ? (
                    <div className="space-y-2">
                        {selectedProducts.map((product, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200 group hover:border-blue-300 transition-colors">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800">{product.name}</p>
                                    <p className="text-xs text-gray-500">₹{product.price?.toLocaleString('en-IN')}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeProduct(idx)}
                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity p-1"
                                    title="Remove"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-gray-400 italic text-center py-2">No products added</p>
                )}
            </div>

            {/* Materials Section */}
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-1">
                        🔧 Materials Used
                    </h4>
                    <Button
                        type="button"
                        onClick={onOpenMaterialSelector}
                        size="sm"
                        variant="outline"
                        className="text-xs bg-white border-green-300 text-green-700 hover:bg-green-50 py-1 px-2"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Material
                    </Button>
                </div>

                {selectedMaterials.length > 0 ? (
                    <div className="space-y-2">
                        {selectedMaterials.map((material, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200 group hover:border-green-300 transition-colors">
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800">{material.name}</p>
                                    <p className="text-xs text-gray-500">₹{material.price?.toLocaleString('en-IN')}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeMaterial(idx)}
                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity p-1"
                                    title="Remove"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-gray-400 italic text-center py-2">No materials added</p>
                )}
            </div>
        </div>
    );
};

export default ProductMaterialEditor;
