import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Get analytics overview from the view
    const { data, error } = await supabase.from('analytics_overview').select('*').single();

    if (error) throw error;

    return NextResponse.json({
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
