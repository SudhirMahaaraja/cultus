/// <reference path="../deno.d.ts" />
// Edge Function: suggest-outfit
// Matches Cultus Modern Sartorial Vision ranking prompt and scoring pipeline
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { callAzureOpenAI } from '../_shared/azure.ts';
import {
  OUTFIT_RANKING_SYSTEM_PROMPT,
  OUTFIT_RANKING_SCHEMA,
} from '../_shared/prompts.ts';
import {
  CONFIG,
  FORMAL_BLOCKLIST,
  GarmentType,
} from '../_shared/vocabulary.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    // Map context: "formal_meeting" or "regular_day"
    const isFormal = body.meeting_type === 'formal' || body.context === 'formal_meeting';
    const contextStr = isFormal ? 'formal_meeting' : 'regular_day';
    const meeting_notes = body.meeting_notes || '';
    const targetDate = body.date || new Date().toISOString().split('T')[0];

    // 1. Load active garments for current user
    const { data: rawGarments, error: garmentErr } = await supabase
      .from('clothing_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true);

    if (garmentErr) throw garmentErr;
    if (!rawGarments || rawGarments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          recommendations: [],
          message: 'No active garments found in wardrobe. Please add clothes first.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Merge user_overrides and filter out damaged items
    const garments = rawGarments
      .filter((g: any) => !g.is_damaged)
      .map((g: any) => {
        const overrides = g.user_overrides || {};
        return {
          ...g,
          ...overrides,
          id: g.id,
          category: overrides.category || g.category,
          garment_type: (overrides.garment_type || g.garment_type) as GarmentType,
          style: overrides.style || g.style,
          office_suitability: overrides.office_suitability ?? g.office_suitability ?? 0.5,
          formal_meeting_suitability: overrides.formal_meeting_suitability ?? g.formal_meeting_suitability ?? 0.5,
          climate_practicality: overrides.climate_practicality ?? g.climate_practicality ?? 0.5,
          confidence: g.confidence ?? 0.85,
        };
      });

    // 2. Load feedback (dont_suggest blocks)
    const { data: feedbackData } = await supabase
      .from('outfit_feedback')
      .select('shirt_id, bottom_id, footwear_id')
      .eq('user_id', user.id)
      .eq('feedback_type', 'dont_suggest');

    const blockedSet = new Set<string>();
    (feedbackData || []).forEach((f: any) => {
      blockedSet.add(`${f.shirt_id}_${f.bottom_id}_${f.footwear_id}`);
    });

    // 3. Load outfits rejected today
    const { data: rejectedToday } = await supabase
      .from('outfits')
      .select('shirt_id, bottom_id, footwear_id')
      .eq('user_id', user.id)
      .eq('status', 'rejected')
      .gte('updated_at', `${targetDate}T00:00:00Z`);

    const rejectedTodaySet = new Set<string>();
    (rejectedToday || []).forEach((r: any) => {
      rejectedTodaySet.add(`${r.shirt_id}_${r.bottom_id}_${r.footwear_id}`);
    });

    // 4. Load past confirmed outfits (for 5-day repeat rule & 60-day pair frequency)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: pastConfirmed } = await supabase
      .from('outfits')
      .select('shirt_id, bottom_id, footwear_id, worn_on')
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .gte('worn_on', sixtyDaysAgo)
      .order('worn_on', { ascending: false });

    // Track last 5 office days worn combinations
    const recent5DaysSet = new Set<string>();
    const pastConfirmedList = pastConfirmed || [];
    const uniquePastDates = Array.from(new Set(pastConfirmedList.map((p: any) => p.worn_on))).slice(0, CONFIG.recentOfficeDaysExclusionWindow);
    pastConfirmedList
      .filter((p: any) => uniquePastDates.includes(p.worn_on))
      .forEach((p: any) => {
        recent5DaysSet.add(`${p.shirt_id}_${p.bottom_id}_${p.footwear_id}`);
      });

    // Count top+bottom pair frequency in last 60 days
    const pairCounts: Record<string, number> = {};
    pastConfirmedList.forEach((p: any) => {
      const pairKey = `${p.shirt_id}_${p.bottom_id}`;
      pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
    });

    // 5. Apply context rules to filter items
    const tops = garments.filter((g: any) => g.category === 'top');
    const bottoms = garments.filter((g: any) => g.category === 'bottom');
    const shoes = garments.filter((g: any) => g.category === 'shoes');

    const filterByContext = (list: any[]) => {
      if (isFormal) {
        return list.filter(
          (g) =>
            g.formal_meeting_suitability >= CONFIG.formalMeetingSuitabilityMinFormal &&
            g.style !== 'casual_only' &&
            !FORMAL_BLOCKLIST.includes(g.garment_type)
        );
      } else {
        return list.filter((g) => g.office_suitability >= CONFIG.officeSuitabilityMinRegular);
      }
    };

    let filteredTops = filterByContext(tops);
    let filteredBottoms = filterByContext(bottoms);
    let filteredShoes = filterByContext(shoes);

    // If small wardrobe or strict filter eliminates category, gracefully relax
    if (filteredTops.length === 0) filteredTops = tops;
    if (filteredBottoms.length === 0) filteredBottoms = bottoms;
    if (filteredShoes.length === 0) filteredShoes = shoes;

    if (filteredTops.length === 0 || filteredBottoms.length === 0 || filteredShoes.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          recommendations: [],
          message: 'Wardrobe must have at least one top, one bottom, and one pair of shoes.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Build all candidate combinations
    interface Candidate {
      id: string;
      top: any;
      bottom: any;
      shoes: any;
      freshnessScore: number;
    }

    const allCandidates: Candidate[] = [];
    const now = Date.now();

    for (const t of filteredTops) {
      for (const b of filteredBottoms) {
        for (const s of filteredShoes) {
          const tripleKey = `${t.id}_${b.id}_${s.id}`;

          // Filter blocked triples & today's rejected
          if (blockedSet.has(tripleKey)) continue;
          if (rejectedTodaySet.has(tripleKey)) continue;

          // Freshness calculation
          const topLastWorn = t.last_worn_at ? new Date(t.last_worn_at).getTime() : 0;
          const bottomLastWorn = b.last_worn_at ? new Date(b.last_worn_at).getTime() : 0;
          const shoesLastWorn = s.last_worn_at ? new Date(s.last_worn_at).getTime() : 0;

          const daysSinceTop = topLastWorn ? (now - topLastWorn) / (1000 * 3600 * 24) : 60;
          const daysSinceBottom = bottomLastWorn ? (now - bottomLastWorn) / (1000 * 3600 * 24) : 60;
          const daysSinceShoes = shoesLastWorn ? (now - shoesLastWorn) / (1000 * 3600 * 24) : 60;

          const minDaysSince = Math.min(daysSinceTop, daysSinceBottom, daysSinceShoes);
          const freshnessDaysNormalized = Math.min(1, minDaysSince / 30); // 30+ days = 1.0

          const pairFreq = pairCounts[`${t.id}_${b.id}`] || 0;
          const pairPenalty = Math.max(0, 1 - (pairFreq * 0.25)); // 0 pairs = 1.0, 4+ pairs = 0.0

          const freshnessScore = (0.6 * freshnessDaysNormalized) + (0.4 * pairPenalty);

          allCandidates.push({
            id: tripleKey,
            top: t,
            bottom: b,
            shoes: s,
            freshnessScore,
          });
        }
      }
    }

    // Filter 5-day repeats if we have enough candidates
    let validCandidates = allCandidates.filter((c) => !recent5DaysSet.has(c.id));
    if (validCandidates.length === 0) {
      validCandidates = allCandidates;
    }

    if (validCandidates.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          recommendations: [],
          message: 'All possible combinations are currently blocked or rejected today.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sort by freshness to select top 12 to 15 candidates for AI ranking
    validCandidates.sort((a, b) => b.freshnessScore - a.freshnessScore);
    const topCandidates = validCandidates.slice(0, CONFIG.maxCandidatesToRank);

    // 7. Format Candidate Visual Analysis payload for the Ranking Prompt
    const formatGarmentForAI = (item: any) => ({
      category: item.category,
      garment_type: item.garment_type,
      dominant_colors: item.dominant_colors || [item.primary_color || 'other'],
      color_temperature: item.color_temperature || 'neutral',
      pattern: item.pattern || 'solid',
      texture: item.texture || 'smooth',
      silhouette: item.silhouette || 'straight',
      fit: item.fit || 'regular',
      style: item.style || 'business_casual',
      condition: item.condition || 'good',
      office_suitability: item.office_suitability,
      formal_meeting_suitability: item.formal_meeting_suitability,
      climate_practicality: item.climate_practicality,
      confidence: item.confidence,
      visual_summary: item.visual_summary || item.name,
    });

    const candidatesPayload = topCandidates.map((c, index) => ({
      candidateId: `cand_${index}`,
      top: formatGarmentForAI(c.top),
      bottom: formatGarmentForAI(c.bottom),
      shoes: formatGarmentForAI(c.shoes),
    }));

    const userPromptPayload = {
      context: contextStr,
      meeting_notes: meeting_notes || undefined,
      candidates: candidatesPayload,
    };

    const rankingMessages = [
      { role: 'system' as const, content: OUTFIT_RANKING_SYSTEM_PROMPT },
      { role: 'user' as const, content: JSON.stringify(userPromptPayload, null, 2) },
    ];

    const aiRankingResult = await callAzureOpenAI(rankingMessages, {
      name: 'outfit_rankings',
      schema: OUTFIT_RANKING_SCHEMA,
    });

    const aiRanks = (aiRankingResult.rankings || []) as Array<{
      candidateId: string;
      visualScore: number;
      officeAppropriateness: number;
      presentationAppeal: number;
      colorHarmony: number;
      texturePatternHarmony: number;
      proportionSilhouette: number;
      formalityMatch: number;
      climatePracticality: number;
      recommendationStatus: 'recommended' | 'acceptable' | 'reject';
      rationale: string;
      howToWear: string[];
      issues?: string[];
    }>;

    const rankMap = new Map<string, typeof aiRanks[0]>();
    aiRanks.forEach((r) => rankMap.set(r.candidateId, r));

    // 8. Compute final composite scores (70% Visual, 30% Freshness)
    const rankedList = topCandidates.map((c, index) => {
      const cid = `cand_${index}`;
      const aiRank = rankMap.get(cid);

      const visualScore = Number(aiRank?.visualScore ?? 0.75);
      const freshnessScore = c.freshnessScore;
      const finalScore = (CONFIG.visualWeight * visualScore) + (CONFIG.freshnessWeight * freshnessScore);

      return {
        shirt_id: c.top.id,
        bottom_id: c.bottom.id,
        footwear_id: c.shoes.id,
        top: c.top,
        bottom: c.bottom,
        shoes: c.shoes,
        ai_score: Math.round(finalScore * 100),
        visual_score: Math.round(visualScore * 100),
        freshness_score: Math.round(freshnessScore * 100),
        recommendation_status: aiRank?.recommendationStatus || 'recommended',
        ai_reason: aiRank?.rationale || 'Cohesive palette and balanced proportions for the office.',
        how_to_wear: (aiRank?.howToWear && aiRank.howToWear.length > 0)
          ? aiRank.howToWear
          : ['Ensure shirt is pressed and shoes are clean.'],
        ai_tips: aiRank?.howToWear || ['Ensure shirt is pressed and shoes are clean.'],
        issues: aiRank?.issues || [],
      };
    });

    // Filter out candidates with recommendationStatus === 'reject' if better options exist
    const nonRejected = rankedList.filter((r) => r.recommendation_status !== 'reject');
    const finalRanked = nonRejected.length > 0 ? nonRejected : rankedList;
    finalRanked.sort((a, b) => b.ai_score - a.ai_score);

    // 9. Save top candidate as recommendation in outfits table
    if (finalRanked.length > 0) {
      const topPick = finalRanked[0];
      const { data: insertedOutfit, error: insertErr } = await supabase
        .from('outfits')
        .insert({
          user_id: user.id,
          shirt_id: topPick.shirt_id,
          bottom_id: topPick.bottom_id,
          footwear_id: topPick.footwear_id,
          status: 'recommendation',
          source: 'ai_recommendation',
          ai_score: topPick.ai_score,
          ai_reason: topPick.ai_reason,
          ai_tips: topPick.how_to_wear,
        })
        .select()
        .single();

      if (!insertErr && insertedOutfit) {
        (topPick as any).outfit_id = insertedOutfit.id;
      }
    }

    return new Response(JSON.stringify({ success: true, recommendations: finalRanked }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('suggest-outfit error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Suggestion failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
