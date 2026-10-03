/// <reference path="../deno.d.ts" />
// Edge Function: suggest-outfit
// Uses modular scoring engine, strict candidate exclusion, retry on missing, and persistent outfit rows
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { callAzureOpenAI } from '../_shared/azure.ts';
import {
  OUTFIT_RANKING_SYSTEM_PROMPT,
  OUTFIT_RANKING_SCHEMA,
  RANKING_PROMPT_VERSION,
} from '../_shared/prompts.ts';
import {
  CandidateTriple,
  CandidateItem,
  AIRankingItem,
  filterGarmentsByContext,
  computeFreshnessScore,
  getRecentOfficeDayCombos,
  processAIRankings,
} from '../_shared/scoring.ts';

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

    const body: any = await req.json().catch(() => ({}));
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
    const garments: CandidateItem[] = rawGarments
      .filter((g: any) => !g.is_damaged)
      .map((g: any) => {
        const overrides = g.user_overrides || {};
        return {
          ...g,
          ...overrides,
          id: g.id,
          category: overrides.category || g.category,
          garment_type: overrides.garment_type || g.garment_type,
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

    // 4. Load past confirmed office days for 5-office-day repeat rule (Step 8)
    const { data: pastOfficeDays } = await supabase
      .from('office_days')
      .select(`
        date,
        is_office_day,
        confirmed_outfit_id,
        outfit:outfits!confirmed_outfit_id(shirt_id, bottom_id, footwear_id)
      `)
      .eq('user_id', user.id)
      .eq('is_office_day', true)
      .not('confirmed_outfit_id', 'is', null)
      .order('date', { ascending: false })
      .limit(25);

    const recent5OfficeDaysSet = getRecentOfficeDayCombos(pastOfficeDays || [], 5);

    // 5. Load past 60-day confirmed outfits for pair frequency
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data: pastConfirmed } = await supabase
      .from('outfits')
      .select('shirt_id, bottom_id, footwear_id, worn_on')
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .gte('worn_on', sixtyDaysAgo);

    const pairCounts: Record<string, number> = {};
    (pastConfirmed || []).forEach((p: any) => {
      const pairKey = `${p.shirt_id}_${p.bottom_id}`;
      pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
    });

    // 6. Filter items by context using shared scoring module
    const tops = garments.filter((g) => g.category === 'top');
    const bottoms = garments.filter((g) => g.category === 'bottom');
    const shoes = garments.filter((g) => g.category === 'shoes');

    let filteredTops = filterGarmentsByContext(tops, isFormal);
    let filteredBottoms = filterGarmentsByContext(bottoms, isFormal);
    let filteredShoes = filterGarmentsByContext(shoes, isFormal);

    // Tiny wardrobe graceful fallback
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

    // 7. Build candidates
    const allCandidates: CandidateTriple[] = [];
    const now = Date.now();

    for (const t of filteredTops) {
      for (const b of filteredBottoms) {
        for (const s of filteredShoes) {
          const tripleKey = `${t.id}_${b.id}_${s.id}`;

          if (blockedSet.has(tripleKey)) continue;
          if (rejectedTodaySet.has(tripleKey)) continue;

          const topLastWorn = t.last_worn_at ? new Date(t.last_worn_at).getTime() : 0;
          const bottomLastWorn = b.last_worn_at ? new Date(b.last_worn_at).getTime() : 0;
          const shoesLastWorn = s.last_worn_at ? new Date(s.last_worn_at).getTime() : 0;

          const daysSinceTop = topLastWorn ? (now - topLastWorn) / (1000 * 3600 * 24) : 60;
          const daysSinceBottom = bottomLastWorn ? (now - bottomLastWorn) / (1000 * 3600 * 24) : 60;
          const daysSinceShoes = shoesLastWorn ? (now - shoesLastWorn) / (1000 * 3600 * 24) : 60;

          const minDaysSince = Math.min(daysSinceTop, daysSinceBottom, daysSinceShoes);
          const pairFreq = pairCounts[`${t.id}_${b.id}`] || 0;
          const freshnessScore = computeFreshnessScore(minDaysSince, pairFreq);

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

    // Filter 5-office-day repeats if candidates remain
    let validCandidates = allCandidates.filter((c) => !recent5OfficeDaysSet.has(c.id));
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

    // Keep top 12 to 15 candidates by freshness for AI ranking
    validCandidates.sort((a, b) => b.freshnessScore - a.freshnessScore);
    const topCandidates = validCandidates.slice(0, 15);

    // Format Candidate Visual Analysis payload (no file names, no image URLs, no IDs as evidence)
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
      visual_summary: item.visual_summary || `${item.category} item`,
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

    // Call Azure OpenAI with retry if any candidates are missing
    let aiRankingResult = await callAzureOpenAI(rankingMessages, {
      name: 'outfit_rankings',
      schema: OUTFIT_RANKING_SCHEMA,
    });

    let rawRankings = (aiRankingResult.rankings || []) as AIRankingItem[];
    let processed = processAIRankings(topCandidates, rawRankings);

    // If any candidates missing, retry ranking call once
    if (processed.missingCount > 0) {
      console.warn(`Missing ${processed.missingCount} candidates from model, retrying ranking once...`);
      aiRankingResult = await callAzureOpenAI(rankingMessages, {
        name: 'outfit_rankings',
        schema: OUTFIT_RANKING_SCHEMA,
      });
      rawRankings = (aiRankingResult.rankings || []) as AIRankingItem[];
      processed = processAIRankings(topCandidates, rawRankings);
    }

    const finalRanked = processed.rankedOutfits;

    // 8. Ensure EVERY outfit shown has an outfits row before Wear this, Don't suggest this or Change (Step 7)
    if (finalRanked.length > 0) {
      const outfitRows = finalRanked.map((item) => ({
        user_id: user.id,
        shirt_id: item.shirt_id,
        bottom_id: item.bottom_id,
        footwear_id: item.footwear_id,
        status: 'recommendation',
        source: 'ai_recommendation',
        ai_score: item.ai_score,
        ai_reason: item.ai_reason,
        ai_tips: item.ai_tips,
      }));

      const { data: insertedOutfits, error: insertBatchErr } = await supabase
        .from('outfits')
        .insert(outfitRows)
        .select('id, shirt_id, bottom_id, footwear_id');

      if (!insertBatchErr && insertedOutfits) {
        insertedOutfits.forEach((row: any, i: number) => {
          if (finalRanked[i]) {
            (finalRanked[i] as any).outfit_id = row.id;
          }
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      ranking_version: RANKING_PROMPT_VERSION,
      recommendations: finalRanked,
    }), {
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
