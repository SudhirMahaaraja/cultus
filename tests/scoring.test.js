// Pure-Function Tests for Filters, Freshness and Composite Scoring
const assert = require('assert');

const FORMAL_BLOCKLIST = ['tshirt', 'joggers', 'shorts', 'sneaker', 'sandal'];
const WEIGHTS = {
  colorHarmony: 0.25,
  formalityMatch: 0.20,
  presentationAppeal: 0.15,
  proportion: 0.10,
  texturePattern: 0.10,
  climate: 0.10,
  officeFit: 0.10,
};

function isFormalCompliant(item) {
  if (item.formal_meeting_suitability < 0.6) return false;
  if (item.style === 'casual_only') return false;
  if (FORMAL_BLOCKLIST.includes(item.garment_type)) return false;
  return true;
}

function computeFreshnessScore(daysSinceWorn, pairCount60d) {
  const freshnessDaysNormalized = Math.min(1, daysSinceWorn / 30);
  const pairPenalty = Math.max(0, 1 - pairCount60d * 0.25);
  return 0.6 * freshnessDaysNormalized + 0.4 * pairPenalty;
}

function computeCompositeScore(visualScores, freshnessScore) {
  const visualScore =
    visualScores.colorHarmony * WEIGHTS.colorHarmony +
    visualScores.formalityMatch * WEIGHTS.formalityMatch +
    visualScores.presentationAppeal * WEIGHTS.presentationAppeal +
    visualScores.proportion * WEIGHTS.proportion +
    visualScores.texturePattern * WEIGHTS.texturePattern +
    visualScores.climate * WEIGHTS.climate +
    visualScores.officeFit * WEIGHTS.officeFit;

  return 0.7 * visualScore + 0.3 * freshnessScore;
}

function filterWithTinyWardrobeFallback(items, filterFn) {
  const filtered = items.filter(filterFn);
  // If strict filter leaves nothing, fallback to all active items
  return filtered.length > 0 ? filtered : items;
}

console.log('--- Running Outfit Planner Pure Function Tests ---');

// Test 1: Formal Blocklist & Casual Only Exclusion
const formalShirt = { garment_type: 'shirt', formal_meeting_suitability: 0.9, style: 'executive_formal' };
const graphicTee = { garment_type: 'tshirt', formal_meeting_suitability: 0.8, style: 'casual_only' };
const joggers = { garment_type: 'joggers', formal_meeting_suitability: 0.7, style: 'minimal_casual' };
const oxfordShoes = { garment_type: 'oxford', formal_meeting_suitability: 0.9, style: 'executive_formal' };
const sneakers = { garment_type: 'sneaker', formal_meeting_suitability: 0.8, style: 'business_casual' };

assert.strictEqual(isFormalCompliant(formalShirt), true, 'Formal shirt should pass');
assert.strictEqual(isFormalCompliant(oxfordShoes), true, 'Oxford shoes should pass');
assert.strictEqual(isFormalCompliant(graphicTee), false, 'T-shirt must be blocked in formal meeting');
assert.strictEqual(isFormalCompliant(joggers), false, 'Joggers must be blocked in formal meeting');
assert.strictEqual(isFormalCompliant(sneakers), false, 'Sneakers must be blocked in formal meeting');
console.log('✔ Test 1 Passed: Formal blocklist and casual_only exclusions validated');

// Test 2: Freshness Score Calculation
// Unworn item (60 days) with 0 prior pairs in 60d
const freshScoreMax = computeFreshnessScore(60, 0);
assert.strictEqual(freshScoreMax, 1.0, 'Never worn item should have freshness score 1.0');

// Recently worn item (1 day ago) with 4 prior pairs
const freshScoreMin = computeFreshnessScore(1, 4);
assert(freshScoreMin < 0.1, 'Frequently and recently worn item should have very low freshness');
console.log('✔ Test 2 Passed: Freshness calculation and pair frequency decay validated');

// Test 3: Composite 70/30 Scoring
const mockScores = {
  colorHarmony: 0.9,
  formalityMatch: 0.85,
  presentationAppeal: 0.9,
  proportion: 0.8,
  texturePattern: 0.85,
  climate: 0.8,
  officeFit: 0.9,
};
const compScore = computeCompositeScore(mockScores, 0.8);
assert(compScore > 0.8 && compScore < 0.9, 'Composite score should be weighted 70/30');
console.log(`✔ Test 3 Passed: 70/30 composite score validated (${(compScore * 100).toFixed(1)}%)`);

// Test 4: Tiny Wardrobe Fallback Relaxation
const tinyShoes = [sneakers]; // only sneakers exist
const selectedShoes = filterWithTinyWardrobeFallback(tinyShoes, isFormalCompliant);
assert.strictEqual(selectedShoes.length, 1, 'Should fallback to available shoes instead of returning empty');
console.log('✔ Test 4 Passed: Tiny wardrobe fallback successfully relaxes constraint');

console.log('All 4 test suites passed successfully!');
