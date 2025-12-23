export function countWords(text: string): number {
  return String(text ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function computeInlineSlotCount(content: string): number {
  const wordCount = countWords(content);
  if (!Number.isFinite(wordCount) || wordCount <= 0) return 1;

  const count = Math.round(wordCount / 900);
  return Math.min(5, Math.max(1, count));
}

export function computeInlineSlotIndexes(totalBlocks: number, inlineCount: number): number[] {
  const safeTotal = Math.max(1, totalBlocks);
  const count = Math.max(1, inlineCount);
  const indices: number[] = [];

  for (let i = 1; i <= count; i += 1) {
    const index = Math.floor((i * safeTotal) / (count + 1));
    indices.push(Math.max(2, index));
  }

  return Array.from(new Set(indices)).sort((a, b) => a - b);
}
