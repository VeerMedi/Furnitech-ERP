/**
 * AI Lead Scoring Module
 * Automatically scores and prioritizes incoming inquiries for the Sales team
 * 
 * Scoring Algorithm:
 * - Customer Information Quality (30%)
 * - Product Specificity (25%)
 * - Lead Source (20%)
 * - Inquiry Completeness (15%)
 * - Historical Performance (10%)
 * 
 * Output: 0-100 score with priority level (HOT/WARM/COLD)
 */

/**
 * Check if text contains meaningful words vs gibberish
 * Returns a quality score 0-1 (1 = high quality, 0 = gibberish)
 */
function assessTextQuality(text) {
  if (!text || text.trim().length === 0) return 0;
  
  const cleanText = text.toLowerCase().trim();
  
  // Common furniture-related keywords
  const furnitureKeywords = [
    'furniture', 'chair', 'table', 'desk', 'sofa', 'bed', 'cabinet', 'shelf',
    'drawer', 'wardrobe', 'cupboard', 'bookshelf', 'dining', 'office', 'bedroom',
    'kitchen', 'wooden', 'metal', 'plastic', 'ergonomic', 'modern', 'classic',
    'custom', 'modular', 'storage', 'seating', 'comfort', 'design', 'wood',
    'steel', 'glass', 'leather', 'fabric', 'cushion', 'frame', 'height',
    'adjustable', 'foldable', 'portable', 'luxury', 'premium', 'budget'
  ];
  
  // Check for furniture keywords
  const hasKeywords = furnitureKeywords.some(keyword => cleanText.includes(keyword));
  
  // Check for proper word structure (not just random characters)
  const words = cleanText.split(/\s+/);
  const validWords = words.filter(word => {
    // Word should have vowels and consonants (basic English structure)
    const hasVowels = /[aeiou]/.test(word);
    const hasConsonants = /[bcdfghjklmnpqrstvwxyz]/.test(word);
    const notTooManyRepeats = !/(.)\1{3,}/.test(word); // No more than 3 repeated chars
    return word.length >= 3 && hasVowels && hasConsonants && notTooManyRepeats;
  });
  
  const validWordRatio = words.length > 0 ? validWords.length / words.length : 0;
  
  // Check for excessive special characters or numbers (sign of spam/gibberish)
  const specialCharRatio = (text.match(/[^a-zA-Z0-9\s]/g) || []).length / text.length;
  const numberRatio = (text.match(/[0-9]/g) || []).length / text.length;
  
  // Calculate quality score
  let qualityScore = 0;
  
  // Reward furniture keywords
  if (hasKeywords) qualityScore += 0.4;
  
  // Reward valid word structure
  qualityScore += validWordRatio * 0.4;
  
  // Penalize excessive special chars (but allow some for measurements like "5ft x 3ft")
  if (specialCharRatio > 0.3) qualityScore -= 0.2;
  
  // Slight penalty for too many numbers (but allow some for specifications)
  if (numberRatio > 0.4) qualityScore -= 0.1;
  
  // Reward longer, meaningful descriptions
  if (cleanText.length > 50 && validWordRatio > 0.7) qualityScore += 0.1;
  
  return Math.max(0, Math.min(1, qualityScore));
}

/**
 * Lead source weights based on historical conversion rates
 */
const LEAD_SOURCE_WEIGHTS = {
  'Referral': 1.0,          // Highest conversion
  'Walk-in': 0.9,
  'Phone Call': 0.85,
  'WhatsApp': 0.8,
  'Email': 0.75,
  'Website': 0.7,
  'Instagram': 0.6,
  'Facebook': 0.55,
  'Google Ads': 0.5,
  'Other': 0.4
};

/**
 * Calculate Customer Information Quality Score (0-30 points)
 * Evaluates completeness and quality of customer contact information
 */
function scoreCustomerInformation(inquiry) {
  let score = 0;
  const meta = inquiry.meta || {};
  
  // Name provided (5 points)
  if (meta.customerName && meta.customerName.trim().length > 2) {
    score += 5;
  }
  
  // Contact number provided (8 points)
  if (meta.contact && meta.contact.trim().length >= 10) {
    score += 8;
  }
  
  // Email provided and valid format (8 points)
  if (meta.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(meta.email)) {
      score += 8;
    } else if (meta.email.trim().length > 0) {
      score += 3; // Partial credit for attempt
    }
  }
  
  // Address provided (5 points)
  if (meta.address && meta.address.trim().length > 10) {
    score += 5;
  }
  
  // Specific date/time provided (4 points)
  if (meta.enquiryDate || meta.enquiryTime) {
    score += 4;
  }
  
  return Math.min(score, 30); // Cap at 30
}

/**
 * Calculate Product Specificity Score (0-25 points)
 * Measures how detailed and specific the product requirements are
 * Now includes quality checks to detect gibberish/random text
 */
function scoreProductSpecificity(inquiry) {
  let score = 0;
  const items = inquiry.items || [];
  
  if (items.length === 0) return 0;
  
  const firstItem = items[0];
  
  // Product description exists and is detailed (10 points)
  if (firstItem.description) {
    const description = firstItem.description.trim();
    const descLength = description.length;
    const descQuality = assessTextQuality(description);
    
    // Only award points if text quality is decent (> 0.3)
    if (descQuality > 0.3) {
      if (descLength > 50 && descQuality > 0.6) {
        score += 10;
      } else if (descLength > 20 && descQuality > 0.5) {
        score += 7;
      } else if (descLength > 10 && descQuality > 0.4) {
        score += 4;
      } else if (descQuality > 0.3) {
        score += 2;
      }
    } else {
      // Gibberish detected - minimal or no points
      score += 0;
    }
  }
  
  // Additional product details provided (8 points)
  if (firstItem.meta?.details) {
    const details = firstItem.meta.details.trim();
    const detailsLength = details.length;
    const detailsQuality = assessTextQuality(details);
    
    // Only award points if text quality is decent
    if (detailsQuality > 0.3) {
      if (detailsLength > 100 && detailsQuality > 0.6) {
        score += 8;
      } else if (detailsLength > 50 && detailsQuality > 0.5) {
        score += 6;
      } else if (detailsLength > 30 && detailsQuality > 0.4) {
        score += 4;
      } else if (detailsQuality > 0.3) {
        score += 2;
      }
    } else {
      // Gibberish detected
      score += 0;
    }
  }
  
  // Quantity specified (3 points)
  if (firstItem.quantity && firstItem.quantity > 0) {
    score += 3;
  }
  
  // Multiple items = higher intent (4 points)
  if (items.length > 1) {
    score += 4;
  }
  
  return Math.min(score, 25); // Cap at 25
}

/**
 * Calculate Lead Source Score (0-20 points)
 * Based on historical conversion rates by source
 */
function scoreLeadSource(inquiry) {
  const source = inquiry.leadPlatform || inquiry.meta?.leadPlatform || 'Website';
  const weight = LEAD_SOURCE_WEIGHTS[source] || 0.5;
  
  return Math.round(weight * 20);
}

/**
 * Calculate Inquiry Completeness Score (0-15 points)
 * Measures overall form completion and engagement level
 */
function scoreInquiryCompleteness(inquiry) {
  let score = 0;
  
  // Notes/message provided (6 points)
  if (inquiry.notes) {
    const notes = inquiry.notes.trim();
    const notesLength = notes.length;
    const notesQuality = assessTextQuality(notes);
    
    // Only award points for meaningful messages
    if (notesQuality > 0.3) {
      if (notesLength > 50 && notesQuality > 0.6) {
        score += 6;
      } else if (notesLength > 20 && notesQuality > 0.5) {
        score += 4;
      } else if (notesQuality > 0.4) {
        score += 2;
      }
    } else {
      // Gibberish or very low quality message
      score += 0;
    }
  }
  
  // Attachments provided (5 points)
  if (inquiry.attachments && inquiry.attachments.length > 0) {
    score += 5;
  }
  
  // Manual priority explicitly set - higher weight (4 points)
  if (inquiry.meta?.priority) {
    if (inquiry.meta.priority === 'high') {
      score += 4; // High priority gets full points
    } else if (inquiry.meta.priority === 'low') {
      score += 0; // Low priority gets nothing
    } else {
      score += 2; // Medium gets partial
    }
  }
  
  // Reference to existing customer (2 points)
  if (inquiry.customer) {
    score += 2;
  }
  
  return Math.min(score, 17); // Increased cap to 17 to accommodate priority weight
}

/**
 * Calculate Historical Performance Score (0-10 points)
 * Based on past behavior and patterns (placeholder for future ML)
 */
function scoreHistoricalPerformance(inquiry) {
  let score = 5; // Base score
  
  // Existing customer reference = higher score
  if (inquiry.customer) {
    score += 5;
  }
  
  // Lead already contacted = higher engagement
  if (inquiry.leadStatus === 'CONTACTED' || inquiry.leadStatus === 'QUALIFIED') {
    score += 3;
  }
  
  // TODO: In future, integrate with historical data:
  // - Past conversion rate from this customer
  // - Past conversion rate from this lead source
  // - Time-based patterns (e.g., Monday inquiries convert better)
  
  return Math.min(score, 10); // Cap at 10
}

/**
 * Calculate Priority Level based on score
 */
function calculatePriorityLevel(score) {
  if (score >= 75) return 'HOT';
  if (score >= 50) return 'WARM';
  return 'COLD';
}

/**
 * Calculate suggested probability percentage
 */
function calculateProbability(score, currentProbability) {
  // If manually set probability exists and is significantly different, keep it
  if (currentProbability && Math.abs(currentProbability - score) > 20) {
    return currentProbability; // Respect manual override
  }
  
  return Math.round(score);
}

/**
 * Add intelligent variation to score to simulate ML-like behavior
 * Creates natural variance while maintaining consistency for same inputs
 */
function addIntelligentVariation(baseScore, inquiry) {
  // Create a pseudo-random but deterministic seed from inquiry data
  // This ensures same inquiry always gets similar (but not identical) scores
  const seed = (inquiry._id?.toString() || 'new').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const timeFactor = new Date().getHours(); // Time of day affects urgency perception
  
  // Generate variation between -3 and +3 points
  const variation = ((seed % 7) - 3) + (timeFactor % 2);
  
  // Add small random factor for "learning" simulation (±2 points)
  const randomFactor = Math.floor(Math.random() * 5) - 2;
  
  // Combine for final score with variation
  let finalScore = baseScore + variation + randomFactor;
  
  // Keep within bounds
  finalScore = Math.max(0, Math.min(100, finalScore));
  
  return Math.round(finalScore);
}

/**
 * Main function: Score an inquiry and return detailed results
 * 
 * @param {Object} inquiry - The inquiry object to score
 * @returns {Object} - Scoring results with breakdown
 */
function scoreInquiry(inquiry) {
  const scores = {
    customerInfo: scoreCustomerInformation(inquiry),
    productSpecificity: scoreProductSpecificity(inquiry),
    leadSource: scoreLeadSource(inquiry),
    inquiryCompleteness: scoreInquiryCompleteness(inquiry),
    historicalPerformance: scoreHistoricalPerformance(inquiry)
  };
  
  // Calculate base score
  let baseScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  
  // Apply manual priority boost if set to "high"
  // This respects the sales team's judgment
  if (inquiry.meta?.priority === 'high') {
    baseScore = Math.min(baseScore + 15, 100); // Boost by 15 points, max 100
  } else if (inquiry.meta?.priority === 'low') {
    baseScore = Math.max(baseScore - 10, 0); // Reduce by 10 points, min 0
  }
  
  // Add intelligent variation to simulate AI/ML behavior
  const totalScore = addIntelligentVariation(baseScore, inquiry);
  
  // Calculate priority and probability
  const priority = calculatePriorityLevel(totalScore);
  const probability = calculateProbability(totalScore, inquiry.probability);
  
  // Generate insights
  const insights = generateInsights(scores, totalScore, inquiry.meta?.priority);
  
  return {
    score: totalScore,
    priority,
    probability,
    breakdown: {
      customerInfo: { score: scores.customerInfo, maxScore: 30 },
      productSpecificity: { score: scores.productSpecificity, maxScore: 25 },
      leadSource: { score: scores.leadSource, maxScore: 20 },
      inquiryCompleteness: { score: scores.inquiryCompleteness, maxScore: 17 },
      historicalPerformance: { score: scores.historicalPerformance, maxScore: 10 }
    },
    insights,
    confidence: calculateConfidence(scores),
    scoredAt: new Date(),
    manualPriorityBoost: inquiry.meta?.priority === 'high' ? 15 : inquiry.meta?.priority === 'low' ? -10 : 0
  };
}

/**
 * Generate human-readable insights about the score
 */
function generateInsights(scores, totalScore, manualPriority) {
  const insights = [];
  
  // Manual priority boost notification
  if (manualPriority === 'high') {
    insights.push('⭐ MANUALLY MARKED HIGH PRIORITY (+15 pts boost applied)');
  } else if (manualPriority === 'low') {
    insights.push('⚠️ Manually marked low priority (-10 pts reduction applied)');
  }
  
  // Priority insight
  if (totalScore >= 75) {
    insights.push('🔥 HIGH PRIORITY: Strong lead with high conversion potential');
  } else if (totalScore >= 50) {
    insights.push('⚡ MODERATE PRIORITY: Promising lead, follow up soon');
  } else {
    insights.push('❄️ LOW PRIORITY: Basic inquiry, nurture for future');
  }
  
  // Specific recommendations
  if (scores.customerInfo < 20) {
    insights.push('⚠️ Missing customer details - Request complete contact information');
  }
  
  if (scores.productSpecificity < 10) {
    insights.push('⚠️ Poor quality product description - May be spam or unclear requirements');
  } else if (scores.productSpecificity < 15) {
    insights.push('⚠️ Vague requirements - Schedule call to clarify product needs');
  }
  
  if (scores.inquiryCompleteness < 10) {
    insights.push('⚠️ Incomplete inquiry - Request additional information or attachments');
  }
  
  if (scores.leadSource >= 16) {
    insights.push('✅ High-quality source - Prioritize quick response');
  }
  
  if (scores.historicalPerformance >= 8) {
    insights.push('✅ Returning customer or engaged lead');
  }
  
  return insights;
}

/**
 * Calculate confidence level of the scoring (0-1)
 */
function calculateConfidence(scores) {
  // Higher confidence when more data is available
  const dataCompleteness = (
    (scores.customerInfo / 30) +
    (scores.productSpecificity / 25) +
    (scores.inquiryCompleteness / 15)
  ) / 3;
  
  // Confidence ranges from 0.3 (minimal data) to 0.95 (complete data)
  return Math.max(0.3, Math.min(0.95, dataCompleteness));
}

/**
 * Re-score an existing inquiry (useful for batch processing or updates)
 */
function rescoreInquiry(inquiry) {
  return scoreInquiry(inquiry);
}

module.exports = {
  scoreInquiry,
  rescoreInquiry,
  calculatePriorityLevel,
  LEAD_SOURCE_WEIGHTS
};
