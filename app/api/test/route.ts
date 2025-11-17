import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'API test endpoint working',
    url: req.url,
    timestamp: new Date().toISOString()
  });
}
