// Unit Tests for Outfit Planner Scoring, Filtering, and Repeat Rules
// Directly imports the production module in supabase/functions/_shared/scoring.ts
import assert from 'node:assert';
import {
  VISUAL_WEIGHTS,
  FORMAL_BLOCKLIST,
  computeVisualScore,
  computeFreshnessScore,
  computeCompositeScore,
  isFormalCompliant,
  getRecentOfficeDayCombos,
  processAIRankings,
} from '../supabase/functions/_shared/scoring.ts';

console.log('--- Running Outfit Planner Production Scoring Engine Tests ---');

// Test 1: Formal Blocklist & Casual Only Exclusions
const formalShirt = { garment_type: 'shirt', formal_meeting_suitability: 0.9, style: 'executive_formal' };
const graphicTee = { garment_type: 'tshirt', formal_meeting_suitability: 0.8, style: 'business_casual' };
const joggers = { garment_type: 'joggers', formal_meeting_suitability: 0.7, style: 'minimal_casual' };
const shorts = { garment_type: 'shorts', formal_meeting_suitability: 0.7, style: 'minimal_casual' };
const sneakers = { garment_type: 'sneaker', formal_meeting_suitability: 0.85, style: 'business_casual' };
const sandals = { garment_type: 'sandal', formal_meeting_suitability: 0.7, style: 'minimal_casual' };
const casualOnlyOxfords = { garment_type: 'oxford', formal_meeting_suitability: 0.85, style: 'casual_only' };
const validOxford = { garment_type: 'oxford', formal_meeting_suitability: 0.9, style: 'executive_formal' };

assert.strictEqual(isFormalCompliant(formalShirt), true, 'Formal shirt should pass');
assert.strictEqual(isFormalCompliant(validOxford), true, 'Valid oxford should pass');
assert.strictEqual(isFormalCompliant(graphicTee), false, 'T-shirt must be blocked in formal meeting');
assert.strictEqual(isFormalCompliant(joggers), false, 'Joggers must be blocked in formal meeting');
assert.strictEqual(isFormalCompliant(shorts), false, 'Shorts must be blocked in formal meeting');
assert.strictEqual(isFormalCompliant(sneakers), false, 'Sneakers must be blocked in formal meeting');
assert.strictEqual(isFormalCompliant(sandals), false, 'Sandals must be blocked in formal meeting');
assert.strictEqual(isFormalCompliant(casualOnlyOxfords), false, 'casual_only items must be blocked in formal meeting');
console.log('✔ Test 1 Passed: Formal blocklist (tshirt, joggers, shorts, sneaker, sandal) and casual_only exclusions validated');

// Test 2: Exact Visual Sub-Score Weights
const weightSum =
  VISUAL_WEIGHTS.colorHarmony +
  VISUAL_WEIGHTS.formalityMatch +
  VISUAL_WEIGHTS.presentationAppeal +
  VISUAL_WEIGHTS.proportionSilhouette +
  VISUAL_WEIGHTS.texturePatternHarmony +
  VISUAL_WEIGHTS.climatePracticality +
  VISUAL_WEIGHTS.officeAppropriateness;

assert.strictEqual(Math.round(weightSum * 100) / 100, 1.0, 'Visual weights must sum exactly to 1.0');
assert.strictEqual(VISUAL_WEIGHTS.colorHarmony, 0.25, 'colorHarmony weight must be 0.25');
assert.strictEqual(VISUAL_WEIGHTS.formalityMatch, 0.20, 'formalityMatch weight must be 0.20');
assert.strictEqual(VISUAL_WEIGHTS.presentationAppeal, 0.15, 'presentationAppeal weight must be 0.15');
assert.strictEqual(VISUAL_WEIGHTS.proportionSilhouette, 0.10, 'proportionSilhouette weight must be 0.10');
assert.strictEqual(VISUAL_WEIGHTS.texturePatternHarmony, 0.10, 'texturePatternHarmony weight must be 0.10');
assert.strictEqual(VISUAL_WEIGHTS.climatePracticality, 0.10, 'climatePracticality weight must be 0.10');
assert.strictEqual(VISUAL_WEIGHTS.officeAppropriateness, 0.10, 'officeAppropriateness weight must be 0.10');

// Test weighted score calculation
const sampleSubscores = {
  colorHarmony: 1.0,
  formalityMatch: 0.5,
  presentationAppeal: 0.8,
  proportionSilhouette: 0.7,
  texturePatternHarmony: 0.6,
  climatePracticality: 0.9,
  officeAppropriateness: 0.8,
};
const computedVisual = computeVisualScore(sampleSubscores);
assert.strictEqual(Math.round(computedVisual * 100) / 100, 0.77, 'Weighted visual score calculation must match exact formula');
console.log('✔ Test 2 Passed: 7 visual sub-score weights and linear computation validated');

// Test 3: Freshness Calculation & 70/30 Composite Score
const freshUnworn = computeFreshnessScore(60, 0);
assert.strictEqual(freshUnworn, 1.0, '60 days unworn item with 0 pairs must have freshness 1.0');

const freshRecentWorn = computeFreshnessScore(1, 4);
assert(freshRecentWorn < 0.1, 'Frequently worn item must have low freshness score');

const compScore = computeCompositeScore(0.80, 0.90);
assert.strictEqual(Math.round(compScore * 100) / 100, 0.83, 'Composite score must be 70% visual and 30% freshness');
console.log('✔ Test 3 Passed: Freshness score and 70/30 composite score formula validated');

// Test 4: Missing-Candidate and Reject Exclusion
const mockCandidates = [
  { id: 'shirt1_bottom1_shoes1', top: { id: 's1' }, bottom: { id: 'b1' }, shoes: { id: 'sh1' }, freshnessScore: 0.9 },
  { id: 'shirt2_bottom2_shoes2', top: { id: 's2' }, bottom: { id: 'b2' }, shoes: { id: 'sh2' }, freshnessScore: 0.8 },
  { id: 'shirt3_bottom3_shoes3', top: { id: 's3' }, bottom: { id: 'b3' }, shoes: { id: 'sh3' }, freshnessScore: 0.7 },
];

const mockAiOutputs = [
  {
    candidateId: 'cand_0',
    colorHarmony: 0.9,
    formalityMatch: 0.9,
    presentationAppeal: 0.9,
    proportionSilhouette: 0.8,
    texturePatternHarmony: 0.8,
    climatePracticality: 0.8,
    officeAppropriateness: 0.9,
    recommendationStatus: 'recommended',
    rationale: 'Clean office look',
    howToWear: ['Tuck in shirt'],
    issues: [],
  },
  {
    candidateId: 'cand_1',
    colorHarmony: 0.3,
    formalityMatch: 0.2,
    presentationAppeal: 0.3,
    proportionSilhouette: 0.4,
    texturePatternHarmony: 0.3,
    climatePracticality: 0.5,
    officeAppropriateness: 0.2,
    recommendationStatus: 'reject',
    rationale: 'Clashing colors',
    howToWear: [],
    issues: ['Incompatible colors'],
  },
];

const processed = processAIRankings(mockCandidates, mockAiOutputs);
assert.strictEqual(processed.missingCount, 1, 'Should flag exactly 1 missing candidate');
assert.strictEqual(processed.rankedOutfits.length, 1, 'Should keep only the non-rejected, non-missing candidate');
assert.strictEqual(processed.rankedOutfits[0].id, 'shirt1_bottom1_shoes1', 'Ranked outfit should be cand_0');
assert.strictEqual(processed.rankedOutfits[0].recommendation_status, 'recommended');
console.log('✔ Test 4 Passed: Missing candidates and rejected candidates excluded correctly');

// Test 5: Repeat Rule: Last 5 Confirmed Office Days (Not 5 Calendar Days)
const mockOfficeDays = [
  { date: '2026-09-30', is_office_day: true, confirmed_outfit_id: 'outfit_1', outfit: { shirt_id: 's1', bottom_id: 'b1', footwear_id: 'sh1' } },
  { date: '2026-09-29', is_office_day: false, confirmed_outfit_id: 'outfit_weekend', outfit: { shirt_id: 's_w', bottom_id: 'b_w', footwear_id: 'sh_w' } },
  { date: '2026-09-28', is_office_day: true, confirmed_outfit_id: 'outfit_2', outfit: { shirt_id: 's2', bottom_id: 'b2', footwear_id: 'sh2' } },
  { date: '2026-09-27', is_office_day: true, confirmed_outfit_id: 'outfit_3', outfit: { shirt_id: 's3', bottom_id: 'b3', footwear_id: 'sh3' } },
  { date: '2026-09-26', is_office_day: true, confirmed_outfit_id: null, outfit: null },
  { date: '2026-09-25', is_office_day: true, confirmed_outfit_id: 'outfit_4', outfit: { shirt_id: 's4', bottom_id: 'b4', footwear_id: 'sh4' } },
  { date: '2026-09-24', is_office_day: true, confirmed_outfit_id: 'outfit_5', outfit: { shirt_id: 's5', bottom_id: 'b5', footwear_id: 'sh5' } },
  { date: '2026-09-23', is_office_day: true, confirmed_outfit_id: 'outfit_6', outfit: { shirt_id: 's6', bottom_id: 'b6', footwear_id: 'sh6' } },
];

const blockedCombos = getRecentOfficeDayCombos(mockOfficeDays, 5);

assert.strictEqual(blockedCombos.has('s1_b1_sh1'), true, 'Day 1 office outfit must be blocked');
assert.strictEqual(blockedCombos.has('s2_b2_sh2'), true, 'Day 2 office outfit must be blocked');
assert.strictEqual(blockedCombos.has('s3_b3_sh3'), true, 'Day 3 office outfit must be blocked');
assert.strictEqual(blockedCombos.has('s4_b4_sh4'), true, 'Day 4 office outfit must be blocked');
assert.strictEqual(blockedCombos.has('s5_b5_sh5'), true, 'Day 5 office outfit must be blocked');
assert.strictEqual(blockedCombos.has('s_w_b_w_sh_w'), false, 'Non-office day outfit must NOT be counted as an office day');
assert.strictEqual(blockedCombos.has('s6_b6_sh6'), false, '6th office day ago must NOT be blocked (outside 5-day window)');
console.log('✔ Test 5 Passed: Repeat rule correctly counts the last 5 confirmed office_days rows, ignoring non-office days and unconfirmed days');

console.log('\n--- All 5 production scoring & repeat rule test suites passed successfully! ---');
