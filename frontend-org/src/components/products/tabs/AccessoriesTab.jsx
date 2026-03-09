import React from 'react';
import ProductDataTable from '../ProductDataTable';
import ProductPricingChart from '../ProductPricingChart';

const AccessoriesTab = ({ products, onEdit, onDelete }) => {
    const columns = [
        { key: 'sku', label: 'SKU', sortable: true },
        { key: 'name', label: 'Name', sortable: true },
        { key: 'subcategory', label: 'Sub-Category', sortable: true },
        { key: 'material', label: 'Material', sortable: true },
        { key: 'color', label: 'Color', sortable: true },
        { key: 'finish', label: 'Finish', sortable: true },
        { key: 'specs', label: 'Specifications', sortable: false },
        { key: 'price', label: 'Price', sortable: true, format: 'currency' },
    ];

    return (
        <div className="space-y-6">
            {/* Data Table */}
            <ProductDataTable
                products={products}
                columns={columns}
                title="Accessories"
                onEdit={onEdit}
                onDelete={onDelete}
            />

            {/* Pricing Chart */}
            <ProductPricingChart
                products={products}
                chartType="bar"
                title="Price Distribution by Accessory Category"
            />
        </div>
    );
};

export default AccessoriesTab;
