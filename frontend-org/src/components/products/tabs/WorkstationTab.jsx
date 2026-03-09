import React from 'react';
import ProductDataTable from '../ProductDataTable';
import ProductPricingChart from '../ProductPricingChart';

const WorkstationTab = ({ products, type = 'non-sharing', onEdit, onDelete }) => {
    const columns = [
        { key: 'sku', label: 'SKU', sortable: true },
        { key: 'length', label: 'Length (mm)', sortable: true, format: 'number' },
        { key: 'width', label: 'Width (mm)', sortable: true, format: 'number' },
        { key: 'height', label: 'Height (mm)', sortable: true, format: 'number' },
        { key: 'material', label: 'Material', sortable: true },
        { key: 'seats', label: 'Seats', sortable: true },
        { key: 'type', label: 'Type', sortable: true },
        { key: 'price', label: 'Price', sortable: true, format: 'currency' },
    ];

    const title = type === 'non-sharing' ? 'Non-Sharing Workstations' : 'Sharing Workstations';

    return (
        <div className="space-y-6">
            {/* Data Table */}
            <ProductDataTable
                products={products}
                columns={columns}
                title={title}
                onEdit={onEdit}
                onDelete={onDelete}
            />

            {/* Pricing Chart */}
            <ProductPricingChart
                products={products}
                chartType="scatter"
                title="Price vs Length by Material"
            />
        </div>
    );
};

export default WorkstationTab;
