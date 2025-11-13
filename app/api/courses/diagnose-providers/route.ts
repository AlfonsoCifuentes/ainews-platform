import { NextRequest, NextResponse } from 'next/server';

/**
 * Diagnose which LLM providers are configured
 * GET /api/courses/diagnose-providers
 */
export async function GET(_req: NextRequest) {
  const providers = {
    groq: {
      configured: !!process.env.GROQ_API_KEY,
      keyPrefix: process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.substring(0, 10) + '...' : 'NOT SET'
    },
    openrouter: {
      configured: !!process.env.OPENROUTER_API_KEY,
      keyPrefix: process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.substring(0, 10) + '...' : 'NOT SET'
    },
    anthropic: {
      configured: !!process.env.ANTHROPIC_API_KEY,
      keyPrefix: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 10) + '...' : 'NOT SET'
    },
    gemini: {
      configured: !!process.env.GEMINI_API_KEY,
      keyPrefix: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'NOT SET'
    },
    deepseek: {
      configured: !!process.env.DEEPSEEK_API_KEY,
      keyPrefix: process.env.DEEPSEEK_API_KEY ? process.env.DEEPSEEK_API_KEY.substring(0, 10) + '...' : 'NOT SET'
    },
    mistral: {
      configured: !!process.env.MISTRAL_API_KEY,
      keyPrefix: process.env.MISTRAL_API_KEY ? process.env.MISTRAL_API_KEY.substring(0, 10) + '...' : 'NOT SET'
    },
    huggingface: {
      configured: !!process.env.HUGGINGFACE_API_KEY,
      keyPrefix: process.env.HUGGINGFACE_API_KEY ? process.env.HUGGINGFACE_API_KEY.substring(0, 10) + '...' : 'NOT SET'
    }
  };

  const configured = Object.values(providers).filter(p => p.configured).length;
  const total = Object.keys(providers).length;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    providers,
    summary: {
      configured,
      total,
      percentage: `${((configured / total) * 100).toFixed(1)}%`,
      message: configured === 0 
        ? '❌ NO PROVIDERS CONFIGURED - This explains the 429 error!' 
        : `✅ ${configured}/${total} providers configured`
    }
  });
}
