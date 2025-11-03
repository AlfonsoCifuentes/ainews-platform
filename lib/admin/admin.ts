import { getSupabaseServerClient } from '@/lib/db/supabase';

export type AdminRole = 'super_admin' | 'moderator' | 'content_editor';

export interface Admin {
  id: string;
  user_id: string;
  role: AdminRole;
  granted_by?: string;
  granted_at: string;
  revoked_at?: string;
  is_active: boolean;
  permissions: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface ModerationItem {
  id: string;
  content_type: string;
  content_id: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: number;
  reason?: string;
  flagged_by?: string;
  flagged_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
}

export interface ContentReport {
  id: string;
  content_type: string;
  content_id: string;
  reported_by: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
}

export interface SystemLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  metadata: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(userId?: string): Promise<boolean> {
  if (!userId) return false;

  const supabase = getSupabaseServerClient();

  const { data } = await supabase.rpc('is_admin', {
    p_user_id: userId,
  });

  return data === true;
}

/**
 * Get admin role for a user
 */
export async function getAdminRole(userId: string): Promise<AdminRole | null> {
  const supabase = getSupabaseServerClient();

  const { data } = await supabase.rpc('get_admin_role', {
    p_user_id: userId,
  });

  return data as AdminRole | null;
}

/**
 * Get moderation queue items
 */
export async function getModerationQueue(
  status?: 'pending' | 'approved' | 'rejected',
  contentType?: string,
  limit: number = 50
): Promise<ModerationItem[]> {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from('moderation_queue')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  if (contentType) {
    query = query.eq('content_type', contentType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching moderation queue:', error);
    return [];
  }

  return (data as ModerationItem[]) || [];
}

/**
 * Update moderation item status
 */
export async function updateModerationStatus(
  itemId: string,
  status: 'approved' | 'rejected',
  reviewNotes?: string,
  userId?: string
): Promise<boolean> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from('moderation_queue')
    .update({
      status,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes,
    })
    .eq('id', itemId);

  if (error) {
    console.error('Error updating moderation status:', error);
    return false;
  }

  // Log the action
  if (userId) {
    await logAdminAction(userId, `moderation_${status}`, 'moderation_queue', itemId, {
      review_notes: reviewNotes,
    });
  }

  return true;
}

/**
 * Get content reports
 */
export async function getContentReports(
  status?: string,
  limit: number = 50
): Promise<ContentReport[]> {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from('content_reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching content reports:', error);
    return [];
  }

  return (data as ContentReport[]) || [];
}

/**
 * Resolve a content report
 */
export async function resolveContentReport(
  reportId: string,
  status: 'resolved' | 'dismissed',
  resolutionNotes?: string,
  userId?: string
): Promise<boolean> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from('content_reports')
    .update({
      status,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
      resolution_notes: resolutionNotes,
    })
    .eq('id', reportId);

  if (error) {
    console.error('Error resolving content report:', error);
    return false;
  }

  // Log the action
  if (userId) {
    await logAdminAction(userId, `report_${status}`, 'content_report', reportId, {
      resolution_notes: resolutionNotes,
    });
  }

  return true;
}

/**
 * Get system logs
 */
export async function getSystemLogs(
  userId?: string,
  action?: string,
  limit: number = 100
): Promise<SystemLog[]> {
  const supabase = getSupabaseServerClient();

  let query = supabase
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (action) {
    query = query.eq('action', action);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching system logs:', error);
    return [];
  }

  return (data as SystemLog[]) || [];
}

/**
 * Log an admin action
 */
export async function logAdminAction(
  userId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  metadata: Record<string, unknown> = {}
): Promise<string | null> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase.rpc('log_admin_action', {
    p_user_id: userId,
    p_action: action,
    p_resource_type: resourceType,
    p_resource_id: resourceId,
    p_metadata: metadata,
  });

  if (error) {
    console.error('Error logging admin action:', error);
    return null;
  }

  return data;
}

/**
 * Get admin dashboard stats
 */
export async function getAdminStats() {
  const supabase = getSupabaseServerClient();

  const [
    { count: pendingModeration },
    { count: pendingReports },
    { count: totalUsers },
    { count: totalArticles },
    { count: totalCourses },
  ] = await Promise.all([
    supabase.from('moderation_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('content_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('news_articles').select('*', { count: 'exact', head: true }),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
  ]);

  return {
    pendingModeration: pendingModeration || 0,
    pendingReports: pendingReports || 0,
    totalUsers: totalUsers || 0,
    totalArticles: totalArticles || 0,
    totalCourses: totalCourses || 0,
  };
}
