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
  const apply = process.argv.includes('--apply');
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 5000;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && apply) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (required for --apply updates).');
  }

  const db = getSupabaseServerClient();

  console.log(`[cleanup-news-section-headings] Starting (apply=${apply}, limit=${limit})`);

  const { data, error } = await db
    .from('news_articles')
    .select('id, summary_en, summary_es, content_en, content_es')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`[cleanup-news-section-headings] Query failed: ${error.message}`);
  }

  const rows = (data ?? []) as Row[];
  let matched = 0;
  let updated = 0;

  for (const row of rows) {
    const before = {
      summary_en: row.summary_en ?? '',
      summary_es: row.summary_es ?? '',
      content_en: row.content_en ?? '',
      content_es: row.content_es ?? '',
    };

    const combined = `${before.summary_en}\n${before.summary_es}\n${before.content_en}\n${before.content_es}`;
    if (!hasTemplateHeadings(combined)) continue;

    matched += 1;

    const after = {
      summary_en: sanitizeScrapedContent(before.summary_en),
      summary_es: sanitizeScrapedContent(before.summary_es),
      content_en: sanitizeScrapedContent(before.content_en),
      content_es: sanitizeScrapedContent(before.content_es),
    };

    if (!apply) {
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
      console.log(`[cleanup-news-section-headings] Updated ${updated}/${matched}...`);
    }
  }

  console.log(
    `[cleanup-news-section-headings] Done. matched=${matched} updated=${updated} (apply=${apply})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
