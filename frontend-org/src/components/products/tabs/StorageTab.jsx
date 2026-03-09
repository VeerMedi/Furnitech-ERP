import React from 'react';
import ProductDataTable from '../ProductDataTable';
import ProductPricingChart from '../ProductPricingChart';

const StorageTab = ({ products, onEdit, onDelete }) => {
    const columns = [
        { key: 'sku', label: 'SKU', sortable: true },
        { key: 'name', label: 'Name', sortable: true },
        { key: 'type', label: 'Type', sortable: true },
        { key: 'length', label: 'Length (mm)', sortable: true, format: 'number' },
        { key: 'width', label: 'Width (mm)', sortable: true, format: 'number' },
        { key: 'height', label: 'Height (mm)', sortable: true, format: 'number' },
        { key: 'material', label: 'Material', sortable: true },
        { key: 'capacity', label: 'Capacity', sortable: true },
        { key: 'price', label: 'Price', sortable: true, format: 'currency' },
    ];

    return (
        <div className="space-y-6">
            {/* Data Table */}
            <ProductDataTable
                products={products}
                columns={columns}
                title="Storage Units"
                onEdit={onEdit}
                onDelete={onDelete}
            />

            {/* Pricing Chart */}
            <ProductPricingChart
                products={products}
                chartType="bar"
                title="Average Price by Storage Type"
            />
        </div>
    );
};

export default StorageTab;
