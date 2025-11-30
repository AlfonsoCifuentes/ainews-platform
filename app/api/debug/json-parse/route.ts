import { NextRequest, NextResponse } from 'next/server';
import { sanitizeAndFixJSON, parseJSON } from '@/lib/utils/json-fixer';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Debug endpoint only available in development' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const content = body?.content;
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Missing content string in body' }, { status: 400 });
    }

    const fixed = sanitizeAndFixJSON(content);
    let parsed: unknown = null;
    let success = false;
    let parseError = null;
    try {
      parsed = parseJSON<unknown>(fixed, 'debug-json-parse');
      success = true;
    } catch (e) {
      parseError = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json({ success, parseError, fixed, parsed });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
