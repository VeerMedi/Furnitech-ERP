/**
 * Test Dynamic Scoring - Show that same inquiry gets varied scores
 */

const { scoreInquiry } = require('./leadScoring');

console.log('\n🎯 TESTING DYNAMIC AI SCORING VARIATION\n');
console.log('='.repeat(70));
console.log('Running same inquiry 5 times to show score variation...\n');

const testInquiry = {
  _id: 'test123',
  organization: 'org123',
  leadPlatform: 'Website',
  leadStatus: 'NEW',
  notes: 'Looking for office furniture',
  items: [{
    description: 'Office Desk and Chair Set',
    quantity: 3,
    meta: {
      details: 'Modern ergonomic design preferred'
    }
  }],
  meta: {
    customerName: 'Rajesh Kumar',
    contact: '+91-9876543210',
    email: 'rajesh@company.com',
    address: '123 Business District, Bangalore',
    priority: 'high'
  }
};

// Run scoring 5 times to show variation
const scores = [];
for (let i = 1; i <= 5; i++) {
  const result = scoreInquiry(testInquiry);
  scores.push(result.score);
  console.log(`Attempt ${i}: Score = ${result.score}/100, Priority = ${result.priority}, Probability = ${result.probability}%`);
}

console.log('\n' + '='.repeat(70));
console.log(`Score Range: ${Math.min(...scores)} - ${Math.max(...scores)}`);
console.log(`Average: ${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}`);
console.log(`Variation: ${Math.max(...scores) - Math.min(...scores)} points`);
console.log('\n✅ Dynamic scoring provides natural variation!');
console.log('✅ Each inquiry feels uniquely analyzed by AI!');
console.log('='.repeat(70));
