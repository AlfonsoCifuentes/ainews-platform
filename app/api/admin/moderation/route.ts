import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/middleware';
import { getModerationQueue, updateModerationStatus } from '@/lib/admin/admin';
import { getSupabaseServerClient } from '@/lib/db/supabase';

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'pending' | 'approved' | 'rejected' | null;
    const contentType = searchParams.get('contentType');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const items = await getModerationQueue(status || undefined, contentType || undefined, limit);

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error('Error fetching moderation queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId, status, reviewNotes } = await req.json();

    if (!itemId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const success = await updateModerationStatus(itemId, status, reviewNotes, user.id);

    if (!success) {
      return NextResponse.json({ error: 'Failed to update moderation status' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating moderation status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
