import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/middleware';
import { getContentReports, resolveContentReport } from '@/lib/admin/admin';
import { getSupabaseServerClient } from '@/lib/db/supabase';

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const reports = await getContentReports(status || undefined, limit);

    return NextResponse.json({ data: reports });
  } catch (error) {
    console.error('Error fetching content reports:', error);
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

    const { reportId, status, resolutionNotes } = await req.json();

    if (!reportId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const success = await resolveContentReport(reportId, status, resolutionNotes, user.id);

    if (!success) {
      return NextResponse.json({ error: 'Failed to resolve content report' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resolving content report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
