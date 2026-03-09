import React from 'react';
import { Package, Grid3x3, TrendingUp, TrendingDown, IndianRupee } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/productUtils';

const ProductKPICards = ({ totalSKUs, categoryCount, priceStats, statsByCategory }) => {
    const cards = [
        {
            title: 'Total SKUs',
            value: formatNumber(totalSKUs),
            icon: Package,
            color: 'from-blue-500 to-blue-600',
            bgColor: 'bg-blue-50',
            iconColor: 'text-blue-600',
        },
        {
            title: 'Product Categories',
            value: categoryCount,
            icon: Grid3x3,
            color: 'from-purple-500 to-purple-600',
            bgColor: 'bg-purple-50',
            iconColor: 'text-purple-600',
        },
        {
            title: 'Price Range',
            value: `${formatCurrency(priceStats.min)} - ${formatCurrency(priceStats.max)}`,
            icon: IndianRupee,
            color: 'from-green-500 to-green-600',
            bgColor: 'bg-green-50',
            iconColor: 'text-green-600',
        },
        {
            title: 'Average Price',
            value: formatCurrency(priceStats.avg),
            icon: TrendingUp,
            color: 'from-orange-500 to-orange-600',
            bgColor: 'bg-orange-50',
            iconColor: 'text-orange-600',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-all duration-300 hover:-translate-y-1"
                    style={{ animationDelay: `${index * 100}ms` }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-lg ${card.bgColor}`}>
                            <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground mb-1">{card.title}</p>
                        <p className="text-2xl font-bold text-foreground">{card.value}</p>
                    </div>
                </div>
            ))}

            {/* Category-wise price stats - expandable section */}
            {statsByCategory && Object.keys(statsByCategory).length > 0 && (
                <div className="col-span-full bg-card border border-border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Price Statistics by Category</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {Object.entries(statsByCategory).map(([category, stats]) => (
                            <div key={category} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                                <p className="text-sm font-medium text-foreground mb-2 truncate" title={category}>
                                    {category}
                                </p>
                                <div className="space-y-1 text-xs text-muted-foreground">
                                    <div className="flex justify-between">
                                        <span>Min:</span>
                                        <span className="font-medium text-foreground">{formatCurrency(stats.min)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Max:</span>
                                        <span className="font-medium text-foreground">{formatCurrency(stats.max)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Avg:</span>
                                        <span className="font-medium text-foreground">{formatCurrency(stats.avg)}</span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t border-border mt-2">
                                        <span>SKUs:</span>
                                        <span className="font-medium text-primary">{stats.count}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductKPICards;
