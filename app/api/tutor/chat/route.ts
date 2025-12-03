import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callLLMWithCascade } from '@/lib/ai/llm-cascade';

const RequestSchema = z.object({
  contentId: z.string(),
  contentType: z.enum(['article', 'course', 'module']),
  contentTitle: z.string(),
  contentContext: z.string().optional(),
  message: z.string().min(1),
  action: z.enum(['explain', 'example', 'quiz', 'flashcards']).optional(),
  locale: z.enum(['en', 'es']),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional(),
});

const SYSTEM_PROMPTS = {
  en: {
    base: `You are an expert AI tutor helping users understand content about Artificial Intelligence. 
You have access to the context of what the user is reading/studying.
Be helpful, educational, and encouraging. Use examples when helpful.
Keep responses concise but thorough. Use markdown for formatting when appropriate.`,
    explain: `The user wants a simpler explanation of the current content.
Break down complex concepts into digestible parts.
Use analogies and everyday examples to make it relatable.`,
    example: `The user wants a practical example related to the current content.
Provide a real-world, hands-on example they can relate to.
If relevant, include a simple code snippet or step-by-step process.`,
    quiz: `Generate a quick quiz (3-4 questions) to test the user's understanding.
Include a mix of question types: multiple choice, true/false, or short answer.
Format each question clearly and provide the answers at the end.`,
    flashcards: `Generate 5 flashcards for key concepts from this content.
Format each as:
**Card N:**
- Front: [question or term]
- Back: [answer or definition]`,
  },
  es: {
    base: `Eres un tutor experto de IA ayudando a usuarios a entender contenido sobre Inteligencia Artificial.
Tienes acceso al contexto de lo que el usuario está leyendo/estudiando.
Sé útil, educativo y motivador. Usa ejemplos cuando sea útil.
Mantén las respuestas concisas pero completas. Usa markdown para formatear cuando sea apropiado.`,
    explain: `El usuario quiere una explicación más simple del contenido actual.
Desglosa conceptos complejos en partes digeribles.
Usa analogías y ejemplos cotidianos para hacerlo más accesible.`,
    example: `El usuario quiere un ejemplo práctico relacionado con el contenido actual.
Proporciona un ejemplo del mundo real y práctico con el que puedan relacionarse.
Si es relevante, incluye un fragmento de código simple o un proceso paso a paso.`,
    quiz: `Genera un quiz rápido (3-4 preguntas) para probar la comprensión del usuario.
Incluye una mezcla de tipos de preguntas: opción múltiple, verdadero/falso o respuesta corta.
Formatea cada pregunta claramente y proporciona las respuestas al final.`,
    flashcards: `Genera 5 tarjetas de estudio para conceptos clave de este contenido.
Formatea cada una como:
**Tarjeta N:**
- Frente: [pregunta o término]
- Reverso: [respuesta o definición]`,
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      contentTitle,
      contentContext,
      message,
      action,
      locale,
      history = [],
    } = RequestSchema.parse(body);

    const prompts = SYSTEM_PROMPTS[locale];
    
    // Build system prompt
    let systemPrompt = prompts.base;
    if (action && prompts[action]) {
      systemPrompt += `\n\n${prompts[action]}`;
    }

    // Build context
    const contextSection = contentContext
      ? `\n\n**Content being studied:** "${contentTitle}"\n**Context:** ${contentContext.slice(0, 2000)}`
      : `\n\n**Content being studied:** "${contentTitle}"`;

    // Build conversation
    const messages = [
      { role: 'system' as const, content: systemPrompt + contextSection },
      ...history.slice(-6).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // Call LLM with cascade fallback
    const response = await callLLMWithCascade({
      messages,
      maxTokens: 1000,
      temperature: 0.7,
      task: 'tutor-chat',
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to generate response');
    }

    // If flashcards action, we could also store them in the database
    // For now, just return the response
    const flashcardsGenerated = action === 'flashcards';

    return NextResponse.json({
      response: response.content,
      flashcardsGenerated,
      model: response.model,
      provider: response.provider,
    });
  } catch (error) {
    console.error('[Tutor API Error]:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
