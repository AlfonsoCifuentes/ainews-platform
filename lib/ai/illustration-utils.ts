import { createHash } from 'node:crypto';
import type { VisualStyle } from '@/lib/types/illustrations';

export interface IllustrationChecksumInput {
  moduleId?: string | null;
  content: string;
  locale: 'en' | 'es';
  style: string;
  visualStyle?: VisualStyle;
  slotId?: string | null;
  anchor?: Record<string, unknown> | null;
}

export function computeIllustrationChecksum(input: IllustrationChecksumInput): string {
  const hash = createHash('sha256');
  hash.update(input.moduleId ?? 'module:unknown');
  hash.update('|');
  hash.update(input.locale);
  hash.update('|');
  hash.update(input.style);
  hash.update('|');
  hash.update(input.visualStyle ?? 'photorealistic');

  if (input.slotId) {
    hash.update('|slot:');
    hash.update(input.slotId);
  }

  if (input.anchor) {
    hash.update('|anchor:');
    hash.update(JSON.stringify(input.anchor));
  }

  const normalizedContent = input.content.length > 5000
    ? input.content.slice(0, 5000)
    : input.content;

  hash.update('|content:');
  hash.update(normalizedContent);

  return hash.digest('hex');
}
