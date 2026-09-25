import { Outfit, OutfitFeedback, RecommendationCandidate } from '@/types';

export function filterAndScoreCandidates(
  candidates: RecommendationCandidate[],
  feedbackList: OutfitFeedback[],
  pastOutfits: Outfit[],
  meetingStatus: 'yes' | 'no'
): RecommendationCandidate[] {
  const dontSuggestMap = new Set<string>();

  feedbackList.forEach((fb) => {
    if (fb.feedback_type === 'dont_suggest') {
      dontSuggestMap.add(`${fb.shirt_id}_${fb.bottom_id}_${fb.footwear_id}`);
    }
  });

  const nowMs = Date.now();
  const ONE_DAY_MS = 86400000;

  return candidates.map((candidate) => {
    const key = `${candidate.shirt.id}_${candidate.bottom.id}_${candidate.footwear.id}`;
    const isBlocked = dontSuggestMap.has(key);

    if (isBlocked) {
      return {
        ...candidate,
        isBlocked: true,
        deterministicScore: 0,
        recencyPenalty: 1.0,
      };
    }

    // 1. Calculate recency penalty based on when shirt or bottom was last worn
    let recencyPenalty = 0;

    const shirtLastWornDays = candidate.shirt.last_worn_at
      ? (nowMs - new Date(candidate.shirt.last_worn_at).getTime()) / ONE_DAY_MS
      : 99;

    const bottomLastWornDays = candidate.bottom.last_worn_at
      ? (nowMs - new Date(candidate.bottom.last_worn_at).getTime()) / ONE_DAY_MS
      : 99;

    // High penalty if worn in the last 2 days
    if (shirtLastWornDays < 2) recencyPenalty += 0.35;
    else if (shirtLastWornDays < 4) recencyPenalty += 0.15;

    if (bottomLastWornDays < 2) recencyPenalty += 0.35;
    else if (bottomLastWornDays < 4) recencyPenalty += 0.15;

    // Check when this exact outfit combination was last worn
    const previousCombo = pastOutfits.find(
      (o) =>
        o.shirt_id === candidate.shirt.id &&
        o.bottom_id === candidate.bottom.id &&
        o.footwear_id === candidate.footwear.id
    );

    if (previousCombo && previousCombo.worn_on) {
      const comboWornDays = (nowMs - new Date(previousCombo.worn_on).getTime()) / ONE_DAY_MS;
      if (comboWornDays < 7) recencyPenalty += 0.30;
      else if (comboWornDays < 14) recencyPenalty += 0.15;
    }

    // 2. Meeting Suitability Score
    let meetingSuitabilityScore = 0.8;
    const isShirtFormal = candidate.shirt.category === 'formal_shirt';
    const isBottomFormal = candidate.bottom.category === 'formal_pants';

    if (meetingStatus === 'yes') {
      if (isShirtFormal && isBottomFormal) {
        meetingSuitabilityScore = 1.0;
      } else if (isShirtFormal || isBottomFormal) {
        meetingSuitabilityScore = 0.65;
      } else {
        meetingSuitabilityScore = 0.25; // T-shirt + joggers for meeting day severely demoted
      }
    } else {
      // Regular office day: balanced flexibility
      if (isShirtFormal && isBottomFormal) meetingSuitabilityScore = 0.90;
      else if (isShirtFormal || isBottomFormal) meetingSuitabilityScore = 0.95;
      else meetingSuitabilityScore = 0.80;
    }

    // Combine deterministic base score
    const deterministicScore = Math.max(
      0.05,
      meetingSuitabilityScore * 0.6 + (1 - Math.min(1, recencyPenalty)) * 0.4
    );

    return {
      ...candidate,
      isBlocked: false,
      recencyPenalty,
      meetingSuitabilityScore,
      deterministicScore,
    };
  }).filter((cand) => !cand.isBlocked); // Hard filter blocked items out of primary pool
}
