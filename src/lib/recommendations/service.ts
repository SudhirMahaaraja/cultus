// @maintained 2026-09-25T14:37:10.702Z
import { RecommendationCandidate, RecommendationResponse, ClothingItem } from '@/types';
import { getVisionProvider } from '../ai/provider';
import { generateAllCandidates } from './candidates';
import { filterAndScoreCandidates } from './filters';
import { SUPABASE_CONFIG } from '../supabase/config';

async function getClothingItemsForServer(): Promise<ClothingItem[]> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || supabaseUrl.includes('placeholder') || !supabaseAnonKey) {
      console.warn('[service] Supabase not configured — no garments available');
      return [];
    }

    console.log('[service] Fetching active garments from Supabase...');
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from(SUPABASE_CONFIG.GARMENTS_TABLE)
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[service] Supabase garment fetch error:', error.code, error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn('[service] No active garments found in Supabase');
      return [];
    }

    console.log(`[service] Loaded ${data.length} active garment(s) from Supabase`);
    data.forEach((g: any) => console.log(`  - [${g.category}] "${g.name}" (wears: ${g.wear_count})`));

    return data.map((row: any) => ({
      id: row.id,
      category: row.category,
      name: row.name,
      image_url: row.image_url,
      active: row.active ?? true,
      ai_analysis: row.ai_analysis || {
        category: row.category,
        dominant_colors: ['black'],
        secondary_colors: [],
        pattern: 'solid',
        style: 'executive_formal',
        fit: 'tailored',
        office_suitability: 0.7,
        visual_summary: row.name,
        confidence: 0.8,
      },
      analysis_model: row.analysis_model,
      created_at: row.created_at,
      updated_at: row.updated_at,
      wear_count: row.wear_count || 0,
      last_worn_at: row.last_worn_at || null,
    }));
  } catch (e) {
    console.error('[service] Failed to fetch garments from Supabase:', e);
    return [];
  }
}

export async function generateDailyRecommendation(
  meetingStatus: 'yes' | 'no',
  skipCandidateIds: string[] = []
): Promise<RecommendationResponse | null> {
  console.log(`\n[service] ---- RECOMMENDATION PIPELINE START (meetingStatus=${meetingStatus}) ----`);

  const clothingItems = await getClothingItemsForServer();

  // Fetch feedback and past outfits from Supabase server-side
  let feedbackList: any[] = [];
  let pastOutfits: any[] = [];
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (supabaseUrl && !supabaseUrl.includes('placeholder') && supabaseAnonKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const [fbResult, outfitResult] = await Promise.all([
        supabase.from(SUPABASE_CONFIG.FEEDBACK_TABLE).select('*').order('created_at', { ascending: false }),
        supabase.from(SUPABASE_CONFIG.OUTFITS_TABLE).select('*').order('worn_on', { ascending: false }).limit(30),
      ]);

      feedbackList = fbResult.data || [];
      pastOutfits = outfitResult.data || [];
      console.log(`[service] Loaded ${feedbackList.length} feedback record(s), ${pastOutfits.length} past outfit(s)`);
    }
  } catch (e) {
    console.warn('[service] Could not fetch feedback/outfits from Supabase:', e);
  }

  if (clothingItems.length === 0) {
    console.warn('[service] No garments — returning null. Add garments in the Wardrobe page.');
    return null;
  }

  // Step 1: Generate all candidate combinations
  const allCandidates = generateAllCandidates(clothingItems);
  console.log(`[service] Step 1: Generated ${allCandidates.length} outfit combination(s)`);

  if (allCandidates.length === 0) {
    console.warn('[service] No candidates — need at least 1 top + 1 bottom garment');
    return null;
  }

  // Step 2: Deterministic filtering (blocked, suitability, recency)
  let eligibleCandidates = filterAndScoreCandidates(
    allCandidates,
    feedbackList,
    pastOutfits,
    meetingStatus
  );
  console.log(`[service] Step 2: ${eligibleCandidates.length} candidate(s) after filtering (${allCandidates.length - eligibleCandidates.length} blocked/filtered)`);

  if (skipCandidateIds.length > 0) {
    const before = eligibleCandidates.length;
    const unSkipped = eligibleCandidates.filter((c) => !skipCandidateIds.includes(c.id));
    if (unSkipped.length > 0) {
      eligibleCandidates = unSkipped;
    }
    console.log(`[service] Step 2b: Skipped ${before - eligibleCandidates.length} candidate(s) by user request`);
  }

  if (eligibleCandidates.length === 0) {
    console.warn('[service] All candidates filtered out — returning null');
    return null;
  }

  // Step 3: AI visual ranking
  const provider = getVisionProvider();
  const recentOutfitsText = pastOutfits
    .slice(0, 5)
    .map((o: any) => `${o.worn_on}: outfit ID ${o.id}`)
    .join(', ');

  console.log(`[service] Step 3: Sending ${Math.min(eligibleCandidates.length, 10)} candidate(s) to AI for visual ranking...`);
  const aiResult = await provider.rankOutfits(eligibleCandidates.slice(0, 10), {
    meetingStatus,
    recentOutfitsText,
  });
  console.log(`[service] Step 3: AI returned ${aiResult.rankings.size} ranking(s) via ${aiResult.modelUsed}`);

  // Step 4: Final score combination
  const rankedCandidates = eligibleCandidates.map((candidate) => {
    const aiData = aiResult.rankings.get(candidate.id);
    const visualScore = aiData ? aiData.score : candidate.deterministicScore;
    const aiReason = aiData ? aiData.rationale : 'Balanced executive combination.';

    const officeSuitability = (candidate.shirt.ai_analysis.office_suitability + candidate.bottom.ai_analysis.office_suitability) / 2;
    const recencyScore = Math.max(0, 1 - candidate.recencyPenalty);
    const wardrobeVariety = Math.min(1, (candidate.shirt.wear_count || 0) < 5 ? 0.9 : 0.6);

    const finalScore =
      visualScore * 0.45 +
      officeSuitability * 0.20 +
      candidate.meetingSuitabilityScore * 0.15 +
      wardrobeVariety * 0.10 +
      recencyScore * 0.10;

    return {
      ...candidate,
      aiScore: visualScore,
      aiReason,
      presentationAppeal: aiData?.presentationAppeal,
      rotationFreshness: aiData?.rotationFreshness,
      howToWear: aiData?.howToWear,
      issues: aiData?.issues,
      finalScore,
    };
  });

  rankedCandidates.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

  const topOutfit = rankedCandidates[0];
  const alternatives = rankedCandidates.slice(1, 4);

  console.log(`[service] Step 4: Top pick — "${topOutfit.shirt.name}" + "${topOutfit.bottom.name}" + "${topOutfit.footwear.name}"`);
  console.log(`[service]   Scores: visual=${topOutfit.aiScore?.toFixed(3)}, final=${topOutfit.finalScore?.toFixed(3)}, meetingSuitability=${topOutfit.meetingSuitabilityScore.toFixed(3)}`);
  console.log(`[service] ---- RECOMMENDATION PIPELINE END ----\n`);

  return {
    outfit: topOutfit,
    alternatives,
    rationale: aiResult.topRationale || topOutfit.aiReason || 'Recommended for optimal executive presence.',
    topHowToWear: aiResult.topHowToWear,
    meta: {
      modelUsed: aiResult.modelUsed,
      totalCandidatesEvaluated: eligibleCandidates.length,
      provider: provider.name,
    },
  };
}
