import { getSupabaseServerClient } from './supabase';
import type { ModuleVisualSlot, ModuleVisualSlotInput, ModuleVisualSlotType } from '@/lib/types/visual-slots';

function mapSlotToDb(slot: ModuleVisualSlotInput) {
  return {
    module_id: slot.moduleId,
    locale: slot.locale,
    slot_type: slot.slotType,
    density: slot.density ?? 'balanced',
    suggested_visual_style: slot.suggestedVisualStyle ?? 'photorealistic',
    block_index: slot.blockIndex ?? null,
    heading: slot.heading ?? null,
    summary: slot.summary ?? null,
    reason: slot.reason ?? null,
    llm_payload: slot.llmPayload ?? {},
    provider: slot.provider ?? null,
    model: slot.model ?? null,
    confidence: slot.confidence ?? 0.75,
  };
}

export async function replaceModuleVisualSlots(
  moduleId: string,
  locale: 'en' | 'es',
  slots: ModuleVisualSlotInput[]
): Promise<ModuleVisualSlot[]> {
  const client = getSupabaseServerClient();

  await client
    .from('module_visual_slots')
    .delete()
    .eq('module_id', moduleId)
    .eq('locale', locale);

  if (!slots.length) {
    return [];
  }

  const payload = slots.map(mapSlotToDb);
  const { data, error } = await client
    .from('module_visual_slots')
    .insert(payload)
    .select();

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    moduleId: row.module_id,
    locale: row.locale,
    slotType: row.slot_type,
    density: row.density,
    suggestedVisualStyle: row.suggested_visual_style,
    blockIndex: row.block_index,
    heading: row.heading,
    summary: row.summary,
    reason: row.reason,
    llmPayload: row.llm_payload,
    provider: row.provider,
    model: row.model,
    confidence: row.confidence,
  }));
}

export async function fetchModuleVisualSlots(params: {
  moduleId: string;
  locale: 'en' | 'es';
  slotType?: ModuleVisualSlotType;
  limit?: number;
}): Promise<ModuleVisualSlot[]> {
  const client = getSupabaseServerClient();
  let query = client
    .from('module_visual_slots')
    .select('*')
    .eq('module_id', params.moduleId)
    .eq('locale', params.locale)
    .order('created_at', { ascending: false });

  if (params.slotType) {
    query = query.eq('slot_type', params.slotType);
  }

  if (params.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    moduleId: row.module_id,
    locale: row.locale,
    slotType: row.slot_type,
    density: row.density,
    suggestedVisualStyle: row.suggested_visual_style,
    blockIndex: row.block_index,
    heading: row.heading,
    summary: row.summary,
    reason: row.reason,
    llmPayload: row.llm_payload,
    provider: row.provider,
    model: row.model,
    confidence: row.confidence,
  }));
}

export type { ModuleVisualSlot, ModuleVisualSlotInput, ModuleVisualSlotType } from '@/lib/types/visual-slots';
