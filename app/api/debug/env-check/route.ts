import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET';
  const anonKeyPrefix = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) + '...' || 'NOT SET';
  const serviceKeyPrefix = process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) + '...' || 'NOT SET';

  return NextResponse.json({
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
    },
    supabase: {
      hasServiceRoleKey: hasServiceKey,
      hasAnonKey: hasAnonKey,
      hasUrl: hasUrl,
      url: supabaseUrl,
      anonKeyPrefix,
      serviceKeyPrefix,
    },
    summary: {
      canFetchCourses: hasUrl && (hasServiceKey || hasAnonKey),
      missingVars: [
        !hasUrl && 'NEXT_PUBLIC_SUPABASE_URL',
        !hasServiceKey && !hasAnonKey && 'API_KEY (service or anon)',
      ].filter(Boolean),
    },
  });
}
