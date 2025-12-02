import type { VisualDensity, VisualStyle } from './illustrations';

export type ModuleVisualSlotType = 'header' | 'diagram' | 'inline';

export interface ModuleVisualSlot {
  id: string;
  moduleId: string;
  locale: 'en' | 'es';
  slotType: ModuleVisualSlotType;
  density: VisualDensity;
  suggestedVisualStyle: VisualStyle;
  blockIndex: number | null;
  heading: string | null;
  summary: string | null;
  reason: string | null;
  llmPayload: Record<string, unknown> | null;
  provider: string | null;
  model: string | null;
  confidence: number | null;
  created_at?: string;
}

export interface ModuleVisualSlotInput {
  moduleId: string;
  locale: 'en' | 'es';
  slotType: ModuleVisualSlotType;
  density?: VisualDensity;
  suggestedVisualStyle?: VisualStyle;
  blockIndex?: number | null;
  heading?: string | null;
  summary?: string | null;
  reason?: string | null;
  llmPayload?: Record<string, unknown> | null;
  provider?: string | null;
  model?: string | null;
  confidence?: number | null;
}
