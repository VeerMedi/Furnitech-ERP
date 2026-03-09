import React, { useState, useMemo } from 'react';
import { X, Search, Package, CheckSquare, Square } from 'lucide-react';
import Button from '../Button';

const ProductSelectionModal = ({ isOpen, onClose, products, onExport }) => {
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [exporting, setExporting] = useState(false);

    // Get unique categories - MUST be before early return
    const categories = ['ALL', ...new Set(products.map(p => p.category))];

    // Filter products based on search and category - MUST be before early return
    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            const matchesSearch =
                product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.productCode?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategory = categoryFilter === 'ALL' || product.category === categoryFilter;

            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, categoryFilter]);

    // Handle select/deselect product
    const toggleProduct = (productId) => {
        setSelectedProducts(prev =>
            prev.includes(productId)
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    // Select all filtered products
    const selectAll = () => {
        const allIds = filteredProducts.map(p => p._id);
        setSelectedProducts(allIds);
    };

    // Deselect all
    const deselectAll = () => {
        setSelectedProducts([]);
    };

    // Handle export
    const handleExport = async () => {
        if (selectedProducts.length === 0) return;

        setExporting(true);
        try {
            await onExport(selectedProducts);
            // Reset selection after successful export
            setSelectedProducts([]);
            setSearchTerm('');
            setCategoryFilter('ALL');
            onClose();
        } catch (error) {
            console.error('Error exporting products:', error);
        } finally {
            setExporting(false);
        }
    };

    // Format category name for display
    const formatCategory = (category) => {
        return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    // Early return AFTER all hooks - this is critical for React
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Package className="w-6 h-6" />
                            Export Products
                        </h2>
                        <p className="text-muted-foreground mt-1">
                            Select products to export as Excel template
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Search and Filters */}
                <div className="p-6 border-b border-border space-y-4">
                    <div className="flex gap-4 flex-wrap">
                        {/* Search */}
                        <div className="flex-1 min-w-[250px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search by name or SKU..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>

                        {/* Category Filter */}
                        <div className="min-w-[200px]">
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {categories.map(category => (
                                    <option key={category} value={category}>
                                        {category === 'ALL' ? 'All Categories' : formatCategory(category)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            <Button
                                onClick={selectAll}
                                variant="outline"
                                size="sm"
                            >
                                <CheckSquare className="w-4 h-4 mr-2" />
                                Select All ({filteredProducts.length})
                            </Button>
                            <Button
                                onClick={deselectAll}
                                variant="outline"
                                size="sm"
                                disabled={selectedProducts.length === 0}
                            >
                                <Square className="w-4 h-4 mr-2" />
                                Deselect All
                            </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            <span className="font-semibold text-primary">{selectedProducts.length}</span> product(s) selected
                        </div>
                    </div>
                </div>

                {/* Product List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {filteredProducts.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No products found</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredProducts.map(product => (
                                <div
                                    key={product._id}
                                    onClick={() => toggleProduct(product._id)}
                                    className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${selectedProducts.includes(product._id)
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                        }`}
                                >
                                    <div className="flex-shrink-0">
                                        {selectedProducts.includes(product._id) ? (
                                            <CheckSquare className="w-5 h-5 text-primary" />
                                        ) : (
                                            <Square className="w-5 h-5 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-foreground truncate">
                                            {product.name}
                                        </h3>
                                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                                            <span>SKU: {product.sku || product.productCode}</span>
                                            <span>Category: {formatCategory(product.category)}</span>
                                            {product.price && (
                                                <span className="font-semibold text-foreground">₹{product.price.toLocaleString()}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-muted/30">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={exporting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleExport}
                        disabled={selectedProducts.length === 0 || exporting}
                    >
                        {exporting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Package className="w-4 h-4 mr-2" />
                                Download Selected ({selectedProducts.length})
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ProductSelectionModal;
