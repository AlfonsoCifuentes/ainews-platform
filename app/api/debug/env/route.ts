import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    environment: {
      hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
      hasGemini: !!process.env.GEMINI_API_KEY,
      hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
      hasGroq: !!process.env.GROQ_API_KEY,
      hasTogether: !!process.env.TOGETHER_API_KEY,
      hasDeepSeek: !!process.env.DEEPSEEK_API_KEY,
      hasMistral: !!process.env.MISTRAL_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    },
    keys: {
      anthropic: process.env.ANTHROPIC_API_KEY?.substring(0, 10) + '...',
      gemini: process.env.GEMINI_API_KEY?.substring(0, 10) + '...',
      openRouter: process.env.OPENROUTER_API_KEY?.substring(0, 10) + '...',
      groq: process.env.GROQ_API_KEY?.substring(0, 10) + '...',
      together: process.env.TOGETHER_API_KEY?.substring(0, 10) + '...',
      deepSeek: process.env.DEEPSEEK_API_KEY?.substring(0, 10) + '...',
      mistral: process.env.MISTRAL_API_KEY?.substring(0, 10) + '...',
    }
  });
}