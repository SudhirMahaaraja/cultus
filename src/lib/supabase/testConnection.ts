import { createClient } from './client';
import { SUPABASE_CONFIG } from './config';

export async function testSupabaseConnection() {
  const supabase = createClient();
  const results: Record<string, { success: boolean; message?: string; count?: number }> = {};

  // 1. Test Garments Table
  try {
    const { data, error } = await supabase.from(SUPABASE_CONFIG.GARMENTS_TABLE).select('id').limit(1);
    if (error) results.garments_table = { success: false, message: error.message };
    else results.garments_table = { success: true, count: data?.length || 0 };
  } catch (err) {
    results.garments_table = { success: false, message: (err as Error).message };
  }

  // 2. Test Outfits Table
  try {
    const { data, error } = await supabase.from(SUPABASE_CONFIG.OUTFITS_TABLE).select('id').limit(1);
    if (error) results.outfits_table = { success: false, message: error.message };
    else results.outfits_table = { success: true, count: data?.length || 0 };
  } catch (err) {
    results.outfits_table = { success: false, message: (err as Error).message };
  }

  // 3. Test Office Days Table
  try {
    const { data, error } = await supabase.from(SUPABASE_CONFIG.OFFICE_DAYS_TABLE).select('id').limit(1);
    if (error) results.office_days_table = { success: false, message: error.message };
    else results.office_days_table = { success: true, count: data?.length || 0 };
  } catch (err) {
    results.office_days_table = { success: false, message: (err as Error).message };
  }

  // 4. Test Feedback Table
  try {
    const { data, error } = await supabase.from(SUPABASE_CONFIG.FEEDBACK_TABLE).select('id').limit(1);
    if (error) results.feedback_table = { success: false, message: error.message };
    else results.feedback_table = { success: true, count: data?.length || 0 };
  } catch (err) {
    results.feedback_table = { success: false, message: (err as Error).message };
  }

  // 5. Test Storage Bucket Access
  try {
    const { data, error } = await supabase.storage.from(SUPABASE_CONFIG.STORAGE_BUCKET).list('', { limit: 1 });
    if (error) results.storage_bucket = { success: false, message: error.message };
    else results.storage_bucket = { success: true, count: data?.length || 0 };
  } catch (err) {
    results.storage_bucket = { success: false, message: (err as Error).message };
  }

  return results;
}
