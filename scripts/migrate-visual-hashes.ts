/**
 * Migration: Create image_visual_hashes table for visual similarity detection
 *
 * This table stores perceptual hashes of images to detect duplicates and similar images
 * Used by the visual similarity service to prevent duplicate news images
 */

import { getSupabaseServerClient } from '../lib/db/supabase';

async function createImageVisualHashesTable() {
  const db = getSupabaseServerClient();

  console.log('[Migration] Creating image_visual_hashes table...');

  // Create the table
  const { error: createError } = await db.rpc('create_image_visual_hashes_table', {});

  if (createError) {
    // If RPC doesn't exist, create table directly with SQL
    console.log('[Migration] RPC not found, creating table with raw SQL...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS image_visual_hashes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        image_url TEXT NOT NULL,
        perceptual_hash TEXT NOT NULL,
        hamming_distance INTEGER DEFAULT 0,
        article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_perceptual_hash ON image_visual_hashes(perceptual_hash);
      CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_created_at ON image_visual_hashes(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_article_id ON image_visual_hashes(article_id);

      -- Create a partial index for recent hashes (last 30 days) for faster similarity checks
      CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_recent ON image_visual_hashes(perceptual_hash)
      WHERE created_at > NOW() - INTERVAL '30 days';
    `;

    const { error: sqlError } = await db.rpc('exec_sql', { sql: createTableSQL });

    if (sqlError) {
      console.error('[Migration] Failed to create table with SQL:', sqlError);
      throw sqlError;
    }
  }

  console.log('[Migration] ✓ image_visual_hashes table created successfully');

  // Create a view for statistics
  const createViewSQL = `
    CREATE OR REPLACE VIEW image_visual_similarity_stats AS
    SELECT
      COUNT(*) as total_hashes,
      COUNT(DISTINCT perceptual_hash) as unique_hashes,
      AVG(hamming_distance) as avg_hamming_distance,
      MIN(created_at) as oldest_hash,
      MAX(created_at) as newest_hash,
      COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as hashes_last_24h,
      COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as hashes_last_7d
    FROM image_visual_hashes;
  `;

  const { error: viewError } = await db.rpc('exec_sql', { sql: createViewSQL });

  if (viewError) {
    console.warn('[Migration] Failed to create statistics view:', viewError);
  } else {
    console.log('[Migration] ✓ Statistics view created');
  }

  console.log('[Migration] Migration completed successfully!');
}

// Run the migration if this script is executed directly
if (require.main === module) {
  createImageVisualHashesTable()
    .then(() => {
      console.log('[Migration] Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Migration] Failed:', error);
      process.exit(1);
    });
}

export { createImageVisualHashesTable };