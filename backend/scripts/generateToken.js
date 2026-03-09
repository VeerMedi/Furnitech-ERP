const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const opener = require('open'); // Might need to install this or manually open

const CLIENT_ID = '615746765891-otrts39aoqc956f8ulfpta64dl9c5440.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:6001/oauth2callback';

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

const scopes = [
    'https://www.googleapis.com/auth/drive.file'
];

const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/oauth2callback')) {
        const qs = new url.URL(req.url, 'http://localhost:6001').searchParams;
        const code = qs.get('code');

        res.end('Authentication successful! Please return to the console.');
        server.close();

        const { tokens } = await oauth2Client.getToken(code);
        console.log('\n✅ REFRESH TOKEN RECEIVED:');
        console.log(tokens.refresh_token);
        console.log('\n⚠️  Copy this Refresh Token and wait for instructions.');
    }
});

server.listen(6001, () => {
    const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent' // Forces refresh token generation
    });

    console.log('📢 Opening browser for authentication...');
    console.log('If it does not open, click here:', authorizeUrl);

    // Try to open automatically, catch if 'open' module is missing
    try {
        require('open')(authorizeUrl);
    } catch (e) {
        // ignore
    }
});
