import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { createLLMClient } from '@/lib/ai/llm-client';

const GenerateRequestSchema = z.object({
  topic: z.string().min(3).max(200),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  duration: z.enum(['short', 'medium', 'long']),
  locale: z.enum(['en', 'es'])
});

const CourseOutlineSchema = z.object({
  title: z.string(),
  description: z.string(),
  modules: z.array(z.object({
    title: z.string(),
    description: z.string(),
    estimated_minutes: z.number(),
    topics: z.array(z.string())
  }))
});

const ModuleContentSchema = z.object({
  content: z.string().describe('Detailed module content in markdown format'),
  key_concepts: z.array(z.string()),
  quiz_questions: z.array(z.object({
    question: z.string(),
    options: z.array(z.string()),
    correct_answer: z.number().min(0).max(3),
    explanation: z.string()
  })),
  resources: z.array(z.object({
    title: z.string(),
    url: z.string(),
    type: z.enum(['article', 'video', 'paper', 'documentation'])
  }))
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params = GenerateRequestSchema.parse(body);
    
    const db = getSupabaseServerClient();
    const llm = createLLMClient('groq');
    
    console.log(`[Course Generator] Generating course on "${params.topic}" (${params.difficulty})`);
    
    // Step 1: Search for relevant context using RAG
    const contextArticles = await db.rpc('match_documents', {
      query_embedding: await generateQueryEmbedding(params.topic),
      match_threshold: 0.75,
      match_count: 5
    });
    
    const context = contextArticles.data
      ?.map((doc: { title_en?: string; title_es?: string; content_en?: string; content_es?: string }) => 
        `${doc.title_en || doc.title_es}\n${doc.content_en || doc.content_es}`
      )
      .join('\n\n')
      .slice(0, 4000);
    
    // Step 2: Generate course outline
    console.log('[Course Generator] Creating outline...');
    const outline = await llm.classify(
      `You are an expert AI educator. Create a comprehensive course outline on: "${params.topic}"
      
Difficulty: ${params.difficulty}
Duration: ${params.duration} (short=2-3 modules, medium=4-6, long=7-10)
Language: ${params.locale === 'en' ? 'English' : 'Spanish'}

Use this recent AI news context to make the course current and relevant:
${context}

Generate a structured course outline with title, description, and modules.
Each module should have a clear title, description, estimated minutes, and covered topics.`,
      CourseOutlineSchema
    );
    
    // Step 3: Insert course
    const { data: course, error: courseError } = await db
      .from('courses')
      .insert({
        [`title_${params.locale}`]: outline.title,
        [`description_${params.locale}`]: outline.description,
        difficulty: params.difficulty,
        estimated_duration_minutes: outline.modules.reduce((sum, m) => sum + m.estimated_minutes, 0),
        topics: outline.modules.flatMap(m => m.topics),
        ai_generated: true
      })
      .select('id')
      .single();
    
    if (courseError) throw courseError;
    
    // Step 4: Generate and insert modules
    console.log('[Course Generator] Generating module content...');
    const modules = [];
    
    for (let i = 0; i < outline.modules.length; i++) {
      const moduleOutline = outline.modules[i];
      
      const moduleContent = await llm.classify(
        `Generate detailed content for this course module:

Title: ${moduleOutline.title}
Description: ${moduleOutline.description}
Topics: ${moduleOutline.topics.join(', ')}
Difficulty: ${params.difficulty}
Language: ${params.locale === 'en' ? 'English' : 'Spanish'}

Context from recent AI news:
${context}

Provide:
1. Comprehensive markdown content (min 800 words)
2. Key concepts list
3. 3-5 quiz questions (multiple choice with explanations)
4. 2-4 relevant resources (articles, videos, papers)`,
        ModuleContentSchema
      );
      
      const { data: module, error: moduleError } = await db
        .from('course_modules')
        .insert({
          course_id: course.id,
          [`title_${params.locale}`]: moduleOutline.title,
          [`description_${params.locale}`]: moduleOutline.description,
          [`content_${params.locale}`]: moduleContent.content,
          order_index: i,
          estimated_duration_minutes: moduleOutline.estimated_minutes,
          quiz_questions: moduleContent.quiz_questions,
          resources: moduleContent.resources
        })
        .select()
        .single();
      
      if (moduleError) throw moduleError;
      modules.push(module);
      
      console.log(`[Course Generator] ✓ Module ${i + 1}/${outline.modules.length}`);
    }
    
    // Step 5: Translate to other language if needed
    if (params.locale === 'en') {
      console.log('[Course Generator] Translating to Spanish...');
      // TODO: Add translation for es locale
    } else {
      console.log('[Course Generator] Translating to English...');
      // TODO: Add translation for en locale
    }
    
    // Step 6: Log performance
    await db.from('ai_system_logs').insert({
      action_type: 'course_generation',
      model_used: 'groq/llama-3.3-70b-versatile',
      success: true,
      execution_time: Date.now(),
      metadata: {
        topic: params.topic,
        difficulty: params.difficulty,
        modules_generated: modules.length
      }
    });
    
    console.log(`[Course Generator] ✅ Course "${outline.title}" generated successfully`);
    
    return NextResponse.json({
      success: true,
      data: {
        course_id: course.id,
        title: outline.title,
        modules_count: modules.length,
        estimated_duration_minutes: outline.modules.reduce((sum, m) => sum + m.estimated_minutes, 0)
      }
    });
    
  } catch (error) {
    console.error('[Course Generator] ❌ Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to generate course', message: String(error) },
      { status: 500 }
    );
  }
}

async function generateQueryEmbedding(query: string): Promise<number[]> {
  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'openai/text-embedding-ada-002',
      input: query
    })
  });
  
  const data = await response.json();
  return data.data[0].embedding;
}
