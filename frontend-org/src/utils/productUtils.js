import * as XLSX from 'xlsx';

/**
 * Filter products based on multiple criteria
 */
export const filterProducts = (products, filters) => {
    return products.filter(product => {
        // Category filter
        if (filters.category && product.category !== filters.category) {
            return false;
        }

        // Material filter (multi-select)
        if (filters.materials && filters.materials.length > 0) {
            if (!filters.materials.includes(product.material)) {
                return false;
            }
        }

        // Price range filter
        if (filters.priceRange) {
            const { min, max } = filters.priceRange;
            if (product.price < min || product.price > max) {
                return false;
            }
        }

        // Size range filters
        if (filters.lengthRange && product.length) {
            const { min, max } = filters.lengthRange;
            if (product.length < min || product.length > max) {
                return false;
            }
        }

        if (filters.widthRange && product.width) {
            const { min, max } = filters.widthRange;
            if (product.width < min || product.width > max) {
                return false;
            }
        }

        if (filters.heightRange && product.height) {
            const { min, max } = filters.heightRange;
            if (product.height < min || product.height > max) {
                return false;
            }
        }

        // Text search filter
        if (filters.searchText) {
            const searchLower = filters.searchText.toLowerCase();
            const searchableText = `${product.sku} ${product.material} ${product.specs || ''} ${product.name || ''}`.toLowerCase();
            if (!searchableText.includes(searchLower)) {
                return false;
            }
        }

        return true;
    });
};

/**
 * Sort products by a specific field
 */
export const sortProducts = (products, sortBy, sortOrder = 'asc') => {
    const sorted = [...products].sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];

        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal || '').toLowerCase();
        const bStr = String(bVal || '').toLowerCase();

        if (sortOrder === 'asc') {
            return aStr.localeCompare(bStr);
        } else {
            return bStr.localeCompare(aStr);
        }
    });

    return sorted;
};

/**
 * Calculate price statistics for products
 */
export const calculatePriceStats = (products) => {
    if (!products || products.length === 0) {
        return { min: 0, max: 0, avg: 0 };
    }

    const prices = products.map(p => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    return {
        min,
        max,
        avg: Math.round(avg),
    };
};

/**
 * Calculate price statistics grouped by category
 */
export const calculatePriceStatsByCategory = (products) => {
    const statsByCategory = {};

    products.forEach(product => {
        const category = product.category;
        if (!statsByCategory[category]) {
            statsByCategory[category] = [];
        }
        statsByCategory[category].push(product.price);
    });

    const result = {};
    Object.keys(statsByCategory).forEach(category => {
        const prices = statsByCategory[category];
        result[category] = {
            min: Math.min(...prices),
            max: Math.max(...prices),
            avg: Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length),
            count: prices.length,
        };
    });

    return result;
};

/**
 * Get unique values for a specific field
 */
export const getUniqueValues = (products, field) => {
    const values = products.map(p => p[field]).filter(Boolean);
    return [...new Set(values)].sort();
};

/**
 * Group products by category
 */
export const groupByCategory = (products) => {
    const grouped = {};

    products.forEach(product => {
        const category = product.category;
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(product);
    });

    return grouped;
};

/**
 * Export products to CSV format
 */
export const exportToCSV = (products, filename = 'products.csv') => {
    if (!products || products.length === 0) {
        console.warn('No products to export');
        return;
    }

    // Get all unique keys from products
    const headers = Object.keys(products[0]);

    // Create CSV content
    let csv = headers.join(',') + '\n';

    products.forEach(product => {
        const row = headers.map(header => {
            const value = product[header];
            // Escape commas and quotes in values
            const stringValue = String(value || '');
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        });
        csv += row.join(',') + '\n';
    });

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Export products to Excel format
 */
export const exportToExcel = (products, filename = 'products.xlsx') => {
    if (!products || products.length === 0) {
        console.warn('No products to export');
        return;
    }

    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Convert products to worksheet
    const ws = XLSX.utils.json_to_sheet(products);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Products');

    // Write file
    XLSX.writeFile(wb, filename);
};

/**
 * Export size matrix to Excel
 */
export const exportSizeMatrixToExcel = (matrixData, filename = 'size_matrix.xlsx') => {
    const wb = XLSX.utils.book_new();

    // Create worksheet from matrix data
    // matrixData should be in format: { lengths: [], widths: [], matrix: [[...]] }
    const ws = XLSX.utils.aoa_to_sheet(matrixData.matrix);

    XLSX.utils.book_append_sheet(wb, ws, 'Size Matrix');
    XLSX.writeFile(wb, filename);
};

/**
 * Create size matrix from folding table products
 */
export const createSizeMatrix = (products) => {
    // Get unique lengths and widths
    const lengths = [...new Set(products.map(p => p.length))].sort((a, b) => a - b);
    const widths = [...new Set(products.map(p => p.width))].sort((a, b) => a - b);

    // Create matrix
    const matrix = {};

    products.forEach(product => {
        const key = `${product.length}x${product.width}`;
        if (!matrix[key]) {
            matrix[key] = [];
        }
        matrix[key].push(product);
    });

    return {
        lengths,
        widths,
        matrix,
    };
};

/**
 * Format currency
 */
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
};

/**
 * Format number with commas
 */
export const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
};

/**
 * Debounce function for search inputs
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export default {
    filterProducts,
    sortProducts,
    calculatePriceStats,
    calculatePriceStatsByCategory,
    getUniqueValues,
    groupByCategory,
    exportToCSV,
    exportToExcel,
    exportSizeMatrixToExcel,
    createSizeMatrix,
    formatCurrency,
    formatNumber,
    debounce,
};
