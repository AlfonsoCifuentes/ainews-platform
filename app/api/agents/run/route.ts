import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase-server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { z } from 'zod';
import crypto from 'crypto';

const RunAgentSchema = z.object({
  agentType: z.enum(['trend_detector', 'fact_checker', 'bias_auditor', 'multi_perspective']),
  requestId: z.string().min(1).max(200).optional(),
});

function safeEqual(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function isSchedulerAuthorized(req: NextRequest): boolean {
  const schedulerKey = process.env.AGENTS_SCHEDULER_KEY;
  if (!schedulerKey) return false;

  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : '';
  if (!token) return false;

  return safeEqual(token, schedulerKey);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentType, requestId: requestIdFromBody } = RunAgentSchema.parse(body);

    const requestId =
      req.headers.get('x-request-id') ??
      requestIdFromBody ??
      `${Date.now()}`;

    const schedulerAuthorized = isSchedulerAuthorized(req);
    const cookieSupabase = await createClient();

    // Check authentication
    const { data: { user } } = await cookieSupabase.auth.getUser();
    if (!schedulerAuthorized && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service-role Supabase for scheduler runs (and for safer server-side ops)
    const supabase = schedulerAuthorized ? getSupabaseServerClient() : cookieSupabase;

    const operation = schedulerAuthorized ? 'scheduled_trigger' : 'manual_trigger';
    const triggeredBy = schedulerAuthorized ? null : (user?.id ?? null);

    // Log agent run request
    await supabase.from('ai_system_logs').insert({
      agent_type: agentType,
      operation,
      status: 'running',
      triggered_by: triggeredBy,
      metadata: {
        requestId,
        manual: !schedulerAuthorized,
        scheduler: schedulerAuthorized,
        timestamp: new Date().toISOString(),
      },
    });

    // Import and run the appropriate agent
    let result: unknown;
    try {
      switch (agentType) {
        case 'trend_detector': {
          const { TrendDetector } = await import('@/lib/ai/agents/trend-detector');
          const trendAgent = new TrendDetector();
          result = await trendAgent.detectTrends();
          break;
        }

        case 'fact_checker': {
          const { FactChecker } = await import('@/lib/ai/agents/fact-checker');
          const factAgent = new FactChecker();
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
        }

        case 'bias_auditor': {
          const { BiasAuditor } = await import('@/lib/ai/agents/bias-auditor');
          const biasAgent = new BiasAuditor();
          result = await biasAgent.analyzeCategory('AI', 5);
          break;
        }

        case 'multi_perspective': {
          const { MultiPerspectiveSummarizer } = await import('@/lib/ai/agents/multi-perspective');
          const perspectiveAgent = new MultiPerspectiveSummarizer();
          result = await perspectiveAgent.generateSummary('Latest AI developments');
          break;
        }
      }

      // Log success
      await supabase.from('ai_system_logs').insert({
        agent_type: agentType,
        operation,
        status: 'success',
        triggered_by: triggeredBy,
        metadata: { requestId, result, manual: !schedulerAuthorized, scheduler: schedulerAuthorized },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      await supabase.from('ai_system_logs').insert({
        agent_type: agentType,
        operation,
        status: 'error',
        triggered_by: triggeredBy,
        metadata: { requestId, error: message, manual: !schedulerAuthorized, scheduler: schedulerAuthorized },
      });
      throw e;
    }

    return NextResponse.json({ 
      success: true, 
      agentType,
      message: 'Agent executed successfully',
      requestId,
      result,
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
