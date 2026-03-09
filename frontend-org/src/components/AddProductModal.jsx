import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import Input from './Input';
import { productAPI } from '../services/api';

const FURNITURE_CATEGORIES = [
    { value: 'NON_SHARING_WORKSTATION', label: 'Non-Sharing Workstation' },
    { value: 'SHARING_WORKSTATION', label: 'Sharing Workstation' },
    { value: 'NON_SHARING_PARTITION', label: 'Non-Sharing Partition' },
    { value: 'SHARING_PARTITION', label: 'Sharing Partition' },
    { value: 'FOLDING_TABLE', label: 'Folding Table' },
    { value: 'CAFE_TABLE', label: 'Café Table' },
    { value: 'CONFERENCE_TABLE', label: 'Conference Table' },
    { value: 'CABIN_TABLE', label: 'Cabin Table' },
    { value: 'STORAGE', label: 'Storage' },
    { value: 'ACCESSORIES', label: 'Accessories' },
];

const MATERIALS = [
    { value: 'PLB', label: 'Pre-Laminated Board' },
    { value: 'MDF', label: 'Medium Density Fiberboard' },
    { value: 'PLY', label: 'Plywood' },
    { value: 'MARIN_PLY', label: 'Marine Plywood' },
    { value: 'VENEER', label: 'Veneer' },
    { value: 'LAMINATE', label: 'Laminate' },
    { value: 'GLASS', label: 'Glass' },
    { value: 'METAL', label: 'Metal' },
    { value: 'FABRIC', label: 'Fabric' },
];

const AddProductModal = ({ isOpen, onClose, onSuccess, product = null }) => {
    const isEditMode = !!product;

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        subCategory: '',
        specifications: {
            dimensions: {
                width: '',
                height: '',
                depth: '',
                unit: 'MM',
            },
            material: '',
            finish: '',
            color: '',
            seats: '',
            type: '',
        },
        pricing: {
            sellingPrice: '',
            baseCost: '',
            laborCost: '',
            currency: 'INR',
        },
        description: '',
        status: 'ACTIVE',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Pre-fill form when editing
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                category: product.category || '',
                subCategory: product.subCategory || '',
                specifications: {
                    dimensions: {
                        width: product.specifications?.dimensions?.width || '',
                        height: product.specifications?.dimensions?.height || '',
                        depth: product.specifications?.dimensions?.depth || '',
                        unit: product.specifications?.dimensions?.unit || 'MM',
                    },
                    material: product.specifications?.material || '',
                    finish: product.specifications?.finish || '',
                    color: product.specifications?.color || '',
                    seats: product.specifications?.seats || product.seats || '',
                    type: product.specifications?.type || product.type || '',
                },
                pricing: {
                    sellingPrice: product.pricing?.sellingPrice || '',
                    baseCost: product.pricing?.baseCost || '',
                    laborCost: product.pricing?.laborCost || '',
                    currency: product.pricing?.currency || 'INR',
                },
                description: product.description || '',
                status: product.status || 'ACTIVE',
            });
        }
    }, [product]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name.includes('.')) {
            const keys = name.split('.');
            setFormData(prev => {
                const updated = { ...prev };
                let current = updated;

                for (let i = 0; i < keys.length - 1; i++) {
                    current[keys[i]] = { ...current[keys[i]] };
                    current = current[keys[i]];
                }

                current[keys[keys.length - 1]] = value;
                return updated;
            });
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Convert numeric string fields to numbers
            const productData = {
                ...formData,
                specifications: {
                    ...formData.specifications,
                    dimensions: {
                        width: formData.specifications.dimensions.width ? parseFloat(formData.specifications.dimensions.width) : undefined,
                        height: formData.specifications.dimensions.height ? parseFloat(formData.specifications.dimensions.height) : undefined,
                        depth: formData.specifications.dimensions.depth ? parseFloat(formData.specifications.dimensions.depth) : undefined,
                        unit: formData.specifications.dimensions.unit,
                    },
                },
                pricing: {
                    sellingPrice: parseFloat(formData.pricing.sellingPrice),
                    baseCost: formData.pricing.baseCost ? parseFloat(formData.pricing.baseCost) : undefined,
                    laborCost: formData.pricing.laborCost ? parseFloat(formData.pricing.laborCost) : undefined,
                    currency: formData.pricing.currency,
                },
            };

            // Remove empty optional fields
            if (!productData.specifications.dimensions.width) delete productData.specifications.dimensions.width;
            if (!productData.specifications.dimensions.height) delete productData.specifications.dimensions.height;
            if (!productData.specifications.dimensions.depth) delete productData.specifications.dimensions.depth;
            if (!productData.pricing.baseCost) delete productData.pricing.baseCost;
            if (!productData.pricing.laborCost) delete productData.pricing.laborCost;

            // Use productAPI service which handles auth tokens
            if (isEditMode) {
                await productAPI.update(product._id, productData);
            } else {
                await productAPI.create(productData);
            }

            // Reset form only if creating new product
            if (!isEditMode) {
                setFormData({
                    name: '',
                    category: '',
                    subCategory: '',
                    specifications: {
                        dimensions: {
                            width: '',
                            height: '',
                            depth: '',
                            unit: 'MM',
                        },
                        material: '',
                        finish: '',
                        color: '',
                    },
                    pricing: {
                        sellingPrice: '',
                        baseCost: '',
                        laborCost: '',
                        currency: 'INR',
                    },
                    description: '',
                    status: 'ACTIVE',
                });
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error saving product:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to save product';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative bg-card rounded-lg shadow-xl w-full max-w-3xl border border-border">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <h2 className="text-xl font-semibold text-foreground">
                            {isEditMode ? 'Edit Product' : 'Add New Product'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="px-6 py-4">
                        {error && (
                            <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded-md">
                                <p className="text-sm text-destructive">{error}</p>
                            </div>
                        )}

                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                            {/* Basic Information */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-foreground">Basic Information</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Product Name <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="e.g., Executive Workstation 1800x900"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Category <span className="text-destructive">*</span>
                                        </label>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="">Select Category</option>
                                            {FURNITURE_CATEGORIES.map(cat => (
                                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Sub-Category
                                    </label>
                                    <input
                                        type="text"
                                        name="subCategory"
                                        value={formData.subCategory}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="e.g., Executive, Standard, Premium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="Product description and specifications"
                                    />
                                </div>
                            </div>

                            {/* Specifications */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <h3 className="font-semibold text-foreground">Specifications</h3>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Width (mm)
                                        </label>
                                        <input
                                            type="number"
                                            name="specifications.dimensions.width"
                                            value={formData.specifications.dimensions.width}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="600"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Height (mm)
                                        </label>
                                        <input
                                            type="number"
                                            name="specifications.dimensions.height"
                                            value={formData.specifications.dimensions.height}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="750"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Depth (mm)
                                        </label>
                                        <input
                                            type="number"
                                            name="specifications.dimensions.depth"
                                            value={formData.specifications.dimensions.depth}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="1200"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Material
                                        </label>
                                        <select
                                            name="specifications.material"
                                            value={formData.specifications.material}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value="">Select Material</option>
                                            {MATERIALS.map(mat => (
                                                <option key={mat.value} value={mat.value}>{mat.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Finish
                                        </label>
                                        <input
                                            type="text"
                                            name="specifications.finish"
                                            value={formData.specifications.finish}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="e.g., Matte, Glossy"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Color
                                        </label>
                                        <input
                                            type="text"
                                            name="specifications.color"
                                            value={formData.specifications.color}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="e.g., Walnut, White"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Seats
                                        </label>
                                        <input
                                            type="number"
                                            name="specifications.seats"
                                            value={formData.specifications.seats}
                                            onChange={handleChange}
                                            min="0"
                                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="e.g., 1, 2, 4"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Type
                                        </label>
                                        <input
                                            type="text"
                                            name="specifications.type"
                                            value={formData.specifications.type}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="e.g., Executive, Manager"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Pricing */}
                            <div className="space-y-4 pt-4 border-t border-border">
                                <h3 className="font-semibold text-foreground">Pricing</h3>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Selling Price (₹) <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            name="pricing.sellingPrice"
                                            value={formData.pricing.sellingPrice}
                                            onChange={handleChange}
                                            required
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="15000"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Base Cost (₹)
                                        </label>
                                        <input
                                            type="number"
                                            name="pricing.baseCost"
                                            value={formData.pricing.baseCost}
                                            onChange={handleChange}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="10000"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Labor Cost (₹)
                                        </label>
                                        <input
                                            type="number"
                                            name="pricing.laborCost"
                                            value={formData.pricing.laborCost}
                                            onChange={handleChange}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="3000"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                loading={loading}
                                disabled={loading}
                            >
                                {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Product' : 'Create Product')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddProductModal;
