import { NextResponse } from 'next/server';
import { testSupabaseConnection } from '@/lib/supabase/testConnection';
import { SUPABASE_CONFIG } from '@/lib/supabase/config';

export async function GET() {
  const results = await testSupabaseConnection();
  return NextResponse.json({
    status: 'completed',
    config: {
      garments_table: SUPABASE_CONFIG.GARMENTS_TABLE,
      outfits_table: SUPABASE_CONFIG.OUTFITS_TABLE,
      office_days_table: SUPABASE_CONFIG.OFFICE_DAYS_TABLE,
      feedback_table: SUPABASE_CONFIG.FEEDBACK_TABLE,
      storage_bucket: SUPABASE_CONFIG.STORAGE_BUCKET,
    },
    results,
  });
}
