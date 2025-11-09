import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { getAvailableProviders } from '@/lib/ai/llm-client';

/**
 * Diagnostic endpoint to check ALL requirements for course generation
 * 
 * Tests:
 * 1. Environment variables (API keys)
 * 2. Database connection
 * 3. Database schema (courses table structure)
 * 4. LLM provider availability
 * 5. Sample LLM request
 * 
 * Usage: GET /api/courses/diagnose
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    status: 'unknown' as 'ok' | 'warning' | 'error',
    steps: [] as Array<{
      step: string;
      status: 'ok' | 'warning' | 'error';
      message: string;
      details?: Record<string, unknown>;
    }>
  };

  // ============================================================================
  // STEP 1: Check Environment Variables
  // ============================================================================
  console.log('\n🔍 STEP 1: Checking environment variables...');
  
  const envVars = {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    geminiApiKey: !!process.env.GEMINI_API_KEY,
    openRouterApiKey: !!process.env.OPENROUTER_API_KEY,
    groqApiKey: !!process.env.GROQ_API_KEY,
  };

  const envVarLengths = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    geminiApiKey: process.env.GEMINI_API_KEY?.length || 0,
    openRouterApiKey: process.env.OPENROUTER_API_KEY?.length || 0,
    groqApiKey: process.env.GROQ_API_KEY?.length || 0,
  };

  const hasDatabase = envVars.supabaseUrl && envVars.supabaseAnonKey && envVars.supabaseServiceKey;
  const hasLLM = envVars.geminiApiKey || envVars.openRouterApiKey || envVars.groqApiKey;

  if (!hasDatabase || !hasLLM) {
    diagnostics.steps.push({
      step: '1. Environment Variables',
      status: 'error',
      message: `Missing critical environment variables`,
      details: {
        present: envVars,
        lengths: envVarLengths,
        problems: {
          ...(!hasDatabase && { database: 'Missing Supabase credentials' }),
          ...(!hasLLM && { llm: 'Missing at least one LLM API key (Gemini, OpenRouter, or Groq)' })
        }
      }
    });
  } else {
    diagnostics.steps.push({
      step: '1. Environment Variables',
      status: 'ok',
      message: 'All required environment variables present',
      details: {
        present: envVars,
        lengths: envVarLengths
      }
    });
  }

  // ============================================================================
  // STEP 2: Check Database Connection
  // ============================================================================
  console.log('\n🔍 STEP 2: Testing database connection...');
  
  let dbConnected = false;
  try {
    const db = getSupabaseServerClient();
    const { error } = await db.from('courses').select('id').limit(1);
    
    if (error) {
      diagnostics.steps.push({
        step: '2. Database Connection',
        status: 'error',
        message: 'Database query failed',
        details: {
          error: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details
        }
      });
    } else {
      dbConnected = true;
      diagnostics.steps.push({
        step: '2. Database Connection',
        status: 'ok',
        message: 'Database connection successful'
      });
    }
  } catch (error) {
    diagnostics.steps.push({
      step: '2. Database Connection',
      status: 'error',
      message: 'Failed to connect to database',
      details: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
  }

  // ============================================================================
  // STEP 3: Check Database Schema
  // ============================================================================
  console.log('\n🔍 STEP 3: Verifying database schema...');
  
  if (dbConnected) {
    try {
      const db = getSupabaseServerClient();
      
      // Test insert with all required fields (matching actual schema)
      const testCourse = {
        title_en: 'Test Course Diagnosis',
        title_es: 'Curso de Prueba de Diagnóstico',
        description_en: 'Test Description for diagnostic purposes only. This will be deleted immediately.',
        description_es: 'Descripción de prueba solo para propósitos de diagnóstico. Se eliminará inmediatamente.',
        difficulty: 'beginner',
        duration_minutes: 30,
        topics: ['test', 'diagnosis'],
        ai_generated: true,
        generation_prompt: 'Diagnostic test',
        status: 'draft',
        enrollment_count: 0,
        rating_avg: 0.0,
        completion_rate: 0.0
      };

      const { data, error } = await db
        .from('courses')
        .insert([testCourse])
        .select()
        .single();

      if (error) {
        diagnostics.steps.push({
          step: '3. Database Schema',
          status: 'error',
          message: 'Schema validation failed - missing required columns',
          details: {
            error: error.message,
            code: error.code,
            hint: error.hint,
            recommendation: 'Run migration: 20250107000000_ensure_course_columns.sql'
          }
        });
      } else {
        // Clean up test data
        if (data?.id) {
          await db.from('courses').delete().eq('id', data.id);
        }
        
        diagnostics.steps.push({
          step: '3. Database Schema',
          status: 'ok',
          message: 'Database schema is correct'
        });
      }
    } catch (error) {
      diagnostics.steps.push({
        step: '3. Database Schema',
        status: 'error',
        message: 'Schema check failed',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  } else {
    diagnostics.steps.push({
      step: '3. Database Schema',
      status: 'error',
      message: 'Skipped - database not connected'
    });
  }

  // ============================================================================
  // STEP 4: Check LLM Providers
  // ============================================================================
  console.log('\n🔍 STEP 4: Checking LLM providers...');
  
  const availableProviders = getAvailableProviders();
  
  if (availableProviders.length === 0) {
    diagnostics.steps.push({
      step: '4. LLM Providers',
      status: 'error',
      message: 'No LLM providers configured',
      details: {
        availableProviders: [],
        instruction: 'Add at least one API key to .env.local:\n- GEMINI_API_KEY=your_key_here\n- OPENROUTER_API_KEY=your_key_here\n- GROQ_API_KEY=your_key_here'
      }
    });
  } else {
    diagnostics.steps.push({
      step: '4. LLM Providers',
      status: 'ok',
      message: `${availableProviders.length} LLM provider(s) available`,
      details: {
        providers: availableProviders,
        fallbackChain: availableProviders.join(' → ')
      }
    });
  }

  // ============================================================================
  // STEP 5: Test LLM Request (Simple)
  // ============================================================================
  console.log('\n🔍 STEP 5: Testing LLM request...');
  
  if (availableProviders.length > 0) {
    try {
      const { createLLMClientWithFallback } = await import('@/lib/ai/llm-client');
      const llm = await createLLMClientWithFallback();
      
      const testPrompt = 'Respond with exactly one word: OK';
      const response = await llm.generate(testPrompt, { 
        temperature: 0,
        maxTokens: 10 
      });

      diagnostics.steps.push({
        step: '5. LLM Request Test',
        status: 'ok',
        message: 'LLM request successful',
        details: {
          model: response.model,
          responseLength: response.content.length,
          tokens: response.usage,
          finishReason: response.finishReason
        }
      });
    } catch (error) {
      diagnostics.steps.push({
        step: '5. LLM Request Test',
        status: 'error',
        message: 'LLM request failed',
        details: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  } else {
    diagnostics.steps.push({
      step: '5. LLM Request Test',
      status: 'error',
      message: 'Skipped - no LLM providers available'
    });
  }

  // ============================================================================
  // Determine Overall Status
  // ============================================================================
  const hasErrors = diagnostics.steps.some(s => s.status === 'error');
  const hasWarnings = diagnostics.steps.some(s => s.status === 'warning');
  
  diagnostics.status = hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok';

  // ============================================================================
  // Return Results
  // ============================================================================
  console.log('\n📊 DIAGNOSTIC RESULTS:');
  console.log(JSON.stringify(diagnostics, null, 2));

  return NextResponse.json(diagnostics, {
    status: diagnostics.status === 'ok' ? 200 : diagnostics.status === 'warning' ? 207 : 500
  });
}
