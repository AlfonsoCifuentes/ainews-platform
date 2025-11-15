import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Courses API endpoint is working',
    url: req.url,
    timestamp: new Date().toISOString()
  });
}
