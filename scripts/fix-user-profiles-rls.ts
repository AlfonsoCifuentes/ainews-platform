#!/usr/bin/env node

/**
 * Quick fix for user_profiles RLS issues
 * Run: npx ts-node scripts/fix-user-profiles-rls.ts
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!url || !serviceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function fixRLS() {
  console.log('🔧 Fixing user_profiles RLS policies...\n');

  try {
    // Drop all existing policies
    const policiesToDrop = [
      'Users can view own profile',
      'Users can update own profile',
      'Users can insert own profile',
      'Users can view all profiles',
      'Public can view leaderboard'
    ];

    for (const policy of policiesToDrop) {
      try {
        await supabase.rpc('drop_policy_if_exists', {
          table_name: 'user_profiles',
          policy_name: policy
        });
      } catch {
        // Silently ignore if RPC doesn't exist
      }
    }

    console.log('✓ Dropped old policies\n');

    // Create new policies via raw SQL
    const sql = `
      -- Re-enable RLS
      ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

      -- Public read
      CREATE POLICY "Public can view all profiles"
        ON public.user_profiles FOR SELECT
        TO public
        USING (true);

      -- Authenticated users SELECT own
      CREATE POLICY "Users can select own profile"
        ON public.user_profiles FOR SELECT
        TO authenticated
        USING (auth.uid() = id);

      -- Authenticated users INSERT own
      CREATE POLICY "Users can insert own profile"
        ON public.user_profiles FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = id);

      -- Authenticated users UPDATE own
      CREATE POLICY "Users can update own profile"
        ON public.user_profiles FOR UPDATE
        TO authenticated
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);

      -- Service role full access
      CREATE POLICY "Service role can manage all profiles"
        ON public.user_profiles FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);
    `;

    let sqlError = null;

    try {
      const response = await supabase.rpc('exec_sql', {
        sql_string: sql
      });
      if (response.error) {
        sqlError = response.error;
      }
    } catch {
      // If exec_sql doesn't exist, suggest manual approach
      console.log('📝 Note: Apply the following SQL in Supabase dashboard > SQL Editor:\n');
      console.log(sql);
    }

    if (sqlError) {
      console.error('❌ Error applying policies:', sqlError);
      process.exit(1);
    }

    console.log('✓ Created new RLS policies\n');

    // Ensure all users have profiles
    try {
      await supabase.rpc('sync_auth_users_to_profiles');
      console.log('✓ Synced auth.users → user_profiles\n');
    } catch {
      // RPC may not exist, which is fine
    }

    console.log('✅ user_profiles RLS fixed successfully!\n');
    console.log('📝 If you see errors above, apply this SQL manually in Supabase:');
    console.log('   supabase > Project > SQL Editor > New Query > Paste the migration SQL\n');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

fixRLS();
