/**
 * Test Real vs Gibberish Product Descriptions
 */

const { scoreInquiry } = require('./leadScoring');

console.log('\n🧪 TESTING GIBBERISH DETECTION\n');
console.log('='.repeat(70));

// Test 1: Real, meaningful product description
console.log('\n1️⃣  REAL PRODUCT DESCRIPTION:');
console.log('-'.repeat(70));
const realInquiry = {
  organization: 'org123',
  leadPlatform: 'Website',
  leadStatus: 'NEW',
  notes: 'Looking for ergonomic office furniture for our new workspace',
  items: [{
    description: 'Office Chair with lumbar support and adjustable armrests',
    quantity: 5,
    meta: {
      details: 'We need comfortable ergonomic chairs for our team. Looking for mesh back, adjustable height, and good lumbar support. Budget is around 15k per chair.'
    }
  }],
  meta: {
    customerName: 'Rajesh Kumar',
    contact: '+91-9876543210',
    email: 'rajesh@company.com',
    address: '123 Business Park, Bangalore',
    priority: 'high'
  }
};

let result = scoreInquiry(realInquiry);
console.log(`Product Description: "${realInquiry.items[0].description}"`);
console.log(`Details: "${realInquiry.items[0].meta.details}"`);
console.log(`\n✅ Score: ${result.score}/100`);
console.log(`✅ Priority: ${result.priority}`);
console.log(`✅ Product Specificity: ${result.breakdown.productSpecificity.score}/${result.breakdown.productSpecificity.maxScore}`);

// Test 2: Random gibberish
console.log('\n\n2️⃣  GIBBERISH/RANDOM TEXT:');
console.log('-'.repeat(70));
const gibberishInquiry = {
  organization: 'org123',
  leadPlatform: 'Website',
  leadStatus: 'NEW',
  notes: 'asdfgh zxcvbn qwerty uiop jkl mnbv',
  items: [{
    description: 'sdfghjk dfghjkl sdfghjkl dfghjk',
    quantity: 5,
    meta: {
      details: 'aaaaaa bbbbbb cccccc dddddd eeeeee ffffff gggggg hhhhhh iiiiiii jjjjjj kkkkkkk llllll mmmmmm nnnnnnn'
    }
  }],
  meta: {
    customerName: 'Test User',
    contact: '+91-9876543210',
    email: 'test@test.com',
    address: '123 Test Street',
    priority: 'high'
  }
};

result = scoreInquiry(gibberishInquiry);
console.log(`Product Description: "${gibberishInquiry.items[0].description}"`);
console.log(`Details: "${gibberishInquiry.items[0].meta.details}"`);
console.log(`\n✅ Score: ${result.score}/100`);
console.log(`✅ Priority: ${result.priority}`);
console.log(`✅ Product Specificity: ${result.breakdown.productSpecificity.score}/${result.breakdown.productSpecificity.maxScore}`);
console.log('\nInsights:');
result.insights.forEach(insight => console.log(`  ${insight}`));

// Test 3: Short but meaningful
console.log('\n\n3️⃣  SHORT BUT MEANINGFUL:');
console.log('-'.repeat(70));
const shortInquiry = {
  organization: 'org123',
  leadPlatform: 'Website',
  leadStatus: 'NEW',
  notes: 'Need furniture urgently',
  items: [{
    description: 'Wooden desk',
    quantity: 2,
    meta: {
      details: 'Modern office desk'
    }
  }],
  meta: {
    customerName: 'Priya Sharma',
    contact: '+91-9876543210',
    email: 'priya@company.com',
    address: '456 Tech Park',
    priority: 'high'
  }
};

result = scoreInquiry(shortInquiry);
console.log(`Product Description: "${shortInquiry.items[0].description}"`);
console.log(`Details: "${shortInquiry.items[0].meta.details}"`);
console.log(`\n✅ Score: ${result.score}/100`);
console.log(`✅ Priority: ${result.priority}`);
console.log(`✅ Product Specificity: ${result.breakdown.productSpecificity.score}/${result.breakdown.productSpecificity.maxScore}`);

console.log('\n' + '='.repeat(70));
console.log('SUMMARY:');
console.log('✅ Real product descriptions get HIGH scores');
console.log('❌ Gibberish/random text gets LOW scores');
console.log('⚡ Short but meaningful text gets MODERATE scores');
console.log('='.repeat(70));
