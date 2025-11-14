/**
 * Diagnose OpenAI configuration
 * Verifies that OpenAI API key is configured and accessible
 */

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface OpenAIListResponse {
  object: string;
  data: OpenAIModel[];
}

interface OpenAIError {
  error?: {
    message: string;
    type: string;
  };
}

export async function GET(_req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'OpenAI API key not configured',
        configured: false,
        hint: 'Add OPENAI_API_KEY to environment variables'
      },
      { status: 400 }
    );
  }

  try {
    // Test OpenAI connection with a simple request
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const data = (await response.json()) as OpenAIListResponse | OpenAIError;

    if (!response.ok) {
      const errorData = data as OpenAIError;
      return NextResponse.json(
        {
          status: 'error',
          message: 'OpenAI API authentication failed',
          configured: true,
          error: errorData.error?.message || 'Unknown error',
          statusCode: response.status
        },
        { status: response.status }
      );
    }

    // Count available models
    const listData = data as OpenAIListResponse;
    const models = listData.data?.length || 0;
    const gpt4oModels = listData.data?.filter((m: OpenAIModel) => m.id.includes('gpt-4o')) || [];

    return NextResponse.json({
      status: 'success',
      message: 'OpenAI API is properly configured',
      configured: true,
      apiKey: apiKey.substring(0, 10) + '...',
      totalModels: models,
      gpt4oModels: gpt4oModels.map((m: OpenAIModel) => m.id),
      models: listData.data?.slice(0, 5).map((m: OpenAIModel) => m.id) || []
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to verify OpenAI configuration',
        configured: true,
        error: errorMsg
      },
      { status: 500 }
    );
  }
}
