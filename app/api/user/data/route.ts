import { NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';
import { getSupabaseServerClient } from '@/lib/db/supabase';

/**
 * Export user data (GDPR compliance)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Collect all user data
    const [bookmarks, history, flashcards, profile] = await Promise.all([
      supabase.from('user_bookmarks').select('*').eq('user_id', user.id),
      supabase.from('reading_history').select('*').eq('user_id', user.id),
      supabase.from('flashcards').select('*').eq('user_id', user.id),
      supabase.from('user_profiles').select('*').eq('id', user.id).single(),
    ]);

    const exportData = {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      profile: profile.data,
      bookmarks: bookmarks.data || [],
      reading_history: history.data || [],
      flashcards: flashcards.data || [],
      exported_at: new Date().toISOString(),
    };

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="thotnet-core-data-${user.id}.json"`,
      },
    });
  } catch (error) {
    console.error('[UserData] Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Delete user account and all data
 */
export async function DELETE() {
  try {
    // Authenticate via cookie-based client
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role client for admin deletion
    const adminClient = getSupabaseServerClient();
    await adminClient.auth.admin.deleteUser(user.id);

    return NextResponse.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    console.error('[UserData] Delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
