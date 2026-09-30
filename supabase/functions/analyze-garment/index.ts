/// <reference path="../deno.d.ts" />
// Edge Function: analyze-garment
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { callAzureOpenAI } from '../_shared/azure.ts';
import {
  GARMENT_ANALYSIS_SYSTEM_PROMPT,
  GARMENT_ANALYSIS_SCHEMA,
  PROMPTS_VERSION,
} from '../_shared/prompts.ts';
import {
  CATEGORIES,
  GARMENT_TYPES,
  COLOR_PALETTE,
  PATTERNS,
  STYLES,
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

    const body = await req.json();
    const { image_path, image_url, base64_image } = body;

    let targetImageUrl = image_url;

    // If storage image_path is provided, create a temporary signed download URL
    if (!targetImageUrl && image_path) {
      const { data: signedData, error: signErr } = await supabase.storage
        .from('garment-images')
        .createSignedUrl(image_path, 300);

      if (signErr || !signedData?.signedUrl) {
        throw new Error(`Failed to create signed URL for image_path: ${signErr?.message}`);
      }
      targetImageUrl = signedData.signedUrl;
    } else if (base64_image) {
      targetImageUrl = base64_image.startsWith('data:')
        ? base64_image
        : `data:image/jpeg;base64,${base64_image}`;
    }

    if (!targetImageUrl) {
      return new Response(JSON.stringify({ error: 'Must provide image_path, image_url, or base64_image' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call Azure OpenAI with Vision
    const messages = [
      {
        role: 'system' as const,
        content: GARMENT_ANALYSIS_SYSTEM_PROMPT,
      },
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: 'Analyze this garment according to Cultus Modern Sartorial Vision visual requirements.' },
          {
            type: 'image_url' as const,
            image_url: { url: targetImageUrl },
          },
        ],
      },
    ];

    const rawResult = await callAzureOpenAI(messages, {
      name: 'garment_analysis',
      schema: GARMENT_ANALYSIS_SCHEMA,
    });

    // Validate and sanitize outputs
    const category = CATEGORIES.includes(rawResult.category) ? rawResult.category : 'top';
    const garment_type = GARMENT_TYPES.includes(rawResult.garment_type) ? rawResult.garment_type : 'other';
    const dominant_colors = Array.isArray(rawResult.dominant_colors)
      ? rawResult.dominant_colors.filter((c: string) => COLOR_PALETTE.includes(c as any))
      : ['other'];
    const secondary_colors = Array.isArray(rawResult.secondary_colors)
      ? rawResult.secondary_colors.filter((c: string) => COLOR_PALETTE.includes(c as any))
      : [];
    const pattern = PATTERNS.includes(rawResult.pattern) ? rawResult.pattern : 'solid';
    const style = STYLES.includes(rawResult.style) ? rawResult.style : 'business_casual';

    // Clamp numeric ratings (0.0 to 1.0)
    const office_suitability = Math.max(0, Math.min(1, Number(rawResult.office_suitability) || 0.5));
    const formal_meeting_suitability = Math.max(0, Math.min(1, Number(rawResult.formal_meeting_suitability) || 0.5));
    const climate_practicality = Math.max(0, Math.min(1, Number(rawResult.climate_practicality) || 0.5));
    const rotation_versatility = Math.max(0, Math.min(1, Number(rawResult.rotation_versatility) || 0.5));
    const confidence = Math.max(0, Math.min(1, Number(rawResult.confidence) || 0.8));

    // Auto-generate a clean, concise name
    const mainColor = dominant_colors[0] ? dominant_colors[0].replace('_', ' ') : '';
    const cleanType = garment_type.replace('_', ' ');
    const autoName = `${mainColor} ${cleanType}`.trim();
    const capitalizedName = autoName.charAt(0).toUpperCase() + autoName.slice(1);

    const analysis = {
      name: capitalizedName,
      category,
      garment_type,
      dominant_colors,
      secondary_colors,
      primary_color: dominant_colors[0] || 'other',
      color_temperature: rawResult.color_temperature || 'neutral',
      pattern,
      pattern_scale: rawResult.pattern_scale || 'none',
      weave_knit: rawResult.weave_knit || 'plain',
      texture: rawResult.texture || 'smooth',
      shoe_material: rawResult.shoe_material || (category === 'shoes' ? 'smooth_leather' : 'not_applicable'),
      silhouette: rawResult.silhouette || 'straight',
      style,
      fit: rawResult.fit || 'regular',
      sleeve: rawResult.sleeve || (category === 'top' ? 'long' : 'none'),
      office_suitability,
      formal_meeting_suitability,
      climate_practicality,
      rotation_versatility,
      condition: rawResult.condition || 'good',
      visual_summary: rawResult.visual_summary || `${capitalizedName} in ${style.replace('_', ' ')} style.`,
      confidence,
      analysis_model: Deno.env.get('OPENAI_LLM') || 'gpt-4o-mini',
      analysis_version: PROMPTS_VERSION,
      raw_analysis: rawResult,
    };

    return new Response(JSON.stringify({ success: true, analysis }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('analyze-garment error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Analysis failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
