import React, { useState, useMemo } from 'react';
import { Search, Download, Edit2, Trash2 } from 'lucide-react';
import Button from '../Button';
import { exportToCSV, exportToExcel, formatCurrency, formatNumber } from '../../utils/productUtils';

const ProductDataTable = ({
    products,
    columns,
    title = 'Products',
    enableExport = true,
    onEdit,
    onDelete,
}) => {
    const [sortBy, setSortBy] = useState(null);
    const [sortOrder, setSortOrder] = useState('asc');
    const [searchText, setSearchText] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    // Filter products based on search
    const filteredProducts = useMemo(() => {
        if (!searchText) return products;

        const searchLower = searchText.toLowerCase();
        return products.filter(product => {
            return columns.some(col => {
                const value = product[col.key];
                return String(value || '').toLowerCase().includes(searchLower);
            });
        });
    }, [products, searchText, columns]);

    // Sort products
    const sortedProducts = useMemo(() => {
        if (!sortBy) return filteredProducts;

        return [...filteredProducts].sort((a, b) => {
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
    }, [filteredProducts, sortBy, sortOrder]);

    // Paginate products
    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedProducts.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedProducts, currentPage]);

    const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);

    const handleSort = (columnKey) => {
        if (sortBy === columnKey) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(columnKey);
            setSortOrder('asc');
        }
    };

    const handleExportCSV = () => {
        exportToCSV(sortedProducts, `${title.toLowerCase().replace(/\s+/g, '_')}.csv`);
    };

    const handleExportExcel = () => {
        exportToExcel(sortedProducts, `${title.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
    };

    const formatCellValue = (value, column, product) => {
        if (column.format === 'currency') {
            return formatCurrency(value);
        }
        if (column.format === 'number') {
            return value?.toLocaleString('en-IN');
        }
        if (column.render) {
            return column.render(value, product);
        }
        return value || '-';
    };

    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            {sortedProducts.length} {sortedProducts.length === 1 ? 'product' : 'products'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search in table..."
                                value={searchText}
                                onChange={(e) => {
                                    setSearchText(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-10 pr-4 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
                            />
                        </div>
                        {enableExport && (
                            <>
                                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                                    <Download className="w-4 h-4 mr-1" />
                                    CSV
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleExportExcel}>
                                    <Download className="w-4 h-4 mr-1" />
                                    Excel
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-muted/30">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider ${column.sortable !== false ? 'cursor-pointer hover:text-foreground' : ''
                                        }`}
                                    onClick={() => column.sortable !== false && handleSort(column.key)}
                                >
                                    <div className="flex items-center gap-2">
                                        {column.label}
                                        {column.sortable !== false && sortBy === column.key && (
                                            <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </div>
                                </th>
                            ))}
                            {(onEdit || onDelete) && (
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                        {paginatedProducts.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="px-6 py-12 text-center text-muted-foreground">
                                    No products found
                                </td>
                            </tr>
                        ) : (
                            paginatedProducts.map((product, index) => (
                                <tr
                                    key={product.sku || product.id || index}
                                    className="hover:bg-muted/30 transition-colors"
                                >
                                    {columns.map(column => (
                                        <td key={column.key} className="px-6 py-4 text-sm text-foreground whitespace-nowrap">
                                            {formatCellValue(product[column.key], column, product)}
                                        </td>
                                    ))}
                                    {(onEdit || onDelete) && (
                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {onEdit && (
                                                    <button
                                                        onClick={() => onEdit(product)}
                                                        className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                                                        title="Edit product"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {onDelete && (
                                                    <button
                                                        onClick={() => onDelete(product)}
                                                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                                                        title="Delete product"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedProducts.length)} of {sortedProducts.length}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <div className="flex gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <Button
                                        key={pageNum}
                                        variant={currentPage === pageNum ? 'primary' : 'outline'}
                                        size="sm"
                                        onClick={() => setCurrentPage(pageNum)}
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductDataTable;
