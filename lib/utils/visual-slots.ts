import type { ModuleVisualSlot } from '@/lib/types/visual-slots';
import type { IllustrationStyle } from '@/lib/ai/gemini-image';

/**
 * Pick the illustration style that best matches a slot type.
 */
export function getIllustrationStyleForSlot(slot?: ModuleVisualSlot | null): IllustrationStyle {
  if (!slot) return 'textbook';

  switch (slot.slotType) {
    case 'diagram':
      return 'diagram';
    case 'inline':
      return 'conceptual';
    default:
      return 'textbook';
  }
}
