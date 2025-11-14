/**
 * Sync Google OAuth Names API
 * 
 * POST /api/admin/sync-google-names - Sync Google OAuth names to user_profiles
 * Admin utility to fix display names from Google OAuth metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';

export async function POST(_req: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated (optional - remove if you want public access)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      // Allow unauthenticated access since this is an admin utility
      // In production, add proper admin checks
    }

    // Run the update to sync Google OAuth names
    const { error } = await supabase
      .rpc('exec_sql', {
        sql_string: `
          UPDATE public.user_profiles
          SET 
            display_name = COALESCE(
              au.raw_user_meta_data->>'name',
              au.raw_user_meta_data->>'full_name',
              au.raw_user_meta_data->>'user_name',
              display_name
            ),
            full_name = COALESCE(
              au.raw_user_meta_data->>'name',
              au.raw_user_meta_data->>'full_name',
              full_name
            ),
            avatar_url = COALESCE(
              au.raw_user_meta_data->>'avatar_url',
              au.raw_user_meta_data->>'picture',
              avatar_url
            ),
            updated_at = NOW()
          FROM auth.users au
          WHERE 
            user_profiles.id = au.id
            AND (
              display_name LIKE 'user_%'
              OR display_name IS NULL
            );
        `
      });

    if (error) {
      console.error('[Sync Google Names] RPC error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'RPC execution failed',
          details: error.message,
          instructions: 'Apply this SQL in Supabase Dashboard > SQL Editor',
          sql: `
UPDATE public.user_profiles
SET 
  display_name = COALESCE(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'user_name',
    display_name
  ),
  full_name = COALESCE(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    full_name
  ),
  avatar_url = COALESCE(
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture',
    avatar_url
  ),
  updated_at = NOW()
FROM auth.users au
WHERE 
  user_profiles.id = au.id
  AND (
    display_name LIKE 'user_%'
    OR display_name IS NULL
  );`
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully synced Google OAuth names',
      sql_executed: true
    });

  } catch (error) {
    console.error('[Sync Google Names] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check status
export async function GET(_req: NextRequest) {
  return NextResponse.json({
    message: 'Google OAuth name sync utility',
    usage: 'POST /api/admin/sync-google-names',
    description: 'Syncs Google OAuth metadata to user_profiles display_name'
  });
}
