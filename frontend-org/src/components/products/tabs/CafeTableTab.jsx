import React from 'react';
import ProductDataTable from '../ProductDataTable';
import ProductPricingChart from '../ProductPricingChart';

const CafeTableTab = ({ products, onEdit, onDelete }) => {
    const columns = [
        { key: 'sku', label: 'SKU', sortable: true },
        {
            key: 'diameter',
            label: 'Diameter/Dimensions',
            sortable: true,
            format: 'number',
            render: (value, product) => {
                if (product.shape === 'Round') {
                    return `Ø ${value}mm`;
                }
                return `${product.length || 0} x ${product.width || 0}mm`;
            }
        },
        { key: 'height', label: 'Height (mm)', sortable: true, format: 'number' },
        { key: 'material', label: 'Material', sortable: true },
        { key: 'shape', label: 'Shape', sortable: true },
        { key: 'seats', label: 'Seats', sortable: true },
        { key: 'price', label: 'Price', sortable: true, format: 'currency' },
    ];

    return (
        <div className="space-y-6">
            {/* Data Table */}
            <ProductDataTable
                products={products}
                columns={columns}
                title="Café Tables"
                onEdit={onEdit}
                onDelete={onDelete}
            />

            {/* Pricing Chart */}
            <ProductPricingChart
                products={products}
                chartType="bar"
                title="Average Price by Material"
            />
        </div>
    );
};

export default CafeTableTab;
