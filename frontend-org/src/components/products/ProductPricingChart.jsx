import React from 'react';
import {
    ScatterChart,
    Scatter,
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { formatCurrency } from '../../utils/productUtils';

const COLORS = [
    'hsl(349, 66%, 35%)', // primary red
    'hsl(44, 70%, 55%)',  // secondary yellow
    'hsl(217, 91%, 60%)', // blue
    'hsl(142, 71%, 45%)', // green
    'hsl(262, 83%, 58%)', // purple
    'hsl(24, 95%, 53%)',  // orange
    'hsl(340, 82%, 52%)', // pink
    'hsl(188, 78%, 41%)', // cyan
];

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-card border border-border rounded-lg shadow-lg p-3">
                <p className="font-semibold text-foreground mb-1">{data.sku || data.name || 'Product'}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm text-muted-foreground">
                        <span className="font-medium" style={{ color: entry.color }}>{entry.name}:</span>{' '}
                        {entry.name.toLowerCase().includes('price') ? formatCurrency(entry.value) : entry.value}
                    </p>
                ))}
                {data.material && <p className="text-sm text-muted-foreground">Material: {data.material}</p>}
                {data.specs && <p className="text-xs text-muted-foreground mt-1">{data.specs}</p>}
            </div>
        );
    }
    return null;
};

const ProductPricingChart = ({ products, chartType = 'scatter', title }) => {
    if (!products || products.length === 0) {
        return (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No data available for chart</p>
            </div>
        );
    }

    const renderScatterChart = () => {
        // Group by material for multi-series scatter
        const groupedByMaterial = {};
        products.forEach(p => {
            if (!groupedByMaterial[p.material]) {
                groupedByMaterial[p.material] = [];
            }
            groupedByMaterial[p.material].push({
                ...p,
                x: p.length || p.diameter || p.width,
                y: p.price,
            });
        });

        return (
            <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                        type="number"
                        dataKey="x"
                        name="Length/Diameter"
                        label={{ value: 'Length/Diameter (mm)', position: 'bottom', offset: 40 }}
                        stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                        type="number"
                        dataKey="y"
                        name="Price"
                        label={{ value: 'Price (₹)', angle: -90, position: 'insideLeft', offset: -40 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    {Object.entries(groupedByMaterial).map(([material, data], index) => (
                        <Scatter
                            key={material}
                            name={material}
                            data={data}
                            fill={COLORS[index % COLORS.length]}
                        />
                    ))}
                </ScatterChart>
            </ResponsiveContainer>
        );
    };

    const renderBarChart = () => {
        // Group by material and calculate average price
        const materialPrices = {};
        products.forEach(p => {
            if (!materialPrices[p.material]) {
                materialPrices[p.material] = { total: 0, count: 0 };
            }
            materialPrices[p.material].total += p.price;
            materialPrices[p.material].count += 1;
        });

        const data = Object.entries(materialPrices).map(([material, stats]) => ({
            material,
            avgPrice: Math.round(stats.total / stats.count),
            count: stats.count,
        }));

        return (
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data} margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                        dataKey="material"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                        label={{ value: 'Average Price (₹)', angle: -90, position: 'insideLeft', offset: -40 }}
                    />
                    <Tooltip
                        formatter={(value, name) => [formatCurrency(value), 'Avg Price']}
                        contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem'
                        }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="avgPrice" name="Average Price">
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        );
    };

    const renderLineChart = () => {
        // Sort products by length/diameter and show price trend
        const sortedData = [...products]
            .filter(p => p.length || p.diameter)
            .sort((a, b) => (a.length || a.diameter) - (b.length || b.diameter))
            .map(p => ({
                ...p,
                size: p.length || p.diameter,
            }));

        return (
            <ResponsiveContainer width="100%" height={400}>
                <LineChart data={sortedData} margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                        dataKey="size"
                        label={{ value: 'Size (mm)', position: 'bottom', offset: 40 }}
                        stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                        label={{ value: 'Price (₹)', angle: -90, position: 'insideLeft', offset: -40 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line
                        type="monotone"
                        dataKey="price"
                        stroke={COLORS[0]}
                        strokeWidth={2}
                        dot={{ fill: COLORS[0], r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        );
    };

    const renderHeightChart = () => {
        // For partitions - price vs height
        const heightData = [...products]
            .filter(p => p.height)
            .sort((a, b) => a.height - b.height);

        return (
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={heightData} margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                        dataKey="height"
                        label={{ value: 'Height (mm)', position: 'bottom', offset: 40 }}
                        stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                        label={{ value: 'Price (₹)', angle: -90, position: 'insideLeft', offset: -40 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="price" name="Price">
                        {heightData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={COLORS[heightData.findIndex(d => d.material === entry.material) % COLORS.length]}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        );
    };

    let chartComponent;
    switch (chartType) {
        case 'bar':
            chartComponent = renderBarChart();
            break;
        case 'line':
            chartComponent = renderLineChart();
            break;
        case 'height':
            chartComponent = renderHeightChart();
            break;
        case 'scatter':
        default:
            chartComponent = renderScatterChart();
            break;
    }

    return (
        <div className="bg-card border border-border rounded-lg p-6">
            {title && (
                <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
            )}
            {chartComponent}
        </div>
    );
};

export default ProductPricingChart;
