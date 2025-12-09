import { Buffer } from 'node:buffer';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'course-covers';

export interface PersistCourseCoverInput {
  courseId: string;
  locale: 'en' | 'es';
  prompt: string;
  model?: string | null;
  provider?: string | null;
  base64Data: string;
  mimeType: string;
  source?: string;
}

interface CourseCoverRecord {
  course_id: string;
  locale: string;
  prompt: string;
  model: string | null;
  provider: string | null;
  image_url: string;
  storage_path: string;
  source: string | null;
  created_at: string;
}

let supabaseAdmin: SupabaseClient | null = null;
let bucketEnsured = false;

function getSupabaseAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('course-covers helpers must run on the server');
  }

  if (!supabaseAdmin) {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      throw new Error('Supabase admin credentials missing for course covers');
    }

    supabaseAdmin = createClient(url, serviceKey, {
      auth: { persistSession: false },
      global: { headers: { 'X-Client-Info': 'ThotNet-CourseCovers' } },
    });
  }

  return supabaseAdmin;
}

async function ensureBucket(client: SupabaseClient) {
  if (bucketEnsured) return;
  const { data, error } = await client.storage.getBucket(BUCKET_NAME);
  if (error || !data) {
    const { error: createError } = await client.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: '10485760',
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    });
    if (createError) throw createError;
  }
  bucketEnsured = true;
}

export async function persistCourseCover(input: PersistCourseCoverInput): Promise<CourseCoverRecord> {
  const client = getSupabaseAdminClient();
  await ensureBucket(client);

  const buffer = Buffer.from(input.base64Data, 'base64');
  const extension = input.mimeType.includes('png') ? 'png' : input.mimeType.includes('webp') ? 'webp' : 'jpg';
  const timestamp = Date.now();
  const path = `${input.courseId}/cover-${input.locale}-${timestamp}.${extension}`;

  const { error: uploadError } = await client.storage.from(BUCKET_NAME).upload(path, buffer, {
    contentType: input.mimeType,
    cacheControl: '31536000',
    upsert: true,
  });

  if (uploadError) throw uploadError;

  const { data: urlData } = client.storage.from(BUCKET_NAME).getPublicUrl(path);
  const imageUrl = urlData?.publicUrl ?? '';

  const { data, error } = await client
    .from('course_covers')
    .insert({
      course_id: input.courseId,
      locale: input.locale,
      prompt: input.prompt.slice(0, 2000),
      model: input.model ?? null,
      provider: input.provider ?? null,
      image_url: imageUrl,
      storage_path: path,
      source: input.source ?? 'script',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as CourseCoverRecord;
}

/**
 * Fetch the latest cover for a course
 */
export async function fetchCourseCover(
  courseId: string,
  locale: 'en' | 'es'
): Promise<CourseCoverRecord | null> {
  const client = getSupabaseAdminClient();
  
  const { data, error } = await client
    .from('course_covers')
    .select('*')
    .eq('course_id', courseId)
    .eq('locale', locale)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[CourseCover] Failed to fetch:', error.message);
    return null;
  }

  return data as CourseCoverRecord | null;
}

/**
 * Check if a course cover exists
 */
export async function courseCoverExists(
  courseId: string,
  locale: 'en' | 'es'
): Promise<boolean> {
  const client = getSupabaseAdminClient();
  
  const { data } = await client
    .from('course_covers')
    .select('id')
    .eq('course_id', courseId)
    .eq('locale', locale)
    .maybeSingle();

  return !!data;
}
