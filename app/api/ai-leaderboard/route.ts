import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';

export const revalidate = 3600; // Cache for 1 hour

export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    // Try to fetch from database
    const { data: models, error } = await supabase
      .from('ai_leaderboard')
      .select('*')
      .order('rank', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error fetching from database:', error);
      // Return fallback data
      return NextResponse.json({
        models: [
          { rank: 1, name: 'GPT-4o', provider: 'OpenAI', performance_score: 98.5, description: 'Most advanced reasoning' },
          { rank: 2, name: 'Claude 3.5 Sonnet', provider: 'Anthropic', performance_score: 97.8, description: 'Excellent analysis' },
          { rank: 3, name: 'Gemini 2.0', provider: 'Google DeepMind', performance_score: 97.2, description: 'Fast & capable' },
          { rank: 4, name: 'Llama 3.3 70B', provider: 'Meta', performance_score: 96.5, description: 'Open-source leader' },
          { rank: 5, name: 'Grok-3', provider: 'xAI', performance_score: 96.2, description: 'Real-time reasoning' },
        ],
        lastUpdated: new Date().toISOString(),
        source: 'fallback'
      });
    }

    return NextResponse.json({
      models: models || [],
      lastUpdated: new Date().toISOString(),
      source: 'database'
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
