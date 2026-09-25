// @maintained 2026-09-25T14:46:30.206Z
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '@/lib/supabase/config';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function GET() {
  console.log('[GET /api/outfits] Fetching past outfit records from Supabase...');
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[GET /api/outfits] Supabase not configured');
    return NextResponse.json({ status: 'error', message: 'Supabase not configured' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from(SUPABASE_CONFIG.OUTFITS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET /api/outfits] Supabase error:', error.code, error.message);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }

  console.log(`[GET /api/outfits] Returned ${data?.length ?? 0} outfit record(s)`);
  return NextResponse.json({ status: 'success', data });
}

export async function POST(req: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[POST /api/outfits] Supabase not configured');
    return NextResponse.json({ status: 'error', message: 'Supabase not configured' }, { status: 400 });
  }

  try {
    const item = await req.json();
    console.log(`[POST /api/outfits] Recording outfit worn on ${item.worn_on} — shirt: ${item.shirt_id}, bottom: ${item.bottom_id}, footwear: ${item.footwear_id}`);

    if (!UUID_REGEX.test(item.shirt_id) || !UUID_REGEX.test(item.bottom_id) || !UUID_REGEX.test(item.footwear_id)) {
      console.warn('[POST /api/outfits] Skipping — item IDs are not Supabase UUIDs (local-only garments)');
      return NextResponse.json({ status: 'skipped', reason: 'IDs are not Supabase UUIDs — outfit recorded locally only' });
    }

    const payload = {
      shirt_id: item.shirt_id,
      bottom_id: item.bottom_id,
      footwear_id: item.footwear_id,
      meeting_status: item.meeting_status,
      status: item.status || 'confirmed',
      worn_on: item.worn_on || new Date().toISOString().split('T')[0],
      source: item.source || 'ai_recommendation',
      ai_reason: item.ai_reason || null,
    };

    const { data, error } = await supabase.from(SUPABASE_CONFIG.OUTFITS_TABLE).insert([payload]).select();

    if (error) {
      console.error('[POST /api/outfits] Supabase insert error:', error.code, error.message);
      return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
    }

    console.log(`[POST /api/outfits] Outfit saved with id: ${data[0]?.id}`);
    return NextResponse.json({ status: 'success', data: data[0] });
  } catch (e) {
    console.error('[POST /api/outfits] Unexpected error:', e);
    return NextResponse.json({ status: 'error', error: (e as Error).message }, { status: 500 });
  }
}
