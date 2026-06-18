import { describe, expect, it } from 'vitest';
import {
  assessNewsArticleFormatting,
  normalizeNewsArticleMarkdown,
  sanitizeScrapedContent,
} from '@/lib/utils/content-formatter';

describe('news content formatting', () => {
  it('removes source post boilerplate from summaries', () => {
    const summary =
      'La tecnología está disponible y la ventana regulatoria aún está abierta. […] La entrada La IA agéntica redefine la lucha contra el fraude bancario se publicó primero en MuyComputerPRO.';

    const cleaned = sanitizeScrapedContent(summary);

    expect(cleaned).not.toContain('La entrada');
    expect(cleaned).not.toContain('MuyComputerPRO');
    expect(cleaned).toContain('La tecnología está disponible');
  });

  it('removes arXiv metadata prefixes from displayed summaries', () => {
    const summary =
      'arXiv:2606.15077v1 Resumen: Presentamos un marco basado en LLM para recuperar datos de teledetección.';

    const cleaned = sanitizeScrapedContent(summary);

    expect(cleaned).not.toMatch(/arxiv:/i);
    expect(cleaned).not.toMatch(/^resumen:/i);
    expect(cleaned).toBe(
      'Presentamos un marco basado en LLM para recuperar datos de teledetección.',
    );
  });

  it('splits oversized single-block article text into readable markdown paragraphs', () => {
    const sentence =
      'La IA agéntica cambia el análisis de fraude porque permite coordinar señales, revisar patrones y escalar decisiones con más contexto operativo.';
    const raw = Array.from({ length: 36 }, () => sentence).join(' ');

    const formatted = normalizeNewsArticleMarkdown(raw);
    const report = assessNewsArticleFormatting(formatted);

    expect(formatted).toContain('\n\n');
    expect(report.paragraphCount).toBeGreaterThan(3);
    expect(report.hasOversizedParagraph).toBe(false);
    expect(report.hasEnoughParagraphs).toBe(true);
  });

  it('preserves editorial markdown headings and emphasis while normalizing paragraphs', () => {
    const formatted = normalizeNewsArticleMarkdown(
      '## Por qué importa\n\nLa automatización reduce pasos manuales. **El cambio clave** está en coordinar agentes con validaciones explícitas.',
    );

    expect(formatted).toContain('## Por qué importa');
    expect(formatted).toContain('**El cambio clave**');
    expect(formatted).toContain('\n\n');
  });
});
