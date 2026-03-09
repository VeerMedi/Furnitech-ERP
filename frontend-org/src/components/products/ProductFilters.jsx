import React, { useState, useEffect } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import Button from '../Button';

const ProductFilters = ({
    onFilterChange,
    categories,
    materials,
    priceRange,
    sizeRanges
}) => {
    const [filters, setFilters] = useState({
        category: '',
        materials: [],
        priceRange: { min: priceRange.min, max: priceRange.max },
        lengthRange: sizeRanges.length ? { min: sizeRanges.length.min, max: sizeRanges.length.max } : null,
        widthRange: sizeRanges.width ? { min: sizeRanges.width.min, max: sizeRanges.width.max } : null,
        heightRange: sizeRanges.height ? { min: sizeRanges.height.min, max: sizeRanges.height.max } : null,
        searchText: '',
    });

    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        // Notify parent of filter changes
        onFilterChange(filters);
    }, [filters]);

    const handleCategoryChange = (e) => {
        setFilters({ ...filters, category: e.target.value });
    };

    const handleMaterialToggle = (material) => {
        const newMaterials = filters.materials.includes(material)
            ? filters.materials.filter(m => m !== material)
            : [...filters.materials, material];
        setFilters({ ...filters, materials: newMaterials });
    };

    const handlePriceRangeChange = (type, value) => {
        setFilters({
            ...filters,
            priceRange: { ...filters.priceRange, [type]: Number(value) },
        });
    };

    const handleSizeRangeChange = (dimension, type, value) => {
        setFilters({
            ...filters,
            [`${dimension}Range`]: { ...filters[`${dimension}Range`], [type]: Number(value) },
        });
    };

    const handleSearchChange = (e) => {
        setFilters({ ...filters, searchText: e.target.value });
    };

    const clearFilters = () => {
        setFilters({
            category: '',
            materials: [],
            priceRange: { min: priceRange.min, max: priceRange.max },
            lengthRange: sizeRanges.length ? { min: sizeRanges.length.min, max: sizeRanges.length.max } : null,
            widthRange: sizeRanges.width ? { min: sizeRanges.width.min, max: sizeRanges.width.max } : null,
            heightRange: sizeRanges.height ? { min: sizeRanges.height.min, max: sizeRanges.height.max } : null,
            searchText: '',
        });
    };

    const hasActiveFilters =
        filters.category ||
        filters.materials.length > 0 ||
        filters.searchText ||
        filters.priceRange.min !== priceRange.min ||
        filters.priceRange.max !== priceRange.max;

    return (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Filters</h3>
                    {hasActiveFilters && (
                        <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                            Active
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                    >
                        {showAdvanced ? 'Less' : 'More'} Filters
                    </Button>
                    {hasActiveFilters && (
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                            <X className="w-4 h-4 mr-1" />
                            Clear All
                        </Button>
                    )}
                </div>
            </div>

            {/* Primary Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {/* Search */}
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Search
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by SKU, material, specs..."
                            value={filters.searchText}
                            onChange={handleSearchChange}
                            className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                {/* Category */}
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Category
                    </label>
                    <select
                        value={filters.category}
                        onChange={handleCategoryChange}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => {
                            const value = typeof cat === 'object' ? cat.value : cat;
                            const label = typeof cat === 'object' ? cat.label : cat;
                            return <option key={value} value={value}>{label}</option>
                        })}
                    </select>
                </div>

                {/* Price Range */}
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Price Range
                    </label>
                    <div className="flex gap-2 items-center">
                        <input
                            type="number"
                            placeholder="Min"
                            value={filters.priceRange.min}
                            onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                            className="w-full px-2 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <span className="text-muted-foreground">-</span>
                        <input
                            type="number"
                            placeholder="Max"
                            value={filters.priceRange.max}
                            onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                            className="w-full px-2 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>
            </div>

            {/* Advanced Filters */}
            {showAdvanced && (
                <div className="border-t border-border pt-4 space-y-4 animate-fade-in-up">
                    {/* Materials */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Materials
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {materials.map(material => (
                                <button
                                    key={material}
                                    onClick={() => handleMaterialToggle(material)}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filters.materials.includes(material)
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                >
                                    {material}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Size Ranges */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Length Range */}
                        {sizeRanges.length && (
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Length (mm)
                                </label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={filters.lengthRange?.min || ''}
                                        onChange={(e) => handleSizeRangeChange('length', 'min', e.target.value)}
                                        className="w-full px-2 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <span className="text-muted-foreground">-</span>
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={filters.lengthRange?.max || ''}
                                        onChange={(e) => handleSizeRangeChange('length', 'max', e.target.value)}
                                        className="w-full px-2 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Width Range */}
                        {sizeRanges.width && (
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Width (mm)
                                </label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={filters.widthRange?.min || ''}
                                        onChange={(e) => handleSizeRangeChange('width', 'min', e.target.value)}
                                        className="w-full px-2 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <span className="text-muted-foreground">-</span>
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={filters.widthRange?.max || ''}
                                        onChange={(e) => handleSizeRangeChange('width', 'max', e.target.value)}
                                        className="w-full px-2 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Height Range */}
                        {sizeRanges.height && (
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Height (mm)
                                </label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={filters.heightRange?.min || ''}
                                        onChange={(e) => handleSizeRangeChange('height', 'min', e.target.value)}
                                        className="w-full px-2 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <span className="text-muted-foreground">-</span>
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={filters.heightRange?.max || ''}
                                        onChange={(e) => handleSizeRangeChange('height', 'max', e.target.value)}
                                        className="w-full px-2 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductFilters;
