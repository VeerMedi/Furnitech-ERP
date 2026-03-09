const RawMaterial = require('../models/vlite/RawMaterial');
const logger = require('../utils/logger');

/**
 * Get last import batch information
 */
exports.getLastImport = async (req, res) => {
    try {
        const { organizationId } = req.user;

        // Find the most recent import
        const lastImport = await RawMaterial.findOne({
            organizationId,
            importBatchId: { $exists: true },
            isDeleted: false
        }).sort({ importedAt: -1 }).lean();

        if (!lastImport) {
            return res.status(404).json({
                success: false,
                message: 'No imports found'
            });
        }

        // Count materials in this batch
        const count = await RawMaterial.countDocuments({
            organizationId,
            importBatchId: lastImport.importBatchId,
            isDeleted: false
        });

        res.status(200).json({
            success: true,
            data: {
                batchId: lastImport.importBatchId,
                importedAt: lastImport.importedAt,
                count
            }
        });
    } catch (error) {
        logger.error('Error fetching last import:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching last import',
            error: error.message,
        });
    }
};

/**
 * Undo/Delete last import batch
 */
exports.undoLastImport = async (req, res) => {
    try {
        const { organizationId } = req.user;

        // Find the most recent import
        const lastImport = await RawMaterial.findOne({
            organizationId,
            importBatchId: { $exists: true },
            isDeleted: false
        }).sort({ importedAt: -1 }).lean();

        if (!lastImport) {
            return res.status(404).json({
                success: false,
                message: 'No imports found to undo'
            });
        }

        const batchId = lastImport.importBatchId;

        // Delete all materials from this batch
        const result = await RawMaterial.deleteMany({
            organizationId,
            importBatchId: batchId
        });

        logger.info(`Deleted ${result.deletedCount} materials from batch ${batchId}`);

        res.status(200).json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} materials from last import`,
            data: {
                batchId,
                deletedCount: result.deletedCount,
                importedAt: lastImport.importedAt
            }
        });
    } catch (error) {
        logger.error('Error undoing last import:', error);
        res.status(500).json({
            success: false,
            message: 'Error undoing last import',
            error: error.message,
        });
    }
};
