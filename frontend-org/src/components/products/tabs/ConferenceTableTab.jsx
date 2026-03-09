import React from 'react';
import ProductDataTable from '../ProductDataTable';
import ProductPricingChart from '../ProductPricingChart';

const ConferenceTableTab = ({ products, onEdit, onDelete }) => {
    const columns = [
        { key: 'sku', label: 'SKU', sortable: true },
        { key: 'length', label: 'Length (mm)', sortable: true, format: 'number' },
        { key: 'width', label: 'Width (mm)', sortable: true, format: 'number' },
        { key: 'height', label: 'Height (mm)', sortable: true, format: 'number' },
        { key: 'material', label: 'Material', sortable: true },
        { key: 'seats', label: 'Seating Capacity', sortable: true },
        { key: 'shape', label: 'Shape', sortable: true },
        { key: 'price', label: 'Price', sortable: true, format: 'currency' },
    ];

    return (
        <div className="space-y-6">
            {/* Data Table */}
            <ProductDataTable
                products={products}
                columns={columns}
                title="Conference Tables"
                onEdit={onEdit}
                onDelete={onDelete}
            />

            {/* Pricing Chart */}
            <ProductPricingChart
                products={products}
                chartType="scatter"
                title="Price vs Seating Capacity"
            />
        </div>
    );
};

export default ConferenceTableTab;
