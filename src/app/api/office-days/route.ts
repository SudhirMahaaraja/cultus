// @maintained 2026-09-25T14:46:30.205Z
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '@/lib/supabase/config';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function GET() {
  console.log('[GET /api/office-days] Fetching office day records from Supabase...');
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[GET /api/office-days] Supabase not configured');
    return NextResponse.json({ status: 'error', message: 'Supabase not configured' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from(SUPABASE_CONFIG.OFFICE_DAYS_TABLE)
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('[GET /api/office-days] Supabase error:', error.code, error.message);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }

  console.log(`[GET /api/office-days] Returned ${data?.length ?? 0} office day record(s)`);
  return NextResponse.json({ status: 'success', data });
}

export async function POST(req: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[POST /api/office-days] Supabase not configured');
    return NextResponse.json({ status: 'error', message: 'Supabase not configured' }, { status: 400 });
  }

  try {
    const item = await req.json();
    console.log(`[POST /api/office-days] Upserting office day: date=${item.date}, meeting_status=${item.meeting_status}, type=${item.meeting_type}`);

    const payload = {
      date: item.date,
      is_office_day: item.is_office_day ?? true,
      meeting_status: item.meeting_status,
      meeting_type: item.meeting_type || 'regular',
      confirmed_outfit_id: item.confirmed_outfit_id || null,
    };

    const { data, error } = await supabase
      .from(SUPABASE_CONFIG.OFFICE_DAYS_TABLE)
      .upsert([payload], { onConflict: 'date' })
      .select();

    if (error) {
      console.error('[POST /api/office-days] Supabase upsert error:', error.code, error.message);
      return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
    }

    console.log(`[POST /api/office-days] Office day upserted: id=${data?.[0]?.id}`);
    return NextResponse.json({ status: 'success', data: data?.[0] });
  } catch (e) {
    console.error('[POST /api/office-days] Unexpected error:', e);
    return NextResponse.json({ status: 'error', error: (e as Error).message }, { status: 500 });
  }
}
