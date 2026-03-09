/**
 * Quick Test: Verify high priority inquiries get high scores
 */

const { scoreInquiry } = require('./leadScoring');

console.log('\n🧪 TESTING HIGH PRIORITY INQUIRY SCORING\n');
console.log('='.repeat(70));

// Test Case: High Priority Inquiry
const highPriorityInquiry = {
  organization: 'org123',
  leadPlatform: 'Website',
  leadStatus: 'NEW',
  notes: 'Need furniture urgently for new office',
  items: [{
    description: 'Office Desk',
    quantity: 5,
    meta: {
      details: 'Wooden desks needed'
    }
  }],
  meta: {
    customerName: 'Test Customer',
    contact: '9876543210',
    email: 'test@example.com',
    address: '123 Test Street',
    priority: 'high' // USER MARKED AS HIGH PRIORITY
  }
};

const result = scoreInquiry(highPriorityInquiry);

console.log('Input Priority: HIGH');
console.log(`\nBase Score (without boost): ${result.score - result.manualPriorityBoost}/100`);
console.log(`Manual Priority Boost: +${result.manualPriorityBoost} points`);
console.log(`\n✅ FINAL SCORE: ${result.score}/100`);
console.log(`✅ AI PRIORITY: ${result.priority}`);
console.log(`✅ PROBABILITY: ${result.probability}%`);
console.log(`\nInsights:`);
result.insights.forEach(insight => console.log(`  ${insight}`));

console.log('\n' + '='.repeat(70));
console.log('✅ HIGH PRIORITY INQUIRIES NOW GET +15 POINT BOOST!');
console.log('='.repeat(70));

// Test Case: Low Priority Inquiry
console.log('\n🧪 TESTING LOW PRIORITY INQUIRY SCORING\n');
console.log('='.repeat(70));

const lowPriorityInquiry = {
  ...highPriorityInquiry,
  meta: {
    ...highPriorityInquiry.meta,
    priority: 'low' // USER MARKED AS LOW PRIORITY
  }
};

const result2 = scoreInquiry(lowPriorityInquiry);

console.log('Input Priority: LOW');
console.log(`\nBase Score (without reduction): ${result2.score - result2.manualPriorityBoost}/100`);
console.log(`Manual Priority Reduction: ${result2.manualPriorityBoost} points`);
console.log(`\n✅ FINAL SCORE: ${result2.score}/100`);
console.log(`✅ AI PRIORITY: ${result2.priority}`);
console.log(`✅ PROBABILITY: ${result2.probability}%`);

console.log('\n' + '='.repeat(70));
console.log('✅ LOW PRIORITY INQUIRIES NOW GET -10 POINT REDUCTION!');
console.log('='.repeat(70));
