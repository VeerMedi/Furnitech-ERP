import React, { useState } from 'react';
import ProductDataTable from '../ProductDataTable';
import ProductPricingChart from '../ProductPricingChart';
import SizeMatrixView from '../SizeMatrixView';
import Button from '../../Button';
import { Table, Grid3x3 } from 'lucide-react';

const FoldingTableTab = ({ products, onEdit, onDelete }) => {
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'matrix'

    const columns = [
        { key: 'sku', label: 'SKU', sortable: true },
        { key: 'length', label: 'Length (mm)', sortable: true, format: 'number' },
        { key: 'width', label: 'Width (mm)', sortable: true, format: 'number' },
        { key: 'height', label: 'Height (mm)', sortable: true, format: 'number' },
        { key: 'material', label: 'Material', sortable: true },
        { key: 'price', label: 'Price', sortable: true, format: 'currency' },
    ];

    return (
        <div className="space-y-6">
            {/* View Toggle */}
            <div className="flex justify-end gap-2">
                <Button
                    variant={viewMode === 'table' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                >
                    <Table className="w-4 h-4 mr-1" />
                    Table View
                </Button>
                <Button
                    variant={viewMode === 'matrix' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('matrix')}
                >
                    <Grid3x3 className="w-4 h-4 mr-1" />
                    Matrix View
                </Button>
            </div>

            {/* Content based on view mode */}
            {viewMode === 'table' ? (
                <>
                    {/* Data Table */}
                    <ProductDataTable
                        products={products}
                        columns={columns}
                        title="Folding Tables"
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />

                    {/* Pricing Chart */}
                    <ProductPricingChart
                        products={products}
                        chartType="bar"
                        title="Average Price by Material"
                    />
                </>
            ) : (
                /* Size Matrix View */
                <SizeMatrixView
                    products={products}
                    title="Folding Table Size Matrix"
                />
            )}
        </div>
    );
};

export default FoldingTableTab;
