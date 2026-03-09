/**
 * Test POC login
 * Run: node scripts/testPocLogin.js
 */

require('dotenv').config();
const axios = require('axios');

const testLogin = async () => {
    try {
        console.log('🔐 Testing POC user login...\n');

        const response = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'poc@vlite.com',
            password: 'poc@123',
            organizationId: '6935417d57433de522df0bbe'
        });

        console.log('✅ Login SUCCESSFUL!\n');
        console.log('📋 Response:');
        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('❌ Login FAILED!\n');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
};

testLogin();
