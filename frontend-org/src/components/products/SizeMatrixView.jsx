import React, { useMemo } from 'react';
import { Download } from 'lucide-react';
import Button from '../Button';
import { formatCurrency, exportSizeMatrixToExcel } from '../../utils/productUtils';

const MATERIAL_COLORS = {
    PLB: 'bg-blue-100 hover:bg-blue-200 border-blue-300',
    MDF: 'bg-green-100 hover:bg-green-200 border-green-300',
    PLY: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300',
    'MARIN_PLY': 'bg-purple-100 hover:bg-purple-200 border-purple-300',
    LAMINATE: 'bg-orange-100 hover:bg-orange-200 border-orange-300',
    VENEER: 'bg-pink-100 hover:bg-pink-200 border-pink-300',
    GLASS: 'bg-cyan-100 hover:bg-cyan-200 border-cyan-300',
    METAL: 'bg-gray-100 hover:bg-gray-200 border-gray-300',
};

const SizeMatrixView = ({ products, title = 'Size Matrix' }) => {
    const matrixData = useMemo(() => {
        if (!products || products.length === 0) return null;

        // Get unique lengths and widths
        const lengths = [...new Set(products.map(p => p.length).filter(Boolean))].sort((a, b) => a - b);
        const widths = [...new Set(products.map(p => p.width).filter(Boolean))].sort((a, b) => a - b);

        if (lengths.length === 0 || widths.length === 0) {
            return null;
        }

        // Create matrix: matrix[length][width] = [products]
        const matrix = {};
        lengths.forEach(length => {
            matrix[length] = {};
            widths.forEach(width => {
                matrix[length][width] = [];
            });
        });

        // Populate matrix
        products.forEach(product => {
            if (product.length && product.width) {
                matrix[product.length][product.width].push(product);
            }
        });

        return { lengths, widths, matrix };
    }, [products]);

    const handleExport = () => {
        if (!matrixData) return;

        const { lengths, widths, matrix } = matrixData;

        // Create array of arrays for Excel export
        const exportData = [];

        // Header row
        const headerRow = ['Length \\ Width', ...widths.map(w => `${w}mm`)];
        exportData.push(headerRow);

        // Data rows
        lengths.forEach(length => {
            const row = [`${length}mm`];
            widths.forEach(width => {
                const cellProducts = matrix[length][width];
                if (cellProducts.length > 0) {
                    const pricesText = cellProducts
                        .map(p => `${p.material}: ${formatCurrency(p.price)}`)
                        .join(', ');
                    row.push(pricesText);
                } else {
                    row.push('-');
                }
            });
            exportData.push(row);
        });

        exportSizeMatrixToExcel({ matrix: exportData }, 'size_matrix.xlsx');
    };

    if (!matrixData) {
        return (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">
                    No size data available for matrix view
                </p>
            </div>
        );
    }

    const { lengths, widths, matrix } = matrixData;

    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {lengths.length} × {widths.length} size combinations
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="w-4 h-4 mr-1" />
                    Export Matrix
                </Button>
            </div>

            {/* Legend */}
            <div className="px-6 py-3 border-b border-border bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground mb-2">Material Legend:</p>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(MATERIAL_COLORS).map(([material, colorClass]) => (
                        <div key={material} className="flex items-center gap-1">
                            <div className={`w-4 h-4 rounded border ${colorClass}`}></div>
                            <span className="text-xs text-foreground">{material}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="sticky left-0 z-10 px-4 py-3 bg-muted border border-border text-xs font-medium text-muted-foreground uppercase">
                                Length \ Width
                            </th>
                            {widths.map(width => (
                                <th
                                    key={width}
                                    className="px-4 py-3 bg-muted border border-border text-xs font-medium text-muted-foreground uppercase whitespace-nowrap"
                                >
                                    {width}mm
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {lengths.map(length => (
                            <tr key={length}>
                                <th className="sticky left-0 z-10 px-4 py-3 bg-muted border border-border text-xs font-medium text-foreground whitespace-nowrap">
                                    {length}mm
                                </th>
                                {widths.map(width => {
                                    const cellProducts = matrix[length][width];

                                    return (
                                        <td
                                            key={`${length}-${width}`}
                                            className="border border-border p-2 align-top"
                                        >
                                            {cellProducts.length === 0 ? (
                                                <div className="text-center text-muted-foreground text-sm py-2">-</div>
                                            ) : (
                                                <div className="space-y-1">
                                                    {cellProducts.map((product, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={`px-2 py-1.5 rounded border text-xs ${MATERIAL_COLORS[product.material] || 'bg-gray-100 border-gray-300'
                                                                } transition-all cursor-pointer group relative`}
                                                            title={product.specs}
                                                        >
                                                            <div className="flex justify-between items-center gap-1">
                                                                <span className="font-medium text-foreground truncate">
                                                                    {product.material}
                                                                </span>
                                                                <span className="font-semibold text-primary whitespace-nowrap">
                                                                    {formatCurrency(product.price)}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-muted-foreground truncate">
                                                                {product.sku}
                                                            </div>

                                                            {/* Tooltip on hover */}
                                                            <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-20 bg-card border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
                                                                <p className="font-semibold text-foreground mb-1">{product.sku}</p>
                                                                <p className="text-sm text-muted-foreground mb-1">
                                                                    {product.length}×{product.width}×{product.height}mm
                                                                </p>
                                                                <p className="text-sm text-muted-foreground mb-2">
                                                                    Material: {product.material}
                                                                </p>
                                                                <p className="text-sm font-semibold text-primary">
                                                                    {formatCurrency(product.price)}
                                                                </p>
                                                                {product.specs && (
                                                                    <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">
                                                                        {product.specs}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Summary */}
            <div className="px-6 py-3 border-t border-border bg-muted/20 text-sm text-muted-foreground">
                <p>
                    Hover over cells to view product details. Click "Export Matrix" to download as Excel.
                </p>
            </div>
        </div>
    );
};

export default SizeMatrixView;
