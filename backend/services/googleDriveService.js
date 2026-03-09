const { google } = require('googleapis');
const stream = require('stream');
const path = require('path');

class GoogleDriveService {
    constructor() {
        this.drive = null;
        this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Use OAuth 2.0 instead of Service Account
            const { OAuth2 } = google.auth;
            const oauth2Client = new OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
            );

            // Set the refresh token
            oauth2Client.setCredentials({
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN
            });

            this.drive = google.drive({ version: 'v3', auth: oauth2Client });
            this.initialized = true;
            console.log('✅ Google Drive Service initialized (OAuth 2.0 Mode)');
        } catch (error) {
            console.error('❌ Failed to initialize Google Drive Service:', error.message);
            throw error;
        }
    }

    /**
     * Upload a file to Google Drive
     * @param {Buffer} fileBuffer - The file content buffer
     * @param {string} fileName - The name of the file
     * @param {string} mimeType - The MIME type of the file
     * @returns {Promise<string>} - The web view link (URL) of the uploaded file
     */
    async uploadFile(fileBuffer, fileName, mimeType) {
        await this.initialize();

        if (!this.folderId) {
            throw new Error('GOOGLE_DRIVE_FOLDER_ID is not defined in environment variables');
        }

        try {
            console.log(`📤 Uploading to Drive: ${fileName}`);

            // Convert buffer to stream
            const bufferStream = new stream.PassThrough();
            bufferStream.end(fileBuffer);

            const fileMetadata = {
                name: fileName,
                parents: [this.folderId]
            };

            const media = {
                mimeType: mimeType,
                body: bufferStream
            };

            const response = await this.drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id, webViewLink, webContentLink',
                supportsAllDrives: true
            });

            const fileId = response.data.id;
            console.log(`✅ Uploaded to Drive. ID: ${fileId}`);

            // Make the file readable by anyone with the link
            await this.drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone'
                },
                supportsAllDrives: true
            });

            return response.data.webViewLink;

        } catch (error) {
            console.error('❌ Google Drive Upload Error:', error);
            throw new Error(`Failed to upload to Google Drive: ${error.message}`);
        }
    }
}

module.exports = new GoogleDriveService();
