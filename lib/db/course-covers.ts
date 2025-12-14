import { Buffer } from 'node:buffer';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'course-covers';

type Locale = 'en' | 'es';

export interface PersistCourseCoverInput {
  courseId: string;
  locale: Locale;
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

function inferExtension(mimeType: string) {
  const mt = mimeType.toLowerCase();
  if (mt.includes('png')) return 'png';
  if (mt.includes('webp')) return 'webp';
  return 'jpg';
}

async function uploadCoverImage(params: {
  client: SupabaseClient;
  courseId: string;
  storageBasename: string;
  base64Data: string;
  mimeType: string;
}): Promise<{ storagePath: string; imageUrl: string }> {
  const base64 = params.base64Data.includes('base64,')
    ? params.base64Data.slice(params.base64Data.indexOf('base64,') + 'base64,'.length)
    : params.base64Data;
  const buffer = Buffer.from(base64, 'base64');
  const extension = inferExtension(params.mimeType);
  const timestamp = Date.now();
  const path = `${params.courseId}/${params.storageBasename}-${timestamp}.${extension}`;

  const { error: uploadError } = await params.client.storage.from(BUCKET_NAME).upload(path, buffer, {
    contentType: params.mimeType,
    cacheControl: '31536000',
    upsert: true,
  });

  if (uploadError) throw uploadError;

  const { data: urlData } = params.client.storage.from(BUCKET_NAME).getPublicUrl(path);
  const imageUrl = urlData?.publicUrl ?? '';

  return { storagePath: path, imageUrl };
}

async function upsertCoverRow(client: SupabaseClient, row: {
  course_id: string;
  locale: Locale;
  prompt: string;
  model: string | null;
  provider: string | null;
  image_url: string;
  storage_path: string;
  source: string | null;
}): Promise<CourseCoverRecord> {
  // Prefer UPSERT (table is expected to have UNIQUE(course_id, locale)), but fall back to INSERT if needed.
  const { data, error } = await client
    .from('course_covers')
    .upsert(row, { onConflict: 'course_id,locale' })
    .select('*')
    .single();

  if (!error && data) return data as CourseCoverRecord;

  const message = typeof (error as unknown as { message?: unknown })?.message === 'string'
    ? (error as unknown as { message: string }).message
    : '';

  if (/no unique|no constraint|ON CONFLICT/i.test(message)) {
    const inserted = await client
      .from('course_covers')
      .insert(row)
      .select('*')
      .single();
    if (inserted.error) throw inserted.error;
    return inserted.data as CourseCoverRecord;
  }

  throw error;
}

export async function persistCourseCover(input: PersistCourseCoverInput): Promise<CourseCoverRecord> {
  const client = getSupabaseAdminClient();
  await ensureBucket(client);

  const uploaded = await uploadCoverImage({
    client,
    courseId: input.courseId,
    storageBasename: `cover-${input.locale}`,
    base64Data: input.base64Data,
    mimeType: input.mimeType,
  });

  return upsertCoverRow(client, {
    course_id: input.courseId,
    locale: input.locale,
    prompt: input.prompt.slice(0, 2000),
    model: input.model ?? null,
    provider: input.provider ?? null,
    image_url: uploaded.imageUrl,
    storage_path: uploaded.storagePath,
    source: input.source ?? 'script',
  });
}

/**
 * Persist a single shared cover image for multiple locales.
 * Uploads the image once and writes one row per locale referencing the same storage object.
 */
export async function persistCourseCoverShared(input: {
  courseId: string;
  locales: Locale[];
  prompt: string;
  model?: string | null;
  provider?: string | null;
  base64Data: string;
  mimeType: string;
  source?: string;
}): Promise<CourseCoverRecord[]> {
  const client = getSupabaseAdminClient();
  await ensureBucket(client);

  const locales = Array.from(new Set(input.locales));
  if (!locales.length) return [];

  const uploaded = await uploadCoverImage({
    client,
    courseId: input.courseId,
    storageBasename: 'cover-shared',
    base64Data: input.base64Data,
    mimeType: input.mimeType,
  });

  const records: CourseCoverRecord[] = [];
  for (const locale of locales) {
    records.push(
      await upsertCoverRow(client, {
        course_id: input.courseId,
        locale,
        prompt: input.prompt.slice(0, 2000),
        model: input.model ?? null,
        provider: input.provider ?? null,
        image_url: uploaded.imageUrl,
        storage_path: uploaded.storagePath,
        source: input.source ?? 'script',
      })
    );
  }

  return records;
}

/**
 * Copy an existing cover row from one locale to another, reusing the same storage object.
 */
export async function copyCourseCoverLocale(params: {
  courseId: string;
  fromLocale: Locale;
  toLocale: Locale;
  source?: string;
}): Promise<CourseCoverRecord | null> {
  if (params.fromLocale === params.toLocale) return null;

  const existing = await fetchCourseCover(params.courseId, params.fromLocale);
  if (!existing) return null;

  const client = getSupabaseAdminClient();
  return upsertCoverRow(client, {
    course_id: params.courseId,
    locale: params.toLocale,
    prompt: (existing.prompt ?? '').slice(0, 2000),
    model: existing.model ?? null,
    provider: existing.provider ?? null,
    image_url: existing.image_url,
    storage_path: existing.storage_path,
    source: params.source ?? existing.source ?? 'script',
  });
}

/**
 * Fetch the latest cover for a course
 */
export async function fetchCourseCover(
  courseId: string,
  locale: Locale
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
    console.error('[CourseCover] Failed to fetch:', { courseId, locale, message: error.message });
    return null;
  }

  return data as CourseCoverRecord | null;
}

/**
 * Check if a course cover exists
 */
export async function courseCoverExists(
  courseId: string,
  locale: Locale
): Promise<boolean> {
  const client = getSupabaseAdminClient();

  const { data, error } = await client
    .from('course_covers')
    .select('storage_path')
    .eq('course_id', courseId)
    .eq('locale', locale)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[CourseCover] Failed to check existence:', { courseId, locale, message: error.message });
    return false;
  }

  return typeof (data as { storage_path?: unknown } | null)?.storage_path === 'string';
}
