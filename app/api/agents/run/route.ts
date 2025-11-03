import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';
import { z } from 'zod';

const RunAgentSchema = z.object({
  agentType: z.enum(['trend_detector', 'fact_checker', 'bias_auditor', 'multi_perspective']),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { agentType } = RunAgentSchema.parse(body);

    // Log agent run request
    await supabase.from('ai_system_logs').insert({
      agent_type: agentType,
      operation: 'manual_trigger',
      status: 'running',
      triggered_by: user.id,
      metadata: { manual: true, timestamp: new Date().toISOString() },
    });

    // Import and run the appropriate agent
    let result;
    switch (agentType) {
      case 'trend_detector':
        const { TrendDetectorAgent } = await import('@/lib/ai/agents/trend-detector');
        const trendAgent = new TrendDetectorAgent();
        result = await trendAgent.execute();
        break;
      
      case 'fact_checker':
        const { FactCheckerAgent } = await import('@/lib/ai/agents/fact-checker');
        const factAgent = new FactCheckerAgent();
        // Run on most recent article
        const { data: recentArticle } = await supabase
          .from('news_articles')
          .select('id')
          .order('published_at', { ascending: false })
          .limit(1)
          .single();
        
        if (recentArticle) {
          result = await factAgent.checkArticle(recentArticle.id);
        }
        break;
      
      case 'bias_auditor':
        const { BiasAuditorAgent } = await import('@/lib/ai/agents/bias-auditor');
        const biasAgent = new BiasAuditorAgent();
        result = await biasAgent.analyzeCategory('AI', 5);
        break;
      
      case 'multi_perspective':
        const { MultiPerspectiveAgent } = await import('@/lib/ai/agents/multi-perspective');
        const perspectiveAgent = new MultiPerspectiveAgent();
        result = await perspectiveAgent.generateSummary('Latest AI developments');
        break;
    }

    // Log success
    await supabase.from('ai_system_logs').insert({
      agent_type: agentType,
      operation: 'manual_trigger',
      status: 'success',
      triggered_by: user.id,
      metadata: { result, manual: true },
    });

    return NextResponse.json({ 
      success: true, 
      agentType,
      message: 'Agent executed successfully',
      result 
    });

  } catch (error) {
    console.error('Agent run error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to run agent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
