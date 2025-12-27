/* eslint-disable no-console */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

type CourseModuleRow = {
  id: string;
  title_en: string | null;
  title_es: string | null;
  content_en: string | null;
  content_es: string | null;
};

type Locale = 'en' | 'es';

function normalizeNewlines(text: string): string {
  return String(text ?? '').replace(/\r\n/g, '\n');
}

function stripCodeFences(text: string): string {
  const lines = normalizeNewlines(text).split('\n');
  const out: string[] = [];
  let inFence = false;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (!inFence) out.push(line);
  }
  return out.join('\n');
}

function compact(text: string): string {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function clampFact(text: string): string {
  let t = compact(text);
  t = t.replace(/^("['`]+)|(["'`]+)$/g, '').trim();
  t = t.replace(/^(did you know\??|¿sabías que\??)\s*[:\-–]?\s*/i, '').trim();

  const maxChars = 220;
  if (t.length > maxChars) {
    t = t.slice(0, maxChars);
    const lastStop = Math.max(t.lastIndexOf('.'), t.lastIndexOf('!'), t.lastIndexOf('?'));
    if (lastStop > 80) t = t.slice(0, lastStop + 1);
    t = t.trim();
  }

  t = t.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t;
}

function unwrapTextFences(text: string): string {
  return normalizeNewlines(text).replace(
    /(^|\n)```\s*text\s*\n([\s\S]*?)\n```\s*(?=\n|$)/gi,
    (_m, lead: string, inner: string) => `${lead}${inner.trim()}\n`
  );
}

function stripRubricLeaks(text: string): string {
  const unwrapped = unwrapTextFences(text);
  const lines = normalizeNewlines(unwrapped).split('\n');
  const out: string[] = [];

  let inFence = false;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('```')) {
      inFence = !inFence;
      out.push(line);
      continue;
    }

    if (!inFence) {
      let rewritten = line;

      // Split merged cells/callouts like: "🎯 ... | 🎯 ..." into separate lines.
      rewritten = rewritten.replace(/\s*\|\s*(?=[🎯📌])/g, '\n');

      // Remove rubric fragments in-line (do not drop entire line).
      rewritten = rewritten.replace(/\*\*\s*key\s+distinction\s*:?\s*\*\*\s*/gi, '');
      rewritten = rewritten.replace(/\*\*\s*key\s+distinction\s*\*\s*/gi, '');
      rewritten = rewritten.replace(/\bkey\s+distinction\b\s*:?\s*/gi, '');
      rewritten = rewritten.replace(/\b(assertion|claim)\s*[≠!=]+\s*evidence\b\s*/gi, '');
      rewritten = rewritten.replace(/\bexplicit\s+uncertainty\b\s*/gi, '');

      // Normalize weird leftover markdown artifacts.
      rewritten = rewritten.replace(/\s{2,}/g, ' ').trimEnd();

      for (const piece of rewritten.split('\n')) {
        out.push(piece);
      }
      continue;
    }

    out.push(line);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function hasLegacyBrainIssues(text: string): boolean {
  if (!text) return false;
  const hasBareBrainHeading = /(^|\n)##\s*🧠\s*(\n|$)/.test(text);
  const hasBrainTextFence = /(^|\n)##\s*🧠[^\n]*\n\s*```\s*text\b/i.test(text);
  const hasClaimEvidenceLeak = /\b(assertion|claim)\s*[≠!=]+\s*evidence\b/i.test(text);
  return hasBareBrainHeading || hasBrainTextFence || hasClaimEvidenceLeak;
}

function ensureDidYouKnowLine(content: string, didYouKnowLine: string): string {
  if (/(^|\n)🎯\s+/.test(content)) return content;
  const heading = content.match(/(^|\n)#{2,3}\s+[^\n]+\n/);
  if (heading && heading.index != null) {
    const insertAt = heading.index + heading[0].length;
    return content.slice(0, insertAt) + `\n${didYouKnowLine}\n` + content.slice(insertAt);
  }
  return `${didYouKnowLine}\n\n${content}`;
}

function findPlaceholderBrainLines(text: string): Array<{ start: number; end: number; line: string }> {
  const lines = normalizeNewlines(text).split('\n');
  const results: Array<{ start: number; end: number; line: string }> = [];

  let index = 0;
  for (const raw of lines) {
    const line = raw ?? '';
    const trimmed = line.trim();

    const isBrainCallout = /^[🎯📌]\s*/.test(trimmed);
    if (isBrainCallout) {
      const after = trimmed.replace(/^[🎯📌]\s*/, '').trim();
      const isOnlyTitle = /^\*\*[^*]+\*\*$/.test(after);
      const isKeyDistinction = /key\s+distinction/i.test(after);
      const isBareDidYouKnow = /^(did you know\??|¿sabías que\??)\s*[:\-–]?\s*$/i.test(after);
      if (isOnlyTitle || isKeyDistinction || isBareDidYouKnow) {
        results.push({ start: index, end: index + line.length, line });
      }
    }

    index += line.length + 1;
  }

  return results;
}

function extractContextAround(text: string, startIndex: number, endIndex: number): string {
  const cleaned = stripCodeFences(text);
  const start = Math.max(0, startIndex - 900);
  const end = Math.min(cleaned.length, endIndex + 900);
  return compact(cleaned.slice(start, end));
}

async function generateFunFact(locale: Locale, context: string): Promise<string> {
  // Deterministic fallback: extract a short, informative sentence from nearby content.
  // This avoids relying on external LLM APIs during backfills.
  const cleaned = compact(
    String(context ?? '')
      .replace(/```[\s\S]*?```/g, ' ') // remove fenced blocks if any slipped in
      .replace(/`[^`]+`/g, ' ') // remove inline code
      .replace(/#+\s+/g, '') // remove markdown heading markers
  );

  const candidates = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => s.length >= 40 && s.length <= 200);

  let fact = candidates[0] || cleaned.slice(0, 180);
  fact = fact.replace(/^(did you know\??|¿sabías que\??)\s*[:\-–]?\s*/i, '').trim();
  if (fact && !/[.!?]$/.test(fact)) fact = `${fact}.`;

  return clampFact(fact);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has('--apply');
  const dryRun = !apply;

  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Math.max(1, Number(limitArg.split('=')[1] || '0')) : undefined;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  console.log('═'.repeat(80));
  console.log('🧠 Backfill brain callouts → Did you know facts');
  console.log('Mode:', dryRun ? 'DRY RUN (add --apply to write)' : 'APPLY');
  console.log('Limit:', limit ?? 'none');
  console.log('═'.repeat(80));

  const pageSize = 100;
  let offset = 0;
  let scanned = 0;
  let changed = 0;
  let updated = 0;
  let skipped = 0;

  while (true) {
    let query = supabase
      .from('course_modules')
      .select('id,title_en,title_es,content_en,content_es')
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (limit) {
      const remaining = limit - scanned;
      if (remaining <= 0) break;
      const take = Math.min(pageSize, remaining);
      query = supabase
        .from('course_modules')
        .select('id,title_en,title_es,content_en,content_es')
        .order('created_at', { ascending: true })
        .range(offset, offset + take - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as CourseModuleRow[];
    if (!rows.length) break;

    for (const row of rows) {
      scanned += 1;

      const originalEn = row.content_en || '';
      const originalEs = row.content_es || '';

      const placeholdersEn = findPlaceholderBrainLines(originalEn);
      const placeholdersEs = findPlaceholderBrainLines(originalEs);
      const legacyEn = hasLegacyBrainIssues(originalEn);
      const legacyEs = hasLegacyBrainIssues(originalEs);

      if (!placeholdersEn.length && !placeholdersEs.length && !legacyEn && !legacyEs) {
        skipped += 1;
        continue;
      }

      let nextEn = originalEn;
      let nextEs = originalEs;

      if (placeholdersEn.length || legacyEn) {
        nextEn = stripRubricLeaks(nextEn);

        for (const p of placeholdersEn) {
          const context = extractContextAround(originalEn, p.start, p.end);
          const fact = await generateFunFact('en', context);
          nextEn = nextEn.replace(p.line, `🎯 Did you know? ${fact}`);
        }

        if (/(^|\n)##\s*🧠\s*(\n|$)/.test(nextEn)) {
          const context = extractContextAround(originalEn, 0, Math.min(originalEn.length, 1200));
          const fact = await generateFunFact('en', context);
          nextEn = nextEn.replace(/(^|\n)##\s*🧠\s*(?=\n|$)/g, `$1🎯 Did you know? ${fact}`);
        }

        if (legacyEn) {
          const context = extractContextAround(originalEn, 0, Math.min(originalEn.length, 1200));
          const fact = await generateFunFact('en', context);
          nextEn = ensureDidYouKnowLine(nextEn, `🎯 Did you know? ${fact}`);
        }
      }

      if (placeholdersEs.length || legacyEs) {
        nextEs = stripRubricLeaks(nextEs);

        for (const p of placeholdersEs) {
          const context = extractContextAround(originalEs, p.start, p.end);
          const fact = await generateFunFact('es', context);
          nextEs = nextEs.replace(p.line, `🎯 ¿Sabías que? ${fact}`);
        }

        if (/(^|\n)##\s*🧠\s*(\n|$)/.test(nextEs)) {
          const context = extractContextAround(originalEs, 0, Math.min(originalEs.length, 1200));
          const fact = await generateFunFact('es', context);
          nextEs = nextEs.replace(/(^|\n)##\s*🧠\s*(?=\n|$)/g, `$1🎯 ¿Sabías que? ${fact}`);
        }

        if (legacyEs) {
          const context = extractContextAround(originalEs, 0, Math.min(originalEs.length, 1200));
          const fact = await generateFunFact('es', context);
          nextEs = ensureDidYouKnowLine(nextEs, `🎯 ¿Sabías que? ${fact}`);
        }
      }

      const needsUpdate = nextEn !== originalEn || nextEs !== originalEs;
      if (!needsUpdate) {
        skipped += 1;
        continue;
      }

      changed += 1;
      const title = row.title_en || row.title_es || 'untitled';

      if (dryRun) {
        if (changed <= 10) console.log(`• Would update module ${row.id} (${title})`);
        continue;
      }

      const { error: updateError } = await supabase
        .from('course_modules')
        .update({ content_en: nextEn, content_es: nextEs })
        .eq('id', row.id);

      if (updateError) {
        console.warn(`⚠️ Failed update ${row.id}:`, updateError.message);
        continue;
      }

      updated += 1;
      if (updated % 10 === 0) {
        console.log(`✅ Updated ${updated} modules (scanned ${scanned})`);
      }
    }

    offset += rows.length;
  }

  console.log('─'.repeat(80));
  console.log(`Scanned:  ${scanned}`);
  console.log(`Changed:  ${changed}`);
  console.log(`Updated:  ${updated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log('Done.');
  console.log('─'.repeat(80));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
