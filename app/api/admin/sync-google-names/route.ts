/**
 * Sync Google OAuth Names API
 * 
 * POST /api/admin/sync-google-names - Sync Google OAuth names to user_profiles
 * Admin utility to fix display names from Google OAuth metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';

// Admin-only emails allowed to run this utility
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);

export async function POST(_req: NextRequest) {
  // Block in production unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_ADMIN_SYNC) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const supabase = await createClient();

    // Require authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin permission
    if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
          error: 'Sync operation failed'
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
      { error: 'Internal server error' },
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
