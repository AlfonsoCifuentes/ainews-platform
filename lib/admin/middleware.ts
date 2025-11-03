import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin/admin';
import { getSupabaseServerClient } from '@/lib/db/supabase';

/**
 * Admin middleware
 * Checks if user has admin privileges before allowing access
 */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasAdminAccess = await isAdmin(user.id);

  if (!hasAdminAccess) {
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }

  return null; // Allow access
}
