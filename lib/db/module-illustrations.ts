import { Buffer } from 'node:buffer';
import { createClient, type SupabaseClient, type PostgrestError } from '@supabase/supabase-js';
import { GEMINI_MODELS } from '@/lib/ai/model-versions';
import type { VisualStyle } from '@/lib/types/illustrations';

const BUCKET_NAME = 'module-illustrations';
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

type Locale = 'en' | 'es';

type PersistSource = 'api' | 'script' | 'manual' | string;

export interface ModuleIllustrationRecord {
  id: string;
  module_id: string;
  locale: Locale;
  style: string;
  visual_style: VisualStyle;
  model: string | null;
  provider: string | null;
  prompt_summary: string | null;
  image_url: string;
  storage_path: string;
  slot_id: string | null;
  anchor: Record<string, unknown> | null;
  checksum: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PersistModuleIllustrationInput {
  moduleId: string;
  locale: Locale;
  style: string;
  visualStyle?: VisualStyle;
  model?: string | null;
  provider?: string | null;
  prompt?: string;
  base64Data: string;
  mimeType: string;
  source?: PersistSource;
  slotId?: string | null;
  anchor?: Record<string, unknown> | null;
  checksum?: string | null;
  metadata?: Record<string, unknown>;
}

export interface FetchModuleIllustrationInput {
  moduleId: string;
  locale: Locale;
  style: string;
  visualStyle?: VisualStyle;
  slotId?: string | null;
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
      global: { headers: { 'X-Client-Info': 'ThotNet-Illustrations' } },
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
          allowedMimeTypes: ALLOWED_MIME_TYPES,
        });
        if (createError) {
          throw createError;
        }
      } else {
        throw error;
      }
    } else {
      // Ensure bucket allows SVG uploads for fallback illustrations
      const { error: updateError } = await client.storage.updateBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: '10485760',
        allowedMimeTypes: ALLOWED_MIME_TYPES,
      });
      if (updateError) {
        console.warn('[Illustrations] Failed to update bucket configuration:', updateError.message);
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
  if (mimeType.includes('svg')) return 'svg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  return 'png';
}

function detectProvider(model?: string | null): string {
  if (!model) return 'runware';
  const normalized = model.toLowerCase();
  if (normalized.includes('runware')) return 'runware';
  if (normalized.includes('gemini')) return 'gemini';
  if (normalized.includes('flux') || normalized.includes('huggingface')) return 'huggingface';
  if (normalized.includes('qwen') || normalized.includes('dashscope')) return 'qwen';
  return 'runware';
}

function buildMetadata(input: PersistModuleIllustrationInput) {
  return {
    mimeType: input.mimeType,
    source: input.source ?? 'unknown',
    visualStyle: input.visualStyle ?? 'photorealistic',
    slotId: input.slotId ?? null,
    anchor: input.anchor ?? null,
    extra: input.metadata ?? {},
  } as Record<string, unknown>;
}

export async function persistModuleIllustration(
  input: PersistModuleIllustrationInput
): Promise<ModuleIllustrationRecord | null> {
  const provider = input.provider ?? detectProvider(input.model);
  if (!['gemini', 'huggingface', 'qwen', 'runware'].includes(provider)) {
    throw new Error('Unsupported illustration provider');
  }

  const model = input.model ?? GEMINI_MODELS.GEMINI_3_PRO_IMAGE;
  const client = getSupabaseAdminClient();
  await ensureBucketExists(client);

  const buffer = Buffer.from(input.base64Data, 'base64');
  const extension = mimeToExtension(input.mimeType);
  const timestamp = Date.now();
  const visualStyle = input.visualStyle ?? 'photorealistic';
  const filePath = `${input.moduleId}/${input.style}-${visualStyle}-${input.locale}-${timestamp}.${extension}`;

  let existingId: string | null = null;
  if (input.checksum) {
    const { data: existing, error: existingError } = await client
      .from('module_illustrations')
      .select('id')
      .eq('module_id', input.moduleId)
      .eq('locale', input.locale)
      .eq('style', input.style)
      .eq('visual_style', visualStyle)
      .eq('checksum', input.checksum)
      .maybeSingle();

    if (!existingError && existing?.id) {
      existingId = existing.id;
    }
  }

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

  const payload = {
    module_id: input.moduleId,
    locale: input.locale,
    style: input.style,
    visual_style: visualStyle,
    model,
    provider,
    prompt_summary: promptSummary,
    image_url: publicUrlData?.publicUrl ?? '',
    storage_path: filePath,
    slot_id: input.slotId ?? null,
    anchor: input.anchor ?? null,
    checksum: input.checksum ?? null,
    metadata: buildMetadata(input),
  };

  async function writeWithSchemaFallback(
    mode: 'insert' | 'update',
    basePayload: Record<string, unknown>,
    id?: string
  ): Promise<{ data: ModuleIllustrationRecord | null; error: PostgrestError | null }> {
    const attemptPayload: Record<string, unknown> = { ...basePayload };
    let lastError: PostgrestError | null = null;
    let didSanitizeJson = false;

    for (let i = 0; i < 6; i += 1) {
      const res =
        mode === 'update'
          ? await client.from('module_illustrations').update(attemptPayload).eq('id', id ?? '').select().single()
          : await client.from('module_illustrations').insert(attemptPayload).select().single();

      if (!res.error) {
        return { data: res.data as ModuleIllustrationRecord, error: null };
      }

      lastError = res.error;

      // Some upstream content/prompts can contain characters that PostgREST fails to parse/roundtrip.
      // When that happens, strip optional JSON/text fields and retry once to avoid losing the image.
      if (!didSanitizeJson && (res.error.code === 'PGRST102' || /invalid json/i.test(res.error.message ?? ''))) {
        didSanitizeJson = true;
        attemptPayload.metadata = {};
        attemptPayload.anchor = null;
        attemptPayload.prompt_summary = null;
        continue;
      }

      if (res.error.code !== 'PGRST204') break;

      const msg = res.error.message ?? '';
      const match = msg.match(/Could not find the '([^']+)' column/i);
      const missingColumn = match?.[1];
      if (!missingColumn) {
        break;
      }

      delete attemptPayload[missingColumn];
    }

    return { data: null, error: lastError };
  }

  let data: ModuleIllustrationRecord | null = null;
  let error: PostgrestError | null = null;

  if (existingId) {
    const res = await writeWithSchemaFallback('update', payload as unknown as Record<string, unknown>, existingId);
    data = res.data;
    error = res.error;
  } else {
    const res = await writeWithSchemaFallback('insert', payload as unknown as Record<string, unknown>);
    data = res.data;
    error = res.error;
  }

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

  const baseQuery = () =>
    client
      .from('module_illustrations')
      .select('*')
      .eq('module_id', params.moduleId)
      .eq('locale', params.locale)
      .eq('style', params.style)
      .eq('visual_style', params.visualStyle ?? 'photorealistic')
      .order('created_at', { ascending: false })
      .limit(1);

  const isMissingColumnError = (error: PostgrestError | null, column: string): boolean => {
    if (!error) return false;
    const msg = (error.message ?? '').toLowerCase();
    return (
      error.code === '42703' ||
      error.code === 'PGRST204' ||
      msg.includes(`column module_illustrations.${column} does not exist`) ||
      msg.includes(`could not find the '${column}' column`)
    );
  };

  const runQuery = async (mode: 'slot_column' | 'metadata' | 'no_slot') => {
    let query = baseQuery();

    if (params.slotId && mode === 'slot_column') {
      query = query.eq('slot_id', params.slotId);
    } else if (params.slotId && mode === 'metadata') {
      // Some deployments store slotId inside the JSON `metadata` instead of a dedicated `slot_id` column.
      query = query.eq('metadata->>slotId', params.slotId);
    }

    return query.maybeSingle();
  };

  // 1) Try exact slot_id column when available.
  let result = await runQuery('slot_column');

  // 2) Fallback: filter by `metadata.slotId` when the column does not exist.
  if (params.slotId && isMissingColumnError(result.error, 'slot_id')) {
    result = await runQuery('metadata');
  }

  // 3) Fallback: if nothing found for the slot, return the latest illustration of that style for the module.
  if (params.slotId && !result.error && !result.data) {
    result = await runQuery('no_slot');
  }

  if (result.error) {
    console.error('[Illustrations] Failed to fetch metadata', result.error);
    return null;
  }

  return result.data as ModuleIllustrationRecord | null;
}
