/**
 * Convert AI Scanner Results to Quotation Items
 * 
 * Takes the JSON output from AI/inventory_scanner and converts it
 * to quotation item format that can be directly used in QuotationForm
 */

export const convertScanResultsToQuotationItems = (scanResults, products = []) => {
    try {
        // Extract items from the first page's analysis
        const analysisData = scanResults?.pages?.[0]?.analysis?.data;

        if (!analysisData || !analysisData.items) {
            console.warn('⚠️  No items found in scan results');
            return [];
        }

        const scannedItems = analysisData.items;
        console.log(`📦 Converting ${scannedItems.length} scanned items to quotation format...`);

        const quotationItems = scannedItems.map((item, index) => {
            // Try to match with existing products by name
            let matchedProduct = null;
            let unitPrice = 0;

            if (products && products.length > 0) {
                // Fuzzy match: check if product name includes the scanned item name or vice versa
                matchedProduct = products.find(p => {
                    const productName = (p.name || '').toLowerCase();
                    const itemName = (item.name || '').toLowerCase();
                    return productName.includes(itemName) || itemName.includes(productName);
                });

                if (matchedProduct) {
                    unitPrice = matchedProduct.pricing?.sellingPrice || matchedProduct.price || 0;
                    console.log(`✅ Matched "${item.name}" with product "${matchedProduct.name}" - Price: ₹${unitPrice}`);
                } else {
                    console.log(`⚠️  No product match found for "${item.name}" - defaulting price to 0`);
                }
            }

            // Build description with all relevant details
            let fullDescription = item.name;

            if (item.raw_label && item.raw_label !== item.name) {
                fullDescription += `\n[${item.raw_label}]`;
            }

            if (item.dimensions && item.dimensions !== 'unknown') {
                fullDescription += `\nDimensions: ${item.dimensions}`;
            }

            if (item.notes) {
                fullDescription += `\nNote: ${item.notes}`;
            }

            // Calculate amount
            const quantity = item.count || 1;
            const amount = quantity * unitPrice;

            return {
                description: fullDescription,
                layoutDescription: item.area || item.category || '',
                quantity: quantity,
                unitPrice: unitPrice,
                amount: amount,
                taxPerUnit: 18, // Default GST
                details: item.notes || '',
                image: matchedProduct?.image || '',
                // Store original scan data for reference
                scanData: {
                    category: item.category,
                    area: item.area,
                    dimensions: item.dimensions,
                    status: item.status,
                    confidence: item.confidence
                }
            };
        });

        console.log(`✅ Successfully converted ${quotationItems.length} items`);
        return quotationItems;

    } catch (error) {
        console.error('❌ Error converting scan results:', error);
        return [];
    }
};

/**
 * Get summary statistics from scan results
 */
export const getScanSummary = (scanResults) => {
    const summary = scanResults?.pages?.[0]?.analysis?.data?.summary;
    const debug = scanResults?.pages?.[0]?.analysis?.debug;

    return {
        totalItems: summary?.total_items || 0,
        totalQuantity: summary?.total_quantity || 0,
        pass1Model: debug?.pass1_model || 'Unknown',
        pass2Model: debug?.pass2_model || 'Unknown',
        pass1Count: debug?.pass1_count || 0,
        pass2Count: debug?.pass2_count || 0
    };
};
