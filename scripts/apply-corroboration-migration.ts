#!/usr/bin/env tsx
/**
 * One-off: apply ONLY the additive corroboration columns to news_articles via
 * the project's exec_sql RPC. Idempotent (ADD COLUMN / CREATE INDEX IF NOT EXISTS).
 *
 *   npx tsx scripts/apply-corroboration-migration.ts
 */
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) loadEnv({ path: envLocal });
else loadEnv();

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const STATEMENTS: string[] = [
  `ALTER TABLE news_articles
     ADD COLUMN IF NOT EXISTS story_cluster_id      UUID,
     ADD COLUMN IF NOT EXISTS corroboration_count   INTEGER       NOT NULL DEFAULT 1,
     ADD COLUMN IF NOT EXISTS importance_score      NUMERIC(8,3)  NOT NULL DEFAULT 0,
     ADD COLUMN IF NOT EXISTS corroborating_sources JSONB         NOT NULL DEFAULT '[]'::jsonb,
     ADD COLUMN IF NOT EXISTS is_cluster_primary    BOOLEAN       NOT NULL DEFAULT true,
     ADD COLUMN IF NOT EXISTS clustered_at          TIMESTAMPTZ;`,
  `CREATE INDEX IF NOT EXISTS idx_news_importance ON news_articles(importance_score DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_news_cluster    ON news_articles(story_cluster_id);`,
  `CREATE INDEX IF NOT EXISTS idx_news_primary    ON news_articles(is_cluster_primary) WHERE is_cluster_primary = true;`,
];

async function main() {
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(url, key);

  for (let i = 0; i < STATEMENTS.length; i++) {
    const sql = STATEMENTS[i];
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      console.error(`[Migrate] Statement ${i + 1} failed: ${error.message}`);
      console.error('If exec_sql is unavailable, paste supabase/migrations/20260615000000_news_corroboration.sql into the Supabase SQL editor.');
      process.exit(1);
    }
    console.log(`[Migrate] ✓ Statement ${i + 1}/${STATEMENTS.length} applied`);
  }

  // Verify the columns now exist by selecting them.
  const { error: verifyErr } = await supabase
    .from('news_articles')
    .select('id, corroboration_count, importance_score, is_cluster_primary')
    .limit(1);
  if (verifyErr) {
    console.error('[Migrate] Verification select failed:', verifyErr.message);
    process.exit(1);
  }
  console.log('[Migrate] ✓ Corroboration columns verified on news_articles');
}

main().catch((e) => {
  console.error('[Migrate] Fatal:', e instanceof Error ? e.message : e);
  process.exit(1);
});
