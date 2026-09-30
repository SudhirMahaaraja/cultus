// Supabase React Native Client Setup with AsyncStorage and Image URL Cache
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { STORAGE } from '../config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// In-memory cache for signed URLs: storagePath -> { url: string, expiresAt: number }
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL_SECONDS = 3600; // 1 hour

/**
 * Batched retrieval and caching of signed URLs for private storage images
 */
export async function getSignedImageUrls(
  storagePaths: string[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const pathsToFetch: string[] = [];
  const now = Date.now();

  for (const path of storagePaths) {
    if (!path) continue;

    // If it's already a full HTTP URL (e.g. legacy/mock data), use it directly
    if (path.startsWith('http://') || path.startsWith('https://')) {
      result[path] = path;
      continue;
    }

    const cached = signedUrlCache.get(path);
    // Buffer by 5 minutes before expiration
    if (cached && cached.expiresAt > now + 300_000) {
      result[path] = cached.url;
    } else {
      pathsToFetch.push(path);
    }
  }

  if (pathsToFetch.length > 0) {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE.BUCKET)
        .createSignedUrls(pathsToFetch, CACHE_TTL_SECONDS);

      if (error) {
        console.error('Failed to create signed URLs:', error.message);
      } else if (data) {
        data.forEach((item) => {
          if (item.signedUrl && item.path) {
            result[item.path] = item.signedUrl;
            signedUrlCache.set(item.path, {
              url: item.signedUrl,
              expiresAt: now + CACHE_TTL_SECONDS * 1000,
            });
          }
        });
      }
    } catch (err) {
      console.error('createSignedUrls network error:', err);
    }
  }

  return result;
}

/**
 * Single signed URL helper with cache
 */
export async function getSingleSignedImageUrl(storagePath: string): Promise<string> {
  if (!storagePath) return '';
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return storagePath;
  }
  const urls = await getSignedImageUrls([storagePath]);
  return urls[storagePath] || '';
}
