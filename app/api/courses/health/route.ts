import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  console.log('[Courses Health] Health check requested');
  console.log('[Courses Health] URL:', req.url);
  console.log('[Courses Health] Method:', req.method);
  
  return NextResponse.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    url: req.url,
    message: 'Courses API is operational'
  });
}
