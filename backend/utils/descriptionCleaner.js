/**
 * Helper function to clean AI-generated quotation descriptions
 * Removes emojis, prices, and formats text for professional output
 */

const cleanQuotationDescription = (item) => {
    const hasAIFormat = item.description?.includes('📦 Product Used:') || item.description?.includes('🔧 Materials Used:');

    // If no AI format and no structured data, return original
    if (!hasAIFormat && (!item.selectedProducts?.length) && (!item.selectedMaterials?.length)) {
        return item.description;
    }

    let cleanDescription = item.layoutDescription || '';

    // Use structured data if available
    if (item.selectedProducts?.length > 0) {
        const productNames = item.selectedProducts.map(p => p.name).join(', ');
        cleanDescription += `\n${productNames}`;
    }

    if (item.selectedMaterials?.length > 0) {
        const materialNames = item.selectedMaterials.map(m => m.name).join(', ');
        cleanDescription += `\n${materialNames}`;
    }

    // Otherwise parse from description (legacy quotations)
    if (hasAIFormat && !item.selectedProducts?.length && !item.selectedMaterials?.length) {
        const desc = item.description;

        // Extract product names
        const productMatch = desc.match(/📦 Product Used:(.+?)(?=🔧 Materials Used:|📋 Specifications:|$)/s);
        if (productMatch) {
            const productLines = productMatch[1]
                .split('\n')
                .filter(l => l.trim().startsWith('•'))
                .map(l => l.replace(/•/g, '').replace(/\(₹[\d,]+\)/g, '').trim())
                .filter(l => l.length > 0);
            if (productLines.length > 0) {
                cleanDescription += `\n${productLines.join(', ')}`;
            }
        }

        // Extract material names
        const materialMatch = desc.match(/🔧 Materials Used:(.+?)(?=📋 Specifications:|$)/s);
        if (materialMatch) {
            const materialLines = materialMatch[1]
                .split('\n')
                .filter(l => l.trim().startsWith('•'))
                .map(l => {
                    return l.replace(/•/g, '')
                        .replace(/\(.+?\)/g, '')
                        .replace(/@.+$/g, '')
                        .trim();
                })
                .filter(l => l.length > 0);
            if (materialLines.length > 0) {
                cleanDescription += `\n${materialLines.join(', ')}`;
            }
        }

        // Extract specifications
        const specMatch = desc.match(/📋 Specifications:(.+?)$/s);
        if (specMatch) {
            cleanDescription += `\n${specMatch[1].trim()}`;
        }
    }

    // Add specifications if separate field
    if (item.specifications && typeof item.specifications === 'string') {
        cleanDescription += `\n${item.specifications}`;
    }

    return cleanDescription.trim();
};

module.exports = { cleanQuotationDescription };
