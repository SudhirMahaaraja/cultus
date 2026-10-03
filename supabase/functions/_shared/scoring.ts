// Shared Scoring, Freshness and Context Filtering Engine
// Aligned with Cultus Modern Sartorial Vision specification

export const VISUAL_WEIGHTS = {
  colorHarmony: 0.25,
  formalityMatch: 0.20,
  presentationAppeal: 0.15,
  proportionSilhouette: 0.10,
  texturePatternHarmony: 0.10,
  climatePracticality: 0.10,
  officeAppropriateness: 0.10,
} as const;

export const FORMAL_BLOCKLIST = [
  'tshirt',
  'joggers',
  'shorts',
  'sneaker',
  'sandal',
] as const;

export interface VisualSubScores {
  colorHarmony: number;
  formalityMatch: number;
  presentationAppeal: number;
  proportionSilhouette: number;
  texturePatternHarmony: number;
  climatePracticality: number;
  officeAppropriateness: number;
}

export interface CandidateItem {
  id: string;
  category: string;
  garment_type: string;
  style?: string;
  office_suitability?: number;
  formal_meeting_suitability?: number;
  climate_practicality?: number;
  last_worn_at?: string;
  [key: string]: any;
}

export interface CandidateTriple {
  id: string; // shirtId_bottomId_shoesId
  top: CandidateItem;
  bottom: CandidateItem;
  shoes: CandidateItem;
  freshnessScore: number;
}

export interface AIRankingItem {
  candidateId: string;
  colorHarmony: number;
  formalityMatch: number;
  presentationAppeal: number;
  proportionSilhouette: number;
  texturePatternHarmony: number;
  climatePracticality: number;
  officeAppropriateness: number;
  recommendationStatus: 'recommended' | 'acceptable' | 'reject';
  rationale: string;
  howToWear: string[];
  issues?: string[];
}

export interface FinalRankedOutfit extends CandidateTriple {
  ai_score: number;
  visual_score: number;
  freshness_score: number;
  recommendation_status: string;
  ai_reason: string;
  ai_tips: string[];
  issues: string[];
  shirt_id: string;
  bottom_id: string;
  footwear_id: string;
}

/**
 * Calculates visual score as the weighted sum of 7 sub-scores (0.0 to 1.0)
 */
export function computeVisualScore(subscores: VisualSubScores): number {
  const score =
    (Number(subscores.colorHarmony) || 0) * VISUAL_WEIGHTS.colorHarmony +
    (Number(subscores.formalityMatch) || 0) * VISUAL_WEIGHTS.formalityMatch +
    (Number(subscores.presentationAppeal) || 0) * VISUAL_WEIGHTS.presentationAppeal +
    (Number(subscores.proportionSilhouette) || 0) * VISUAL_WEIGHTS.proportionSilhouette +
    (Number(subscores.texturePatternHarmony) || 0) * VISUAL_WEIGHTS.texturePatternHarmony +
    (Number(subscores.climatePracticality) || 0) * VISUAL_WEIGHTS.climatePracticality +
    (Number(subscores.officeAppropriateness) || 0) * VISUAL_WEIGHTS.officeAppropriateness;

  return Math.max(0, Math.min(1, score));
}

/**
 * Computes freshness from days since last worn and pair frequency over 60 days
 */
export function computeFreshnessScore(daysSinceWorn: number, pairCount60d: number): number {
  const freshnessDaysNormalized = Math.min(1, Math.max(0, daysSinceWorn / 30));
  const pairPenalty = Math.max(0, 1 - (pairCount60d * 0.25));
  return (0.6 * freshnessDaysNormalized) + (0.4 * pairPenalty);
}

/**
 * Composite score: 70% Visual, 30% Freshness
 */
export function computeCompositeScore(visualScore: number, freshnessScore: number): number {
  return (0.70 * visualScore) + (0.30 * freshnessScore);
}

/**
 * Validates whether an individual garment satisfies Formal Meeting criteria
 */
export function isFormalCompliant(garment: {
  formal_meeting_suitability?: number;
  style?: string;
  garment_type: string;
}): boolean {
  const formalScore = garment.formal_meeting_suitability ?? 0.5;
  if (formalScore < 0.6) return false;
  if (garment.style === 'casual_only') return false;
  if (FORMAL_BLOCKLIST.includes(garment.garment_type as any)) return false;
  return true;
}

/**
 * Filters garments by office context (regular vs formal meeting)
 */
export function filterGarmentsByContext(garments: CandidateItem[], isFormal: boolean): CandidateItem[] {
  if (isFormal) {
    return garments.filter(isFormalCompliant);
  }
  return garments.filter((g) => (g.office_suitability ?? 0.5) >= 0.4);
}

/**
 * Identifies the last 5 confirmed office days (office_days with is_office_day = true and confirmed outfit)
 */
export function getRecentOfficeDayCombos(
  officeDays: Array<{ date: string; is_office_day: boolean; confirmed_outfit_id?: string | null; outfit?: any }>,
  windowSize = 5
): Set<string> {
  const validDays = officeDays
    .filter((d) => d.is_office_day && d.confirmed_outfit_id)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Take the 5 most recent unique dates
  const uniqueDates: string[] = [];
  for (const d of validDays) {
    if (!uniqueDates.includes(d.date)) {
      uniqueDates.push(d.date);
    }
    if (uniqueDates.length >= windowSize) break;
  }

  const blockedCombos = new Set<string>();
  validDays
    .filter((d) => uniqueDates.includes(d.date))
    .forEach((d) => {
      if (d.outfit) {
        blockedCombos.add(`${d.outfit.shirt_id}_${d.outfit.bottom_id}_${d.outfit.footwear_id}`);
      }
    });

  return blockedCombos;
}

/**
 * Filters and validates AI rankings:
 * Excludes candidates the model did not return or marked reject.
 * Returns { validRankings, missingCandidateIds }
 */
export function processAIRankings(
  candidates: CandidateTriple[],
  aiRankings: AIRankingItem[]
): {
  rankedOutfits: FinalRankedOutfit[];
  missingCount: number;
} {
  const rankMap = new Map<string, AIRankingItem>();
  aiRankings.forEach((r) => rankMap.set(r.candidateId, r));

  let missingCount = 0;
  const rankedOutfits: FinalRankedOutfit[] = [];

  candidates.forEach((c, index) => {
    const cid = `cand_${index}`;
    const aiRank = rankMap.get(cid);

    if (!aiRank) {
      missingCount++;
      return; // Exclude candidates the model did not return
    }

    if (aiRank.recommendationStatus === 'reject') {
      return; // Exclude candidates marked reject
    }

    const visualScore = computeVisualScore(aiRank);
    const freshnessScore = c.freshnessScore;
    const finalScore = computeCompositeScore(visualScore, freshnessScore);

    rankedOutfits.push({
      ...c,
      shirt_id: c.top.id,
      bottom_id: c.bottom.id,
      footwear_id: c.shoes.id,
      ai_score: Math.round(finalScore * 100),
      visual_score: Math.round(visualScore * 100),
      freshness_score: Math.round(freshnessScore * 100),
      recommendation_status: aiRank.recommendationStatus,
      ai_reason: aiRank.rationale || 'Balanced proportions and cohesive visual pairing.',
      ai_tips: (aiRank.howToWear && aiRank.howToWear.length > 0)
        ? aiRank.howToWear.slice(0, 2)
        : ['Ensure shirt is pressed and footwear is clean.'],
      issues: aiRank.issues || [],
    });
  });

  // Sort descending by composite ai_score
  rankedOutfits.sort((a, b) => b.ai_score - a.ai_score);

  return { rankedOutfits, missingCount };
}
