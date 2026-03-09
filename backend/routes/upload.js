const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const googleDriveService = require('../services/googleDriveService');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

router.post('/', authenticate, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const file = req.file;
        const url = await googleDriveService.uploadFile(file.buffer, file.originalname, file.mimetype);

        res.status(200).json({
            success: true,
            url: url,
            name: file.originalname,
            type: file.mimetype
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'File upload failed', error: error.message });
    }
});

module.exports = router;
