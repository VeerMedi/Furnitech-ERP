import React from 'react';
import ProductDataTable from '../ProductDataTable';
import ProductPricingChart from '../ProductPricingChart';

const CabinTableTab = ({ products, onEdit, onDelete }) => {
    const columns = [
        { key: 'sku', label: 'SKU', sortable: true },
        { key: 'length', label: 'Length (mm)', sortable: true, format: 'number' },
        { key: 'width', label: 'Width (mm)', sortable: true, format: 'number' },
        { key: 'height', label: 'Height (mm)', sortable: true, format: 'number' },
        { key: 'material', label: 'Material', sortable: true },
        { key: 'type', label: 'Type', sortable: true },
        { key: 'finish', label: 'Finish', sortable: true },
        { key: 'price', label: 'Price', sortable: true, format: 'currency' },
    ];

    return (
        <div className="space-y-6">
            {/* Data Table */}
            <ProductDataTable
                products={products}
                columns={columns}
                title="Cabin Tables"
                onEdit={onEdit}
                onDelete={onDelete}
            />

            {/* Pricing Chart */}
            <ProductPricingChart
                products={products}
                chartType="line"
                title="Price Distribution by Size"
            />
        </div>
    );
};

export default CabinTableTab;
