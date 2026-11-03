import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import multer from 'multer';
import { supabase, GARMENTS_TABLE, BUCKET_NAME } from './config/supabase';
import { openai } from './config/openai';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const port = process.env.PORT || 5000;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or from local dev networks
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in development for seamless mobile testing
  },
  credentials: true,
}));

app.use((req, _res, next) => {
  if (req.url.startsWith('//')) {
    req.url = req.url.replace(/^\/+/, '/');
  }
  next();
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Helper: resolve primary user_id for row-level security / non-null constraint
async function getUserId(): Promise<string> {
  if (process.env.DEFAULT_USER_ID) {
    return process.env.DEFAULT_USER_ID;
  }
  try {
    const { data } = await supabase.auth.admin.listUsers();
    if (data?.users && data.users.length > 0) {
      return data.users[0].id;
    }
  } catch (err) {
    console.warn('Could not query users list, falling back to verified user ID:', err);
  }
  return 'eeaaef9b-5db6-442a-bb35-67eaed42f2a1';
}

// Database Check Constraint Normalizers
function normalizePattern(val?: string | null): string {
  if (!val) return 'solid';
  const lower = val.toLowerCase().trim();
  if (lower.includes('stripe') || lower === 'striped') return 'stripes';
  if (lower.includes('check') || lower.includes('plaid') || lower.includes('tartan') || lower.includes('gingham')) return 'checks';
  if (lower === 'solid' || lower === 'plain' || lower === 'none' || lower === 'monochrome') return 'solid';
  if (['solid', 'stripes', 'checks', 'other'].includes(lower)) return lower;
  return 'other';
}

function normalizeCategory(val?: string | null): 'top' | 'bottom' | 'shoes' {
  if (!val) return 'top';
  const lower = val.toLowerCase().trim();
  if (['bottom', 'bottoms', 'pants', 'trousers', 'shorts', 'jeans', 'skirt', 'chinos'].includes(lower)) return 'bottom';
  if (['shoes', 'shoe', 'footwear', 'sneakers', 'boots', 'loafers', 'derbies', 'oxfords'].includes(lower)) return 'shoes';
  return 'top';
}

function normalizeStyle(val?: string | null): string {
  if (!val) return 'casual';
  const lower = val.toLowerCase().trim().replace(/[-\s]/g, '_');
  const allowed = ['casual', 'business_casual', 'formal', 'smart_casual', 'minimal_casual'];
  if (allowed.includes(lower)) return lower;
  if (lower.includes('formal')) return 'formal';
  if (lower.includes('business')) return 'business_casual';
  if (lower.includes('smart')) return 'smart_casual';
  if (lower.includes('minimal')) return 'minimal_casual';
  return 'casual';
}

function normalizeWeaveKnit(val?: string | null): string {
  if (!val) return 'standard';
  const lower = val.toLowerCase().trim();
  const allowed = ['plain', 'twill', 'satin', 'knit', 'denim', 'leather', 'standard', 'other'];
  if (allowed.includes(lower)) return lower;
  if (lower.includes('knit') || lower.includes('wool')) return 'knit';
  if (lower.includes('denim')) return 'denim';
  if (lower.includes('leather') || lower.includes('suede')) return 'leather';
  if (lower.includes('twill')) return 'twill';
  if (lower.includes('satin') || lower.includes('silk')) return 'satin';
  if (lower.includes('cotton') || lower.includes('plain')) return 'plain';
  return 'standard';
}

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'clutus-server',
  });
});

// Helper: resolve signed image URL for private Supabase bucket
async function resolveGarmentImageUrl(item: any): Promise<string> {
  if (item.image_url && item.image_url.startsWith('http') && !item.image_url.includes('/object/public/')) {
    return item.image_url;
  }
  if (item.image_path) {
    const { data: signedData, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(item.image_path, 60 * 60 * 24 * 7); // 7 days
    if (!error && signedData?.signedUrl) {
      return signedData.signedUrl;
    }
  }
  return item.image_url || '';
}

// GET /api/garments - Fetch all garments with signed URLs
app.get('/api/garments', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from(GARMENTS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching garments from Supabase:', error.message);
      return res.status(500).json({ error: error.message });
    }

    const garments = await Promise.all(
      (data || []).map(async (item) => {
        const resolvedUrl = await resolveGarmentImageUrl(item);
        return {
          ...item,
          image_url: resolvedUrl,
        };
      })
    );

    return res.json({ garments });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('Unexpected error fetching garments:', message);
    return res.status(500).json({ error: message });
  }
});

// POST /api/garments/upload - Real image upload + OpenAI/Azure Vision attribute extraction
app.post('/api/garments/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }

    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `uploads/${Date.now()}_${sanitizedName}`;

    // 1. Upload raw image buffer to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading to Supabase storage:', uploadError.message);
      return res.status(500).json({ error: `Storage upload failed: ${uploadError.message}` });
    }

    // 2. Generate signed URL for immediate preview and client rendering
    const { data: signedData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

    const imageUrl = signedData?.signedUrl || '';

    // 3. AI Analysis with Vision API
    let rawAi: any = {
      name: file.originalname.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      category: 'top',
      garment_type: 'garment',
      color: 'neutral',
      pattern: 'solid',
      weave_knit: 'standard',
      style: 'casual',
      office_suitability: 0.6,
      formal_meeting_suitability: 0.5,
    };

    if (process.env.OPENAI_API_KEY) {
      try {
        const base64Image = file.buffer.toString('base64');
        const mime = file.mimetype || 'image/jpeg';
        const response = await openai.chat.completions.create({
          model: process.env.OPENAI_LLM || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert fashion stylist. Return ONLY valid JSON with keys:\n' +
                '- name (short descriptive title)\n' +
                '- category (must be exactly one of: "top", "bottom", "shoes")\n' +
                '- garment_type (e.g. shirt, t-shirt, trousers, denim, sneakers, loafers, blazer)\n' +
                '- color (primary color name, e.g. navy, white, olive, black)\n' +
                '- pattern (must be exactly one of: "solid", "stripes", "checks", "other")\n' +
                '- weave_knit (must be exactly one of: "plain", "twill", "satin", "knit", "denim", "leather", "standard", "other")\n' +
                '- style (must be exactly one of: "casual", "business_casual", "formal", "smart_casual", "minimal_casual")\n' +
                '- office_suitability (number between 0.0 and 1.0)\n' +
                '- formal_meeting_suitability (number between 0.0 and 1.0)'
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze this garment image and extract accurate fashion attributes in JSON.' },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mime};base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 300,
        });

        const rawContent = response.choices[0]?.message?.content;
        if (rawContent) {
          rawAi = { ...rawAi, ...JSON.parse(rawContent) };
        }
      } catch (aiErr) {
        console.warn('Vision parsing fallback used:', aiErr);
      }
    }

    // Strictly normalize attributes to satisfy PostgreSQL check constraints
    const cleanCategory = normalizeCategory(rawAi.category);
    const cleanPattern = normalizePattern(rawAi.pattern);
    const cleanStyle = normalizeStyle(rawAi.style);
    const cleanWeave = normalizeWeaveKnit(rawAi.weave_knit);
    const cleanOfficeSuitability = Math.max(0, Math.min(1, Number(rawAi.office_suitability) || 0.6));
    const cleanFormalSuitability = Math.max(0, Math.min(1, Number(rawAi.formal_meeting_suitability) || 0.5));

    // 4. Resolve verified user_id and commit garment into Supabase table
    const userId = await getUserId();
    const { data: newGarment, error: insertError } = await supabase
      .from(GARMENTS_TABLE)
      .insert({
        user_id: userId,
        name: rawAi.name || 'Custom Garment',
        category: cleanCategory,
        garment_type: rawAi.garment_type || cleanCategory,
        color: rawAi.color || 'neutral',
        pattern: cleanPattern,
        weave_knit: cleanWeave,
        style: cleanStyle,
        office_suitability: cleanOfficeSuitability,
        formal_meeting_suitability: cleanFormalSuitability,
        image_path: storagePath,
        image_url: imageUrl,
        active: true,
        wear_count: 0,
        analysis_model: process.env.OPENAI_LLM || 'gpt-4o-mini',
        analysis_version: 'v1',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving garment to database:', insertError.message);
      return res.status(500).json({ error: `Database insert failed: ${insertError.message}` });
    }

    return res.json({
      garment: {
        ...newGarment,
        image_url: imageUrl,
      },
      attributes: {
        category: cleanCategory,
        pattern: cleanPattern,
        style: cleanStyle,
        weave_knit: cleanWeave,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown upload error';
    console.error('Unexpected error in upload pipeline:', message);
    return res.status(500).json({ error: message });
  }
});

// PATCH /api/garments/:id - Update garment properties
app.patch('/api/garments/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  // Normalize if constrained attributes are updated
  if (updates.pattern) updates.pattern = normalizePattern(updates.pattern);
  if (updates.category) updates.category = normalizeCategory(updates.category);
  if (updates.style) updates.style = normalizeStyle(updates.style);
  if (updates.weave_knit) updates.weave_knit = normalizeWeaveKnit(updates.weave_knit);

  try {
    const { data, error } = await supabase
      .from(GARMENTS_TABLE)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating garment:', error.message);
      return res.status(500).json({ error: error.message });
    }

    const resolvedUrl = await resolveGarmentImageUrl(data);

    return res.json({ garment: { ...data, image_url: resolvedUrl } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('Unexpected error updating garment:', message);
    return res.status(500).json({ error: message });
  }
});

// DELETE /api/garments/:id - Delete a garment
app.delete('/api/garments/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from(GARMENTS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting garment:', error.message);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('Unexpected error deleting garment:', message);
    return res.status(500).json({ error: message });
  }
});

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Clutus server listening on http://0.0.0.0:${port}`);
});

export default app;
