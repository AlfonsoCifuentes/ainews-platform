import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get counts
    const [bookmarksCount, flashcardsCount, historyCount] = await Promise.all([
      supabase
        .from('user_bookmarks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      
      supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
      
      supabase
        .from('reading_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ]);

    // Get recent activity
    const { data: recentHistory } = await supabase
      .from('reading_history')
      .select('last_read_at')
      .eq('user_id', user.id)
      .order('last_read_at', { ascending: false })
      .limit(30);

    // Calculate streak
    let streak = 0;
    if (recentHistory && recentHistory.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dates = recentHistory.map((h) => {
        const d = new Date(h.last_read_at);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      });
      
      const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b - a);
      
      for (let i = 0; i < uniqueDates.length; i++) {
        const expectedDate = today.getTime() - i * 24 * 60 * 60 * 1000;
        if (uniqueDates[i] === expectedDate) {
          streak++;
        } else {
          break;
        }
      }
    }

    // Group activity by date
    const activityMap = new Map<string, { articlesRead: number; flashcardsReviewed: number }>();
    
    if (recentHistory) {
      recentHistory.forEach((entry) => {
        const date = new Date(entry.last_read_at).toISOString().split('T')[0];
        if (!activityMap.has(date)) {
          activityMap.set(date, { articlesRead: 0, flashcardsReviewed: 0 });
        }
        activityMap.get(date)!.articlesRead++;
      });
    }

    const activityHistory = Array.from(activityMap.entries())
      .map(([date, activity]) => ({ date, ...activity }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 14);

    const analyticsData = {
      totalArticles: historyCount.count || 0,
      totalBookmarks: bookmarksCount.count || 0,
      totalFlashcards: flashcardsCount.count || 0,
      readingStreak: streak,
      activityHistory,
    };

    return NextResponse.json({ data: analyticsData });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
