import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/lib/db/supabase-api';
import { awardXP } from '@/lib/gamification/xp-server';
import { z } from 'zod';

// ============================================================================
// Zod Schemas for LLM Response Validation
// ============================================================================

const GradeResponseSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().min(1),
});

type GradeResponse = z.infer<typeof GradeResponseSchema>;

const RequestSchema = z.object({
  moduleId: z.string().uuid(),
  answers: z.record(z.string(), z.string()),
  questions: z.record(z.string(), z.string()).optional(),
});

// ============================================================================
// LLM Provider Cascade Configuration
// ============================================================================

interface LLMProvider {
  name: string;
  enabled: () => boolean;
  grade: (prompt: string) => Promise<GradeResponse | null>;
}

/**
 * Try to parse JSON from LLM response, handling markdown code blocks
 */
function extractJSON(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // Continue to next attempt
      }
    }
    // Try finding JSON object in text
    const objectMatch = text.match(/\{[\s\S]*"score"[\s\S]*"feedback"[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Continue
      }
    }
    return null;
  }
}

/**
 * Validate LLM response with Zod schema
 */
function validateGradeResponse(raw: unknown): GradeResponse | null {
  const result = GradeResponseSchema.safeParse(raw);
  if (result.success) {
    return {
      score: Math.round(result.data.score),
      feedback: result.data.feedback,
    };
  }
  console.warn('[Grade API] Zod validation failed:', result.error.errors);
  return null;
}

// ============================================================================
// LLM Provider Implementations
// ============================================================================

function createOllamaProvider(): LLMProvider {
  return {
    name: 'ollama',
    enabled: () => !!process.env.OLLAMA_HOST,
    grade: async (prompt: string) => {
      const host = process.env.OLLAMA_HOST;
      const model = process.env.OLLAMA_MODEL || 'llama2';
      if (!host) return null;
      
      try {
        const resp = await fetch(`${host}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt, stream: false }),
          signal: AbortSignal.timeout(30000),
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        const parsed = extractJSON(data.response || '');
        return validateGradeResponse(parsed);
      } catch (e) {
        console.warn('[Grade API] Ollama failed:', e);
        return null;
      }
    },
  };
}

function createGroqProvider(): LLMProvider {
  return {
    name: 'groq',
    enabled: () => !!process.env.GROQ_API_KEY,
    grade: async (prompt: string) => {
      const key = process.env.GROQ_API_KEY;
      if (!key) return null;
      
      try {
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${key}` 
          },
          body: JSON.stringify({ 
            model: 'llama-3.3-70b-versatile', 
            messages: [{ role: 'user', content: prompt }], 
            max_tokens: 512,
            response_format: { type: 'json_object' },
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (!resp.ok) return null;
        const json = await resp.json();
        const content = json?.choices?.[0]?.message?.content;
        const parsed = extractJSON(content || '');
        return validateGradeResponse(parsed);
      } catch (e) {
        console.warn('[Grade API] Groq failed:', e);
        return null;
      }
    },
  };
}

function createGeminiProvider(): LLMProvider {
  return {
    name: 'gemini',
    enabled: () => !!process.env.GEMINI_API_KEY,
    grade: async (prompt: string) => {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return null;
      
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
              },
            }),
            signal: AbortSignal.timeout(30000),
          }
        );
        if (!resp.ok) return null;
        const json = await resp.json();
        const content = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = extractJSON(content || '');
        return validateGradeResponse(parsed);
      } catch (e) {
        console.warn('[Grade API] Gemini failed:', e);
        return null;
      }
    },
  };
}

function createOpenRouterProvider(): LLMProvider {
  return {
    name: 'openrouter',
    enabled: () => !!process.env.OPENROUTER_API_KEY,
    grade: async (prompt: string) => {
      const key = process.env.OPENROUTER_API_KEY;
      if (!key) return null;
      
      try {
        const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${key}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://thotnet-core.vercel.app',
          },
          body: JSON.stringify({ 
            model: 'google/gemini-2.0-flash-exp:free',
            messages: [{ role: 'user', content: prompt }], 
            max_tokens: 512,
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (!resp.ok) return null;
        const json = await resp.json();
        const content = json?.choices?.[0]?.message?.content;
        const parsed = extractJSON(content || '');
        return validateGradeResponse(parsed);
      } catch (e) {
        console.warn('[Grade API] OpenRouter failed:', e);
        return null;
      }
    },
  };
}

function createAnthropicProvider(): LLMProvider {
  return {
    name: 'anthropic',
    enabled: () => !!process.env.ANTHROPIC_API_KEY,
    grade: async (prompt: string) => {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return null;
      
      try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({ 
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 512,
            messages: [{ role: 'user', content: prompt }],
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (!resp.ok) return null;
        const json = await resp.json();
        const content = json?.content?.[0]?.text;
        const parsed = extractJSON(content || '');
        return validateGradeResponse(parsed);
      } catch (e) {
        console.warn('[Grade API] Anthropic failed:', e);
        return null;
      }
    },
  };
}

function createOpenAIProvider(): LLMProvider {
  return {
    name: 'openai',
    enabled: () => !!process.env.OPENAI_API_KEY,
    grade: async (prompt: string) => {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return null;
      
      try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${key}` 
          },
          body: JSON.stringify({ 
            model: 'gpt-4o-mini', 
            messages: [{ role: 'user', content: prompt }], 
            max_tokens: 512,
            response_format: { type: 'json_object' },
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (!resp.ok) return null;
        const json = await resp.json();
        const content = json?.choices?.[0]?.message?.content;
        const parsed = extractJSON(content || '');
        return validateGradeResponse(parsed);
      } catch (e) {
        console.warn('[Grade API] OpenAI failed:', e);
        return null;
      }
    },
  };
}

// ============================================================================
// Cascade Grading System
// ============================================================================

/**
 * Get all configured LLM providers in priority order
 */
function getProviderCascade(): LLMProvider[] {
  const providers = [
    createOllamaProvider(),     // 1. Local first (free, fast if available)
    createGroqProvider(),       // 2. Groq (free tier, very fast)
    createGeminiProvider(),     // 3. Gemini (free tier)
    createOpenRouterProvider(), // 4. OpenRouter (free models available)
    createAnthropicProvider(),  // 5. Anthropic (paid but high quality)
    createOpenAIProvider(),     // 6. OpenAI (paid, reliable fallback)
  ];
  
  return providers.filter(p => p.enabled());
}

/**
 * Grade using cascade of providers - tries each until one succeeds
 */
async function cascadeGrade(prompt: string): Promise<{ result: GradeResponse | null; provider: string | null }> {
  const providers = getProviderCascade();
  
  if (providers.length === 0) {
    console.warn('[Grade API] No LLM providers configured!');
    return { result: null, provider: null };
  }
  
  console.log(`[Grade API] Cascade: ${providers.map(p => p.name).join(' → ')}`);
  
  for (const provider of providers) {
    console.log(`[Grade API] Trying ${provider.name}...`);
    const result = await provider.grade(prompt);
    
    if (result) {
      console.log(`[Grade API] ✓ ${provider.name} succeeded (score: ${result.score})`);
      return { result, provider: provider.name };
    }
    
    console.log(`[Grade API] ✗ ${provider.name} failed, trying next...`);
  }
  
  return { result: null, provider: null };
}

/**
 * Heuristic fallback grading when all LLMs fail
 */
function heuristicGrade(answer: string, moduleContent: string): GradeResponse {
  const answerLower = answer.toLowerCase().trim();
  const contentLower = moduleContent.toLowerCase();
  
  // Check for keyword overlap
  const answerWords = answerLower.split(/\s+/).filter(w => w.length > 3);
  const contentWords = new Set(contentLower.split(/\s+/).filter(w => w.length > 3));
  const matchingWords = answerWords.filter(w => contentWords.has(w));
  const overlapRatio = answerWords.length > 0 ? matchingWords.length / answerWords.length : 0;
  
  // Score based on multiple factors
  let score = 40; // Base score
  
  // Length bonus
  if (answer.length > 200) score += 20;
  else if (answer.length > 100) score += 15;
  else if (answer.length > 50) score += 10;
  
  // Keyword overlap bonus
  score += Math.round(overlapRatio * 30);
  
  // Cap score
  score = Math.min(85, Math.max(30, score));
  
  const feedback = score >= 70
    ? 'Your answer shows good understanding of the material. Keep it up!'
    : score >= 50
    ? 'Your answer covers some key points, but could be more detailed. Try expanding on your response.'
    : 'Your answer needs more development. Review the module content and try to address the main concepts.';
  
  return { score, feedback };
}

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * POST /api/courses/modules/grade
 * Request: { moduleId: string, answers: Record<string, string> }
 * Response: { success: true, score: number, feedback: string, debug: {...} }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Parse and validate request body with Zod
    const body = await req.json();
    const validatedRequest = RequestSchema.safeParse(body);
    
    if (!validatedRequest.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validatedRequest.error.errors 
      }, { status: 400 });
    }
    
    const { moduleId, answers, questions } = validatedRequest.data;

    // Authenticate user
    const api = createApiClient(req);
    const { data: { user }, error: authErr } = await api.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch module content
    const { data: moduleData } = await api
      .from('course_modules')
      .select('content_en, content_es, course_id')
      .eq('id', moduleId)
      .maybeSingle();

    const moduleContent = moduleData?.content_en || moduleData?.content_es || '';
    
    if (!moduleContent) {
      return NextResponse.json({ 
        error: 'Module not found or has no content' 
      }, { status: 404 });
    }

    // Grade each answer
    let totalScore = 0;
    const feedbacks: string[] = [];
    const providersUsed: string[] = [];
    let questionsGraded = 0;

    for (const [questionId, answer] of Object.entries(answers)) {
      questionsGraded++;
      const questionText = questions?.[questionId]?.trim() ?? '';
      
      // Build grading prompt
      const prompt = `You are an expert educational grader. Grade the following student answer based on the module content.

IMPORTANT: Respond ONLY with a valid JSON object in this exact format:
{"score": <number 0-100>, "feedback": "<constructive feedback string>"}

${questionText ? `Question:
${questionText}
` : ''}Module Content:
${moduleContent.substring(0, 3000)}

Student Answer to Grade:
${answer}

Grading Criteria:
- Score 90-100: Excellent understanding, comprehensive and accurate
- Score 70-89: Good understanding with minor gaps
- Score 50-69: Partial understanding, needs improvement
- Score 0-49: Significant misunderstanding or incomplete

Respond ONLY with the JSON object, no other text.`;

      // Try cascade grading
      const { result, provider } = await cascadeGrade(prompt);
      
      if (result) {
        totalScore += result.score;
        feedbacks.push(`Q${questionsGraded}: ${result.feedback}`);
        if (provider) providersUsed.push(provider);
      } else {
        // Fallback to heuristic
        console.log(`[Grade API] All LLMs failed for Q${questionsGraded}, using heuristic`);
        const heuristic = heuristicGrade(answer, moduleContent);
        totalScore += heuristic.score;
        feedbacks.push(`Q${questionsGraded}: ${heuristic.feedback}`);
        providersUsed.push('heuristic');
      }
    }

    const finalScore = Math.round(totalScore / Math.max(1, questionsGraded));
    const combinedFeedback = feedbacks.join('\n\n');
    
    // Award XP if passed
    let xpAwarded = false;
    if (finalScore >= 70) {
      try {
        await awardXP(user.id, 'EXERCISE_PASS', moduleId);
        xpAwarded = true;
      } catch (err) {
        console.warn('[Grade API] Failed to award XP:', err);
      }
    }

    const duration = Date.now() - startTime;
    
    return NextResponse.json({ 
      success: true, 
      score: finalScore, 
      feedback: combinedFeedback,
      xpAwarded,
      debug: { 
        providers: providersUsed,
        questionsGraded,
        duration: `${duration}ms`,
        cascade: getProviderCascade().map(p => p.name),
      } 
    });
    
  } catch (e) {
    console.error('[Grade API] Error:', e);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: e instanceof Error ? e.message : 'Unknown error',
    }, { status: 500 });
  }
}
