import { NextRequest, NextResponse } from 'next/server';
import { classifyWithAllProviders } from '@/lib/ai/llm-client';
import { z } from 'zod';

/**
 * Test endpoint to debug LLM provider fallback
 * GET /api/courses/test-llm
 */
export async function GET(_req: NextRequest) {
  // Block in production — test endpoint for development only
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const capturedLogs: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;
  
  // Capture logs
  console.log = (...args: unknown[]) => {
    originalLog(...args);
    capturedLogs.push(
      args
        .map((arg) =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        )
        .join(' ')
    );
  };
  
  console.error = (...args: unknown[]) => {
    originalError(...args);
    capturedLogs.push(
      `[ERROR] ${args
        .map((arg) =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        )
        .join(' ')}`
    );
  };

  const testSchema = z.object({
    success: z.boolean(),
    message: z.string(),
  });

  const testPrompt = 'Respond with {"success": true, "message": "Hello from LLM"}';
  const systemPrompt = 'You are a helpful assistant. Respond ONLY with valid JSON, nothing else.';

  try {
    console.log('═'.repeat(80));
    console.log('🧪 TESTING LLM PROVIDER FALLBACK');
    console.log('═'.repeat(80));

    const { result, provider, attempts } = await classifyWithAllProviders(
      testPrompt,
      testSchema,
      systemPrompt,
      1
    );

    console.log('✅ TEST PASSED!');
    console.log(`Provider: ${provider}, Attempts: ${attempts}`);
    console.log(`Result:`, result);

    // Restore console
    console.log = originalLog;
    console.error = originalError;

    return NextResponse.json({
      success: true,
      message: 'LLM provider test passed',
      provider,
      attempts,
      result,
      logs: capturedLogs,
      totalLogs: capturedLogs.length,
      executionTimeMs: Date.now(),
    });
  } catch (error) {
    console.error('❌ TEST FAILED!');
    console.error(error);

    // Restore console
    console.log = originalLog;
    console.error = originalError;

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        logs: capturedLogs,
        totalLogs: capturedLogs.length,
      },
      { status: 500 }
    );
  }
}
