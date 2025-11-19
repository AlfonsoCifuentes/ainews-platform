import { NextRequest, NextResponse } from 'next/server';
import { fetchRealLeaderboard, getOfficialLeaderboardData } from '@/lib/ai/fetch-real-leaderboard';

export const revalidate = 3600; // Cache for 1 hour

export async function GET(_req: NextRequest) {
  try {
    // Priority 1: Always try to fetch fresh official data first
    const realModels = await fetchRealLeaderboard();
    
    if (realModels && realModels.length > 0) {
      return NextResponse.json({
        models: realModels,
        lastUpdated: new Date().toISOString(),
        source: 'official-live'
      });
    }

    // Priority 2: Fallback to hardcoded official data
    const officialData = getOfficialLeaderboardData();
    return NextResponse.json({
      models: officialData,
      lastUpdated: new Date().toISOString(),
      source: 'official-hardcoded'
    });
  } catch (error) {
    console.error('API error:', error);
    
    // Even on error, return the official data - NEVER serve stale database data
    const officialData = getOfficialLeaderboardData();
    return NextResponse.json({
      models: officialData,
      lastUpdated: new Date().toISOString(),
      source: 'fallback-official',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
