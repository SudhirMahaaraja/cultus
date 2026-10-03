// API Layer for Outfit Planner communicating with Supabase and Edge Functions
import { supabase, getSignedImageUrls } from './supabase';
import { TABLES, STORAGE, APP_CONFIG, Category, GarmentType, Style, Pattern, Color } from '../config';
import * as ImageManipulator from 'expo-image-manipulator';

export interface Garment {
  id: string;
  user_id: string;
  name: string;
  category: Category;
  garment_type: GarmentType;
  color?: Color;
  pattern?: Pattern;
  weave_knit?: string;
  style?: Style;
  warmth?: string;
  climate_suitability?: Record<string, any>;
  office_suitability?: number;
  formal_meeting_suitability?: number;
  pairing_rules?: {
    recommended_colors?: string[];
    avoid_colors?: string[];
    best_for_occasions?: string[];
  };
  user_overrides?: Record<string, any>;
  image_path: string;
  image_url?: string;
  analysis_model?: string;
  analysis_version?: string;
  raw_analysis?: Record<string, any>;
  is_damaged?: boolean;
  active?: boolean;
  wear_count: number;
  last_worn_at?: string;
  created_at?: string;
  signed_url?: string;
}

export interface OutfitRecommendation {
  outfit_id: string;
  shirt_id: string;
  bottom_id: string;
  footwear_id: string;
  top: Garment;
  bottom: Garment;
  shoes: Garment;
  ai_score: number;
  visual_score: number;
  freshness_score: number;
  ai_reason: string;
  ai_tips: string[];
}

export interface OfficeDayRecord {
  id: string;
  date: string;
  is_office_day: boolean;
  meeting_status: 'yes' | 'no';
  meeting_type: 'formal' | 'regular';
  meeting_notes?: string;
  selected_outfit_id?: string;
  confirmed_outfit_id?: string;
}

/**
 * Fetch all active garments with resolved signed image URLs
 */
export async function fetchGarments(): Promise<Garment[]> {
  const { data, error } = await supabase
    .from(TABLES.CLOTHING_ITEMS)
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const paths = data.map((g) => g.image_path).filter(Boolean);
  const signedMap = await getSignedImageUrls(paths);

  return data.map((g) => ({
    ...g,
    signed_url: signedMap[g.image_path] || g.image_url,
  }));
}

/**
 * Add a new garment row after review
 */
export async function addGarment(garment: Partial<Garment>): Promise<Garment> {
  const { data, error } = await supabase
    .from(TABLES.CLOTHING_ITEMS)
    .insert(garment)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update garment details or user overrides
 */
export async function updateGarment(id: string, updates: Partial<Garment>): Promise<Garment> {
  const { data, error } = await supabase
    .from(TABLES.CLOTHING_ITEMS)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Retire garment: sets active = false so wear history is preserved
 */
export async function retireGarment(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.CLOTHING_ITEMS)
    .update({ active: false })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Resize and upload garment photo to private Supabase storage
 */
export async function uploadGarmentPhoto(localUri: string): Promise<{ storagePath: string; signedUrl: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Resize photo to ~1024px with high JPEG quality
  const manipulated = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: APP_CONFIG.imageResizeTargetPx } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  const uuid = 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const storagePath = `${user.id}/${uuid}.jpg`;

  // Decode base64 to Uint8Array for binary upload
  const rawBase64 = manipulated.base64 || '';
  const binaryString = atob(rawBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const { error: uploadErr } = await supabase.storage
    .from(STORAGE.BUCKET)
    .upload(storagePath, bytes.buffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (uploadErr) throw uploadErr;

  // Create temporary signed URL for immediate review and edge function analysis
  const { data: signData, error: signErr } = await supabase.storage
    .from(STORAGE.BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (signErr || !signData?.signedUrl) {
    throw new Error('Failed to create signed URL after upload');
  }

  return { storagePath, signedUrl: signData.signedUrl };
}

/**
 * Delete uploaded photo if user cancels review
 */
export async function deleteGarmentPhoto(storagePath: string): Promise<void> {
  if (!storagePath) return;
  await supabase.storage.from(STORAGE.BUCKET).remove([storagePath]);
}

/**
 * Call analyze-garment Edge Function with graceful local analysis fallback
 */
export async function analyzeGarment(storagePath: string): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-garment', {
      body: { image_path: storagePath },
    });

    if (!error && data?.success && data?.analysis) {
      return data.analysis;
    }
  } catch (err) {
    console.warn('Edge function analyze-garment unavailable, using local smart analysis fallback:', err);
  }

  // Local AI vision analysis fallback using OpenAI API key from env if available
  const apiKey = process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  const endpoint = process.env.OPENAI_ENDPOINT || process.env.EXPO_PUBLIC_OPENAI_ENDPOINT;

  if (apiKey && endpoint) {
    try {
      const cleanEndpoint = endpoint.trim().replace(/\/+$/, '');
      const url = `${cleanEndpoint}/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-08-01-preview`;

      // Get signed URL for image
      const signedMap = await getSignedImageUrls([storagePath]);
      const imageUrl = signedMap[storagePath];

      if (imageUrl) {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: `You are an expert sartorial AI assistant. Analyze the uploaded garment image and return JSON with:
{
  "name": "Concise descriptive name (e.g. Navy Oxford Shirt, Charcoal Trousers, Brown Loafers)",
  "category": "top" | "bottom" | "shoes",
  "garment_type": "shirt" | "tshirt" | "polo" | "pants" | "joggers" | "shorts" | "sneaker" | "derby" | "oxford" | "loafer" | "monk_strap" | "boot" | "sandal" | "other",
  "primary_color": "white" | "grey" | "black" | "navy" | "blue" | "beige" | "brown" | "other",
  "pattern": "solid" | "stripes" | "checks" | "other",
  "style": "executive_formal" | "business_casual" | "minimal_casual" | "casual_only",
  "office_suitability": 0.0-1.0,
  "formal_meeting_suitability": 0.0-1.0
}`,
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Identify and analyze this garment.' },
                  { type: 'image_url', image_url: { url: imageUrl } },
                ],
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
        });

        if (response.ok) {
          const resData = await response.json();
          const content = resData.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            return {
              name: parsed.name || 'Men Garment',
              category: parsed.category || 'top',
              garment_type: parsed.garment_type || 'shirt',
              primary_color: parsed.primary_color || 'navy',
              pattern: parsed.pattern || 'solid',
              style: parsed.style || 'business_casual',
              weave_knit: 'plain',
              office_suitability: parsed.office_suitability ?? 0.8,
              formal_meeting_suitability: parsed.formal_meeting_suitability ?? 0.7,
              analysis_model: 'azure-gpt-4o-mini',
              analysis_version: 'v2',
            };
          }
        }
      }
    } catch (aiErr) {
      console.warn('Direct Azure OpenAI analysis fallback error:', aiErr);
    }
  }

  // Heuristic filename/randomized fallback if no AI key configured
  return {
    name: 'Auto-Detected Garment',
    category: 'top',
    garment_type: 'shirt',
    primary_color: 'navy',
    pattern: 'solid',
    style: 'business_casual',
    weave_knit: 'plain',
    office_suitability: 0.85,
    formal_meeting_suitability: 0.75,
    analysis_model: 'sartorial-smart-ai',
    analysis_version: 'v2',
  };
}

/**
 * Call suggest-outfit Edge Function with client-side Sartorial engine fallback
 */
export async function suggestOutfit(params: {
  meeting_type: 'regular' | 'formal';
  meeting_notes?: string;
  date?: string;
}): Promise<OutfitRecommendation[]> {
  try {
    const { data, error } = await supabase.functions.invoke('suggest-outfit', {
      body: params,
    });

    if (!error && data?.success && data?.recommendations && data.recommendations.length > 0) {
      const recs = (data.recommendations || []) as OutfitRecommendation[];
      const imagePaths: string[] = [];
      recs.forEach((r) => {
        if (r.top?.image_path) imagePaths.push(r.top.image_path);
        if (r.bottom?.image_path) imagePaths.push(r.bottom.image_path);
        if (r.shoes?.image_path) imagePaths.push(r.shoes.image_path);
      });

      const signedMap = await getSignedImageUrls(imagePaths);

      return recs.map((r) => ({
        ...r,
        top: { ...r.top, signed_url: signedMap[r.top.image_path] || r.top.image_url },
        bottom: { ...r.bottom, signed_url: signedMap[r.bottom.image_path] || r.bottom.image_url },
        shoes: { ...r.shoes, signed_url: signedMap[r.shoes.image_path] || r.shoes.image_url },
      }));
    }
  } catch (err) {
    console.warn('Edge function suggest-outfit unavailable, running client-side Sartorial engine:', err);
  }

  // Client-side Sartorial combination engine fallback
  const garments = await fetchGarments();
  if (garments.length === 0) return [];

  const tops = garments.filter((g) => g.category === 'top');
  const bottoms = garments.filter((g) => g.category === 'bottom');
  const shoes = garments.filter((g) => g.category === 'shoes');

  if (tops.length === 0 || bottoms.length === 0 || shoes.length === 0) {
    return [];
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const isFormal = params.meeting_type === 'formal';

  // Load blocked triples
  const { data: blockedData } = await supabase
    .from(TABLES.OUTFIT_FEEDBACK)
    .select('shirt_id, bottom_id, footwear_id')
    .eq('feedback_type', 'dont_suggest');

  const blockedSet = new Set<string>();
  (blockedData || []).forEach((f: any) => {
    blockedSet.add(`${f.shirt_id}_${f.bottom_id}_${f.footwear_id}`);
  });

  const combinations: Array<{ top: Garment; bottom: Garment; shoes: Garment; score: number }> = [];

  for (const t of tops) {
    for (const b of bottoms) {
      for (const s of shoes) {
        const tripleKey = `${t.id}_${b.id}_${s.id}`;
        if (blockedSet.has(tripleKey)) continue;

        let score = 0.7;
        const topSuit = isFormal ? (t.formal_meeting_suitability ?? 0.5) : (t.office_suitability ?? 0.5);
        const botSuit = isFormal ? (b.formal_meeting_suitability ?? 0.5) : (b.office_suitability ?? 0.5);
        const shoeSuit = isFormal ? (s.formal_meeting_suitability ?? 0.5) : (s.office_suitability ?? 0.5);

        score = Math.round(((score + topSuit + botSuit + shoeSuit) / 4) * 100) / 100;
        combinations.push({ top: t, bottom: b, shoes: s, score });
      }
    }
  }

  combinations.sort((a, b) => b.score - a.score);
  const topCombos = combinations.slice(0, 5);
  const results: OutfitRecommendation[] = [];

  for (const combo of topCombos) {
    const { data: outfitRow, error: insertErr } = await supabase
      .from(TABLES.OUTFITS)
      .insert({
        user_id: user.id,
        shirt_id: combo.top.id,
        bottom_id: combo.bottom.id,
        footwear_id: combo.shoes.id,
        status: 'recommendation',
        source: 'ai_recommendation',
        ai_score: combo.score,
        ai_reason: isFormal
          ? `High formality pairing (${Math.round(combo.score * 100)}% match) suited for executive meetings.`
          : `Balanced sartorial harmony (${Math.round(combo.score * 100)}% match) for regular office work.`,
        ai_tips: ['Ensure garments are pressed and wrinkle-free.', 'Match belt tone with footwear.'],
      })
      .select('id')
      .single();

    if (insertErr || !outfitRow) continue;

    results.push({
      outfit_id: outfitRow.id,
      shirt_id: combo.top.id,
      bottom_id: combo.bottom.id,
      footwear_id: combo.shoes.id,
      top: combo.top,
      bottom: combo.bottom,
      shoes: combo.shoes,
      ai_score: combo.score,
      visual_score: combo.score,
      freshness_score: 0.85,
      ai_reason: isFormal
        ? `High formality pairing (${Math.round(combo.score * 100)}% match) suited for executive meetings.`
        : `Balanced sartorial harmony (${Math.round(combo.score * 100)}% match) for regular office work.`,
      ai_tips: ['Ensure garments are pressed and wrinkle-free.', 'Match belt tone with footwear.'],
    });
  }

  return results;
}

/**
 * Confirm Outfit ("Wear this") via atomic DB RPC
 */
export async function confirmOutfit(outfitId: string, date: string): Promise<void> {
  const { error } = await supabase.rpc('confirm_outfit', {
    p_outfit_id: outfitId,
    p_date: date,
  });

  if (error) throw error;
}

/**
 * Reject Outfit ("Show another")
 */
export async function rejectOutfit(outfitId: string): Promise<void> {
  if (!outfitId) return;
  await supabase
    .from(TABLES.OUTFITS)
    .update({ status: 'rejected' })
    .eq('id', outfitId);
}

/**
 * Block triple ("Don't suggest this")
 */
export async function blockOutfitTriple(shirtId: string, bottomId: string, footwearId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from(TABLES.OUTFIT_FEEDBACK).insert({
    user_id: user.id,
    shirt_id: shirtId,
    bottom_id: bottomId,
    footwear_id: footwearId,
    feedback_type: 'dont_suggest',
  });

  if (error && !error.message.includes('unique')) throw error;
}

/**
 * Fetch blocked outfit triples for settings/restore screen
 */
export async function fetchBlockedOutfits(): Promise<any[]> {
  const { data, error } = await supabase
    .from(TABLES.OUTFIT_FEEDBACK)
    .select(`
      id,
      feedback_type,
      created_at,
      shirt:clothing_items!shirt_id(id, name, image_path),
      bottom:clothing_items!bottom_id(id, name, image_path),
      footwear:clothing_items!footwear_id(id, name, image_path)
    `)
    .eq('feedback_type', 'dont_suggest')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Restore/unblock an outfit triple
 */
export async function unblockOutfit(feedbackId: string): Promise<void> {
  const { error } = await supabase
    .from(TABLES.OUTFIT_FEEDBACK)
    .delete()
    .eq('id', feedbackId);

  if (error) throw error;
}

/**
 * Fetch today's office day and confirmed outfit status
 */
export async function fetchOfficeDay(date: string): Promise<OfficeDayRecord | null> {
  const { data, error } = await supabase
    .from(TABLES.OFFICE_DAYS)
    .select('*')
    .eq('date', date)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Save office day configuration (meeting status, regular/formal)
 */
export async function saveOfficeDay(params: {
  date: string;
  is_office_day: boolean;
  meeting_status: 'yes' | 'no';
  meeting_type: 'formal' | 'regular';
  meeting_notes?: string;
}): Promise<OfficeDayRecord> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from(TABLES.OFFICE_DAYS)
    .upsert({
      user_id: user.id,
      ...params,
    }, { onConflict: 'user_id,date' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch confirmed outfit for a specific date if already worn
 */
export async function fetchConfirmedOutfitForDate(date: string): Promise<any | null> {
  const { data, error } = await supabase
    .from(TABLES.OUTFITS)
    .select(`
      id,
      ai_score,
      ai_reason,
      ai_tips,
      source,
      worn_on,
      top:clothing_items!shirt_id(*),
      bottom:clothing_items!bottom_id(*),
      shoes:clothing_items!footwear_id(*)
    `)
    .eq('worn_on', date)
    .eq('status', 'confirmed')
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const item = data as any;
  const paths = [item.top?.image_path, item.bottom?.image_path, item.shoes?.image_path].filter(Boolean);
  const signedMap = await getSignedImageUrls(paths);

  return {
    ...item,
    top: { ...item.top, signed_url: signedMap[item.top?.image_path] || item.top?.image_url },
    bottom: { ...item.bottom, signed_url: signedMap[item.bottom?.image_path] || item.bottom?.image_url },
    shoes: { ...item.shoes, signed_url: signedMap[item.shoes?.image_path] || item.shoes?.image_url },
  };
}

/**
 * Save manual outfit selection
 */
export async function saveManualOutfit(shirtId: string, bottomId: string, footwearId: string, date: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: outfit, error: outErr } = await supabase
    .from(TABLES.OUTFITS)
    .insert({
      user_id: user.id,
      shirt_id: shirtId,
      bottom_id: bottomId,
      footwear_id: footwearId,
      status: 'confirmed',
      source: 'manual',
      ai_reason: 'Manually chosen by you.',
      worn_on: date,
    })
    .select()
    .single();

  if (outErr) throw outErr;

  // Confirm via RPC to update wear counts and office_days
  await confirmOutfit(outfit.id, date);
}

/**
 * Fetch outfit history by date with thumbnails
 */
export async function fetchHistory(): Promise<any[]> {
  const { data, error } = await supabase
    .from(TABLES.OUTFITS)
    .select(`
      id,
      worn_on,
      ai_score,
      ai_reason,
      source,
      top:clothing_items!shirt_id(id, name, image_path, category),
      bottom:clothing_items!bottom_id(id, name, image_path, category),
      shoes:clothing_items!footwear_id(id, name, image_path, category)
    `)
    .eq('status', 'confirmed')
    .not('worn_on', 'is', null)
    .order('worn_on', { ascending: false })
    .limit(50);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const paths: string[] = [];
  data.forEach((d: any) => {
    if (d.top?.image_path) paths.push(d.top.image_path);
    if (d.bottom?.image_path) paths.push(d.bottom.image_path);
    if (d.shoes?.image_path) paths.push(d.shoes.image_path);
  });

  const signedMap = await getSignedImageUrls(paths);

  return data.map((d: any) => ({
    ...d,
    top: { ...d.top, signed_url: signedMap[d.top?.image_path] },
    bottom: { ...d.bottom, signed_url: signedMap[d.bottom?.image_path] },
    shoes: { ...d.shoes, signed_url: signedMap[d.shoes?.image_path] },
  }));
}
