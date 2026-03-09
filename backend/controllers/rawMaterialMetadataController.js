const RawMaterial = require('../models/vlite/RawMaterial');
const logger = require('../utils/logger');

/**
 * Get all unique specification fields from raw materials
 * This is used to dynamically generate table columns in frontend
 */
exports.getSpecificationFields = async (req, res) => {
    try {
        const { organizationId } = req.user;

        // Get all raw materials for this organization
        const materials = await RawMaterial.find({
            organizationId,
            isDeleted: false
        }).select('specifications').lean();

        // Extract all unique specification keys
        const specFieldsSet = new Set();

        materials.forEach(material => {
            if (material.specifications && typeof material.specifications === 'object') {
                Object.keys(material.specifications).forEach(key => {
                    // Only add non-empty fields
                    if (material.specifications[key] !== null &&
                        material.specifications[key] !== undefined &&
                        material.specifications[key] !== '') {
                        specFieldsSet.add(key);
                    }
                });
            }
        });

        // Convert to array and sort alphabetically
        const specificationFields = Array.from(specFieldsSet).sort();

        logger.info(`Found ${specificationFields.length} unique specification fields`);

        res.status(200).json({
            success: true,
            data: {
                fields: specificationFields,
                count: specificationFields.length
            }
        });
    } catch (error) {
        logger.error('Error fetching specification fields:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching specification fields',
            error: error.message,
        });
    }
};

/**
 * Get specifications summary with field usage statistics
 */
exports.getSpecificationStats = async (req, res) => {
    try {
        const { organizationId } = req.user;

        const materials = await RawMaterial.find({
            organizationId,
            isDeleted: false
        }).select('specifications category').lean();

        const fieldStats = {};
        const totalMaterials = materials.length;

        materials.forEach(material => {
            if (material.specifications && typeof material.specifications === 'object') {
                Object.keys(material.specifications).forEach(key => {
                    if (material.specifications[key] !== null &&
                        material.specifications[key] !== undefined &&
                        material.specifications[key] !== '') {

                        if (!fieldStats[key]) {
                            fieldStats[key] = {
                                count: 0,
                                categories: new Set(),
                                sampleValues: []
                            };
                        }

                        fieldStats[key].count++;
                        fieldStats[key].categories.add(material.category);

                        // Keep first 3 sample values
                        if (fieldStats[key].sampleValues.length < 3) {
                            fieldStats[key].sampleValues.push(material.specifications[key]);
                        }
                    }
                });
            }
        });

        // Convert to array format
        const stats = Object.keys(fieldStats).map(field => ({
            field,
            usageCount: fieldStats[field].count,
            usagePercentage: ((fieldStats[field].count / totalMaterials) * 100).toFixed(1),
            categories: Array.from(fieldStats[field].categories),
            sampleValues: fieldStats[field].sampleValues
        })).sort((a, b) => b.usageCount - a.usageCount);

        res.status(200).json({
            success: true,
            data: {
                totalMaterials,
                fields: stats
            }
        });
    } catch (error) {
        logger.error('Error fetching specification stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching specification statistics',
            error: error.message,
        });
    }
};

/**
 * Get all unique categories from database
 * Used for dynamic sidebar menu generation
 */
exports.getAllCategories = async (req, res) => {
    try {
        const { organizationId } = req.user;

        // Get distinct categories
        const categories = await RawMaterial.distinct('category', {
            organizationId,
            isDeleted: false
        });

        // Get count for each category
        const categoriesWithCount = await Promise.all(
            categories.map(async (category) => {
                const count = await RawMaterial.countDocuments({
                    organizationId,
                    category,
                    isDeleted: false
                });
                return { category, count };
            })
        );

        // Sort by count descending
        categoriesWithCount.sort((a, b) => b.count - a.count);

        logger.info(`Found ${categories.length} unique categories`);

        res.status(200).json({
            success: true,
            data: {
                categories: categoriesWithCount,
                total: categories.length
            }
        });
    } catch (error) {
        logger.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching categories',
            error: error.message,
        });
    }
};
