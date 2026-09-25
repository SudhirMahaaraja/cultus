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

/** Uses service role key for storage uploads (bypasses RLS — server-side only). */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  console.log('[GET /api/garments] Fetching all clothing items from Supabase...');
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[GET /api/garments] Supabase not configured');
    return NextResponse.json({ status: 'error', message: 'Supabase credentials missing' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from(SUPABASE_CONFIG.GARMENTS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[GET /api/garments] Supabase error:', error.code, error.message);
    return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
  }

  console.log(`[GET /api/garments] Returned ${data?.length ?? 0} item(s)`);
  return NextResponse.json({ status: 'success', data });
}

export async function POST(req: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[POST /api/garments] Supabase not configured');
    return NextResponse.json({ status: 'error', message: 'Supabase credentials missing' }, { status: 400 });
  }

  try {
    const item = await req.json();
    console.log(`[POST /api/garments] Saving garment: "${item.name}" (category: ${item.category})`);

    let finalImageUrl = item.image_url;

    // Upload base64 image to Supabase Storage bucket if available
    if (item.image_url && typeof item.image_url === 'string' && item.image_url.startsWith('data:image/')) {
      try {
        const matches = item.image_url.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (matches) {
          const contentType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

          // Use service role client for upload — anon key lacks storage INSERT permission
          const adminClient = getSupabaseAdmin();
          console.log(`[POST /api/garments] Storage client: ${adminClient ? 'service-role' : 'anon (SUPABASE_SERVICE_ROLE_KEY missing)'}, bucket="${SUPABASE_CONFIG.STORAGE_BUCKET}"`);
          const storageClient = adminClient ?? supabase;

          const { data: uploadData, error: uploadError } = await storageClient.storage
            .from(SUPABASE_CONFIG.STORAGE_BUCKET)
            .upload(fileName, buffer, { contentType, upsert: true });

          if (!uploadError && uploadData) {
            const { data: publicUrlData } = storageClient.storage
              .from(SUPABASE_CONFIG.STORAGE_BUCKET)
              .getPublicUrl(fileName);
            if (publicUrlData?.publicUrl) {
              finalImageUrl = publicUrlData.publicUrl;
              console.log(`[POST /api/garments] Uploaded image to Supabase Storage bucket "${SUPABASE_CONFIG.STORAGE_BUCKET}": ${finalImageUrl}`);
            }
          } else {
            console.error(`[POST /api/garments] Storage upload failed — bucket="${SUPABASE_CONFIG.STORAGE_BUCKET}" error:`, uploadError?.message);
          }
        }
      } catch (err) {
        console.warn('[POST /api/garments] Storage upload error (falling back to data URL):', err);
      }
    }

    const payload = {
      category: item.category,
      name: item.name,
      image_url: finalImageUrl,
      active: item.active ?? true,
      ai_analysis: item.ai_analysis ?? {},
      analysis_model: item.analysis_model || 'azure-openai-gpt-4o-mini',
      wear_count: item.wear_count || 0,
      last_worn_at: item.last_worn_at || null,
    };

    const { data, error } = await supabase.from(SUPABASE_CONFIG.GARMENTS_TABLE).insert([payload]).select();

    if (error) {
      console.error('[POST /api/garments] Supabase insert error:', error.code, error.message);
      return NextResponse.json({ status: 'error', error: error.message, code: error.code }, { status: 500 });
    }

    console.log(`[POST /api/garments] Garment saved with Supabase UUID: ${data[0]?.id}`);
    return NextResponse.json({ status: 'success', data: data[0] });
  } catch (e) {
    console.error('[POST /api/garments] Unexpected error:', e);
    return NextResponse.json({ status: 'error', error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[DELETE /api/garments] Supabase not configured');
    return NextResponse.json({ status: 'error', message: 'Supabase credentials missing' }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ status: 'error', message: 'Missing item id' }, { status: 400 });
    }

    if (!UUID_REGEX.test(id)) {
      console.warn(`[DELETE /api/garments] Skipping — local id "${id}" is not a Supabase UUID`);
      return NextResponse.json({ status: 'success', note: 'local-only item, not in Supabase' });
    }

    console.log(`[DELETE /api/garments] Deleting item id: ${id}`);
    const { error } = await supabase.from(SUPABASE_CONFIG.GARMENTS_TABLE).delete().eq('id', id);

    if (error) {
      console.error('[DELETE /api/garments] Supabase delete error:', error.message);
      return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
    }

    console.log(`[DELETE /api/garments] Deleted successfully: ${id}`);
    return NextResponse.json({ status: 'success' });
  } catch (e) {
    console.error('[DELETE /api/garments] Unexpected error:', e);
    return NextResponse.json({ status: 'error', error: (e as Error).message }, { status: 500 });
  }
}
