import { Buffer } from 'node:buffer';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'module-illustrations';

type Locale = 'en' | 'es';

type PersistSource = 'api' | 'script' | 'manual' | string;

export interface ModuleIllustrationRecord {
  id: string;
  module_id: string;
  locale: Locale;
  style: string;
  model: string | null;
  provider: string | null;
  prompt_summary: string | null;
  image_url: string;
  storage_path: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PersistModuleIllustrationInput {
  moduleId: string;
  locale: Locale;
  style: string;
  model?: string | null;
  provider?: string | null;
  prompt?: string;
  base64Data: string;
  mimeType: string;
  source?: PersistSource;
  metadata?: Record<string, unknown>;
}

export interface FetchModuleIllustrationInput {
  moduleId: string;
  locale: Locale;
  style: string;
}

let supabaseAdmin: SupabaseClient | null = null;
let bucketEnsured = false;

function getSupabaseAdminClient(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('module-illustrations helpers must only run on the server');
  }

  if (!supabaseAdmin) {
    const url =
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      throw new Error(
        'Supabase admin credentials missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
      );
    }

    supabaseAdmin = createClient(url, serviceKey, {
      auth: { persistSession: false },
      global: { headers: { 'X-Client-Info': 'AINews-Illustrations' } },
    });
  }

  return supabaseAdmin;
}

async function ensureBucketExists(client: SupabaseClient) {
  if (bucketEnsured) return;

  try {
    const { error } = await client.storage.getBucket(BUCKET_NAME);
    if (error) {
      if (error.message && /not found/i.test(error.message)) {
        const { error: createError } = await client.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: '10485760', // 10MB per illustration
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
        });
        if (createError) {
          throw createError;
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    // If bucket already exists, ignore conflict errors
    const message = error instanceof Error ? error.message : String(error);
    if (!/exists/i.test(message)) {
      throw error;
    }
  }

  bucketEnsured = true;
}

function mimeToExtension(mimeType: string): string {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  return 'png';
}

function detectProvider(model?: string | null): string {
  if (!model) return 'gemini';
  const normalized = model.toLowerCase();
  if (normalized.includes('gemini')) return 'gemini';
  if (normalized.includes('gpt')) return 'openai';
  if (normalized.includes('claude')) return 'anthropic';
  return 'unknown';
}

function buildMetadata(input: PersistModuleIllustrationInput) {
  return {
    mimeType: input.mimeType,
    source: input.source ?? 'unknown',
    extra: input.metadata ?? {},
  } as Record<string, unknown>;
}

export async function persistModuleIllustration(
  input: PersistModuleIllustrationInput
): Promise<ModuleIllustrationRecord | null> {
  const client = getSupabaseAdminClient();
  await ensureBucketExists(client);

  const buffer = Buffer.from(input.base64Data, 'base64');
  const extension = mimeToExtension(input.mimeType);
  const timestamp = Date.now();
  const filePath = `${input.moduleId}/${input.style}-${input.locale}-${timestamp}.${extension}`;

  const { error: uploadError } = await client.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: input.mimeType,
      cacheControl: '31536000',
      upsert: false,
    });

  if (uploadError) {
    console.error('[Illustrations] Storage upload failed', uploadError);
    return null;
  }

  const { data: publicUrlData } = client.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath, {
      download: false,
    });

  const promptSummary = input.prompt
    ? input.prompt.slice(0, 1000)
    : null;

  const { data, error } = await client
    .from('module_illustrations')
    .insert({
      module_id: input.moduleId,
      locale: input.locale,
      style: input.style,
      model: input.model ?? null,
      provider: input.provider ?? detectProvider(input.model),
      prompt_summary: promptSummary,
      image_url: publicUrlData?.publicUrl ?? '',
      storage_path: filePath,
      metadata: buildMetadata(input),
    })
    .select()
    .single();

  if (error) {
    console.error('[Illustrations] Failed to insert metadata', error);
    return null;
  }

  return data as ModuleIllustrationRecord;
}

export async function fetchLatestModuleIllustration(
  params: FetchModuleIllustrationInput
): Promise<ModuleIllustrationRecord | null> {
  const client = getSupabaseAdminClient();

  const { data, error } = await client
    .from('module_illustrations')
    .select('*')
    .eq('module_id', params.moduleId)
    .eq('locale', params.locale)
    .eq('style', params.style)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Illustrations] Failed to fetch metadata', error);
    return null;
  }

  return data as ModuleIllustrationRecord | null;
}
