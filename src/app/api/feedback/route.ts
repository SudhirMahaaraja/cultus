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
  console.log('[GET /api/feedback] Fetching outfit feedback from Supabase...');
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[GET /api/feedback] Supabase not configured');
    return NextResponse.json({ status: 'error', message: 'Supabase not configured' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from(SUPABASE_CONFIG.FEEDBACK_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET /api/feedback] Supabase error:', error.code, error.message);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }

  console.log(`[GET /api/feedback] Returned ${data?.length ?? 0} feedback record(s)`);
  return NextResponse.json({ status: 'success', data });
}

export async function POST(req: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[POST /api/feedback] Supabase not configured');
    return NextResponse.json({ status: 'error', message: 'Supabase not configured' }, { status: 400 });
  }

  try {
    const item = await req.json();
    console.log(`[POST /api/feedback] Recording feedback type="${item.feedback_type}" — shirt: ${item.shirt_id}, bottom: ${item.bottom_id}`);

    if (!UUID_REGEX.test(item.shirt_id) || !UUID_REGEX.test(item.bottom_id) || !UUID_REGEX.test(item.footwear_id)) {
      console.warn('[POST /api/feedback] Skipping — item IDs are not Supabase UUIDs (local-only garments)');
      return NextResponse.json({ status: 'skipped', reason: 'IDs are not Supabase UUIDs — feedback recorded locally only' });
    }

    const payload = {
      shirt_id: item.shirt_id,
      bottom_id: item.bottom_id,
      footwear_id: item.footwear_id,
      feedback_type: item.feedback_type,
      reason: item.reason || null,
    };

    const { data, error } = await supabase.from(SUPABASE_CONFIG.FEEDBACK_TABLE).insert([payload]).select();

    if (error) {
      console.error('[POST /api/feedback] Supabase insert error:', error.code, error.message);
      return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
    }

    console.log(`[POST /api/feedback] Feedback saved with id: ${data[0]?.id}`);
    return NextResponse.json({ status: 'success', data: data[0] });
  } catch (e) {
    console.error('[POST /api/feedback] Unexpected error:', e);
    return NextResponse.json({ status: 'error', error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[DELETE /api/feedback] Supabase not configured');
    return NextResponse.json({ status: 'error', message: 'Supabase not configured' }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id || !UUID_REGEX.test(id)) {
      console.warn(`[DELETE /api/feedback] Skipping — "${id}" is not a Supabase UUID`);
      return NextResponse.json({ status: 'success', note: 'local-only feedback, nothing to delete from Supabase' });
    }

    console.log(`[DELETE /api/feedback] Deleting feedback id: ${id}`);
    const { error } = await supabase.from(SUPABASE_CONFIG.FEEDBACK_TABLE).delete().eq('id', id);

    if (error) {
      console.error('[DELETE /api/feedback] Supabase delete error:', error.message);
      return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
    }

    console.log(`[DELETE /api/feedback] Deleted successfully: ${id}`);
    return NextResponse.json({ status: 'success' });
  } catch (e) {
    console.error('[DELETE /api/feedback] Unexpected error:', e);
    return NextResponse.json({ status: 'error', error: (e as Error).message }, { status: 500 });
  }
}
