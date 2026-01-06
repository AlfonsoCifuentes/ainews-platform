import dotenv from 'dotenv';

import { getSupabaseServerClient } from '@/lib/db/supabase';
import { sanitizeScrapedContent } from '@/lib/utils/content-formatter';

type Row = {
  id: string;
  summary_en: string | null;
  summary_es: string | null;
  content_en: string | null;
  content_es: string | null;
};

function hasTemplateHeadings(text: string): boolean {
  return /(^|\n)\s*#{1,6}\s*\d+\s*[\.\)]\s*(La Noticia|Contexto T[eé]cnico|Por Qu[eé] Importa|The News|Technical Context|Why It Matters)\b/i.test(
    text,
  );
}

async function main() {
  // Load local env when running manually.
  dotenv.config({ path: '.env.local' });

  const apply = process.argv.includes('--apply');
  const pageSizeArg = process.argv.find((arg) => arg.startsWith('--pageSize='));
  const pageSize = pageSizeArg ? Number(pageSizeArg.split('=')[1]) : 500;
  const maxArg = process.argv.find((arg) => arg.startsWith('--max='));
  const max = maxArg ? Number(maxArg.split('=')[1]) : Number.POSITIVE_INFINITY;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && apply) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (required for --apply updates).');
  }

  const db = getSupabaseServerClient();

  console.log(
    `[cleanup-news-section-headings] Starting (apply=${apply}, pageSize=${pageSize}, max=${Number.isFinite(max) ? max : '∞'})`,
  );

  let offset = 0;
  let processed = 0;
  let matched = 0;
  let updated = 0;

  while (processed < max) {
    const { data, error } = await db
      .from('news_articles')
      .select('id, summary_en, summary_es, content_en, content_es')
      .order('published_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`[cleanup-news-section-headings] Query failed (offset=${offset}): ${error.message}`);
    }

    const rows = (data ?? []) as Row[];
    if (rows.length === 0) break;

    for (const row of rows) {
      processed += 1;
      if (processed > max) break;

      const before = {
        summary_en: row.summary_en ?? '',
        summary_es: row.summary_es ?? '',
        content_en: row.content_en ?? '',
        content_es: row.content_es ?? '',
      };

      const combined = `${before.summary_en}\n${before.summary_es}\n${before.content_en}\n${before.content_es}`;
      if (!hasTemplateHeadings(combined)) continue;

      const after = {
        summary_en: sanitizeScrapedContent(before.summary_en),
        summary_es: sanitizeScrapedContent(before.summary_es),
        content_en: sanitizeScrapedContent(before.content_en),
        content_es: sanitizeScrapedContent(before.content_es),
      };

      const changed =
        after.summary_en !== before.summary_en ||
        after.summary_es !== before.summary_es ||
        after.content_en !== before.content_en ||
        after.content_es !== before.content_es;

      matched += 1;

      if (!apply || !changed) {
        continue;
      }

      const { error: updateError } = await db
        .from('news_articles')
        .update(after)
        .eq('id', row.id);

      if (updateError) {
        console.warn(`[cleanup-news-section-headings] Update failed for ${row.id}: ${updateError.message}`);
        continue;
      }

      updated += 1;
      if (updated % 50 === 0) {
        console.log(`[cleanup-news-section-headings] Updated ${updated} (matched=${matched}, processed=${processed})...`);
      }
    }

    offset += rows.length;
    console.log(`[cleanup-news-section-headings] Page done (offset=${offset}, processed=${processed}, matched=${matched}, updated=${updated})`);

    if (rows.length < pageSize) break;
  }

  console.log(
    `[cleanup-news-section-headings] Done. processed=${processed} matched=${matched} updated=${updated} (apply=${apply})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
