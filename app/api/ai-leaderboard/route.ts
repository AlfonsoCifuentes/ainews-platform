import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { fetchRealLeaderboard, getOfficialLeaderboardData } from '@/lib/ai/fetch-real-leaderboard';

export const revalidate = 3600; // Cache for 1 hour

export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    // Try to fetch from database first
    const { data: models, error } = await supabase
      .from('ai_leaderboard')
      .select('*')
      .order('rank', { ascending: true })
      .limit(50);

    if (!error && models && models.length > 0) {
      return NextResponse.json({
        models,
        lastUpdated: new Date().toISOString(),
        source: 'database'
      });
    }

    // If database is empty or error, try to fetch real data from official source
    const realModels = await fetchRealLeaderboard();
    
    if (realModels && realModels.length > 0) {
      return NextResponse.json({
        models: realModels,
        lastUpdated: new Date().toISOString(),
        source: 'official'
      });
    }

    // Fallback to official data if all else fails
    const officialData = getOfficialLeaderboardData();
    return NextResponse.json({
      models: officialData,
      lastUpdated: new Date().toISOString(),
      source: 'fallback'
    });
  } catch (error) {
    console.error('API error:', error);
    
    // Even on error, return the official data
    const officialData = getOfficialLeaderboardData();
    return NextResponse.json({
      models: officialData,
      lastUpdated: new Date().toISOString(),
      source: 'fallback-official',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
