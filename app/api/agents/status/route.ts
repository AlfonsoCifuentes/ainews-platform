import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agentTypes = ['trend_detector', 'fact_checker', 'bias_auditor', 'multi_perspective'];
    const statuses = [];

    for (const agentType of agentTypes) {
      // Get today's operations
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: logs, error } = await supabase
        .from('ai_system_logs')
        .select('status, created_at')
        .eq('agent_type', agentType)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error(`Error fetching logs for ${agentType}:`, error);
        continue;
      }

      const totalOperations = logs?.length || 0;
      const successfulOps = logs?.filter((l: { status: string }) => l.status === 'success').length || 0;
      const successRate = totalOperations > 0 ? Math.round((successfulOps / totalOperations) * 100) : 0;
      
      const lastLog = logs?.[0];
      const currentStatus = lastLog?.status === 'running' ? 'running' : 
                           lastLog?.status === 'success' ? 'success' :
                           lastLog?.status === 'error' ? 'error' : 'idle';

      statuses.push({
        agentType,
        status: currentStatus,
        operationsToday: totalOperations,
        successRate,
        lastRun: lastLog?.created_at || null,
      });
    }

    return NextResponse.json({ statuses });

  } catch (error) {
    console.error('Status fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent status' },
      { status: 500 }
    );
  }
}
