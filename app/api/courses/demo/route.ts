/**
 * Demo course generation endpoint
 * Returns a sample course without hitting rate limits
 * Perfect for testing the UI and flow
 * 
 * Build v2 - Force Vercel redeploy to include this endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import crypto from 'crypto';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

function generateId(): string {
  return crypto.randomUUID();
}

const GenerateRequestSchema = z.object({
  topic: z.string().min(3).max(200),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  duration: z.enum(['short', 'medium', 'long']),
  locale: z.enum(['en', 'es'])
});

const demoCoursesEN = {
  'AI': {
    title: 'Introduction to Artificial Intelligence',
    description: 'Learn the fundamentals of AI, from machine learning to neural networks.',
    modules: [
      {
        title: 'What is AI?',
        description: 'Understanding artificial intelligence and its applications',
        content: '# What is AI?\n\nArtificial Intelligence is the simulation of human intelligence processes by computer systems.'
      },
      {
        title: 'Machine Learning Basics',
        description: 'Explore supervised and unsupervised learning',
        content: '# Machine Learning Basics\n\nMachine learning enables computers to learn from data without explicit programming.'
      },
      {
        title: 'Neural Networks',
        description: 'Understanding how neural networks work',
        content: '# Neural Networks\n\nNeural networks are inspired by biological neurons and form the basis of deep learning.'
      }
    ]
  },
  'Python': {
    title: 'Python for Data Science',
    description: 'Master Python programming for data analysis and visualization.',
    modules: [
      {
        title: 'Python Fundamentals',
        description: 'Learn Python syntax and core concepts',
        content: '# Python Fundamentals\n\nPython is a versatile, beginner-friendly programming language.'
      },
      {
        title: 'NumPy and Pandas',
        description: 'Working with numerical data in Python',
        content: '# NumPy and Pandas\n\nThese libraries provide powerful data manipulation capabilities.'
      },
      {
        title: 'Data Visualization',
        description: 'Create compelling visualizations with Matplotlib and Seaborn',
        content: '# Data Visualization\n\nEffective visualizations communicate insights clearly.'
      }
    ]
  }
};

const demoCoursesES = {
  'IA': {
    title: 'Introducción a la Inteligencia Artificial',
    description: 'Aprende los fundamentos de la IA, desde machine learning hasta redes neuronales.',
    modules: [
      {
        title: '¿Qué es la IA?',
        description: 'Entender la inteligencia artificial y sus aplicaciones',
        content: '# ¿Qué es la IA?\n\nLa inteligencia artificial es la simulación de procesos de inteligencia humana por sistemas informáticos.'
      },
      {
        title: 'Fundamentos de Machine Learning',
        description: 'Explora el aprendizaje supervisado y no supervisado',
        content: '# Fundamentos de Machine Learning\n\nEl machine learning permite a las computadoras aprender de datos sin programación explícita.'
      },
      {
        title: 'Redes Neuronales',
        description: 'Entender cómo funcionan las redes neuronales',
        content: '# Redes Neuronales\n\nLas redes neuronales se inspiran en neuronas biológicas y forman la base del aprendizaje profundo.'
      }
    ]
  },
  'Python': {
    title: 'Python para Ciencia de Datos',
    description: 'Domina la programación en Python para análisis y visualización de datos.',
    modules: [
      {
        title: 'Fundamentos de Python',
        description: 'Aprende sintaxis y conceptos principales de Python',
        content: '# Fundamentos de Python\n\nPython es un lenguaje de programación versátil y amigable para principiantes.'
      },
      {
        title: 'NumPy y Pandas',
        description: 'Trabajar con datos numéricos en Python',
        content: '# NumPy y Pandas\n\nEstas bibliotecas proporcionan potentes capacidades de manipulación de datos.'
      },
      {
        title: 'Visualización de Datos',
        description: 'Crea visualizaciones convincentes con Matplotlib y Seaborn',
        content: '# Visualización de Datos\n\nLas visualizaciones efectivas comunican insights claramente.'
      }
    ]
  }
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params = GenerateRequestSchema.parse(body);

    // Get or create demo course
    const demoCoursesDB = params.locale === 'es' ? demoCoursesES : demoCoursesEN;
    const topicKey = Object.keys(demoCoursesDB).find(key => 
      params.topic.toLowerCase().includes(key.toLowerCase())
    );
    
    const demoCourse = topicKey ? demoCoursesDB[topicKey as keyof typeof demoCoursesDB] : null;

    if (!demoCourse) {
      return NextResponse.json(
        {
          success: false,
          error: `Demo course not found for topic: ${params.topic}. Try "AI" or "Python"`
        },
        { status: 404 }
      );
    }

    // Create database record
    const supabase = getSupabaseServerClient();
    const courseId = generateId();

    const { error: insertError } = await supabase
      .from('courses')
      .insert({
        id: courseId,
        title_en: demoCourse.title,
        title_es: demoCourse.title,
        description_en: demoCourse.description,
        description_es: demoCourse.description,
        category: 'AI',
        difficulty: params.difficulty,
        estimated_duration_minutes: params.duration === 'short' ? 30 : params.duration === 'medium' ? 60 : 120,
        is_ai_generated: true,
        source: 'demo'
      });

    if (insertError) {
      console.error('Failed to insert course:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create course',
          details: insertError.message
        },
        { status: 500 }
      );
    }

    // Create modules
    for (let i = 0; i < demoCourse.modules.length; i++) {
      const moduleData = demoCourse.modules[i];
      const { error: moduleError } = await supabase
        .from('course_modules')
        .insert({
          course_id: courseId,
          order_index: i,
          title_en: moduleData.title,
          title_es: moduleData.title,
          description_en: moduleData.description,
          description_es: moduleData.description,
          content_en: moduleData.content,
          content_es: moduleData.content,
          estimated_minutes: 15
        });

      if (moduleError) {
        console.error('Failed to insert module:', moduleError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        course_id: courseId,
        title: demoCourse.title,
        modules_count: demoCourse.modules.length,
        estimated_duration_minutes: params.duration === 'short' ? 30 : params.duration === 'medium' ? 60 : 120
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMsg, success: false },
      { status: 500 }
    );
  }
}
