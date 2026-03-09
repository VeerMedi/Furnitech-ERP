require('dotenv').config();
const axios = require('axios');

async function testQuotationsAPI() {
  try {
    console.log('\n🧪 Testing Quotations API...\n');
    
    // Step 1: Login
    console.log('1️⃣ Logging in as jasleen@vlite.com...');
    const loginRes = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'jasleen@vlite.com',
      password: 'krishna@123'
    });
    
    const token = loginRes.data.token;
    const user = loginRes.data.user;
    console.log(`   ✓ Logged in as: ${user.firstName} ${user.lastName}`);
    console.log(`   ✓ Organization: ${user.organizationName || user.organization}`);
    console.log(`   ✓ Token: ${token.substring(0, 30)}...`);
    
    // Step 2: Get quotations
    console.log('\n2️⃣ Fetching quotations...');
    const quotRes = await axios.get('http://localhost:5001/api/quotations', {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`   ✓ Status: ${quotRes.status}`);
    console.log(`   ✓ Response:`, JSON.stringify(quotRes.data, null, 2));
    
    if (quotRes.data.data && quotRes.data.data.length > 0) {
      console.log(`\n   📋 Found ${quotRes.data.data.length} quotations:`);
      quotRes.data.data.forEach((q, i) => {
        console.log(`      ${i + 1}. ${q.quotationNumber} - ${q.customer?.companyName || q.customer?.tradeName} - ${q.approvalStatus}`);
      });
    } else {
      console.log('\n   ⚠️  No quotations found!');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err.response?.data || err.message);
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Headers:', err.response.headers);
    }
    process.exit(1);
  }
}

testQuotationsAPI();
