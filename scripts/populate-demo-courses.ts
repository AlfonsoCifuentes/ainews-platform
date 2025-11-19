/**
 * Populate Supabase with demo AI courses
 * Run: npx tsx scripts/populate-demo-courses.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const demoCourses = [
  {
    title_en: 'Getting Started with LLMs',
    title_es: 'Introducción a los Modelos de Lenguaje',
    description_en: 'Learn the fundamentals of Large Language Models and how they work.',
    description_es: 'Aprende los fundamentos de los modelos de lenguaje grandes.',
    category: 'Fundamentals',
    difficulty: 'beginner',
    duration_minutes: 180,
    topics: ['LLMs', 'Neural Networks', 'Transformers'],
    status: 'published'
  },
  {
    title_en: 'Prompt Engineering Mastery',
    title_es: 'Dominio de la Ingeniería de Prompts',
    description_en: 'Master the art of crafting effective prompts for AI models.',
    description_es: 'Domina el arte de crear prompts efectivos para modelos de IA.',
    category: 'Practical',
    difficulty: 'intermediate',
    duration_minutes: 240,
    topics: ['Prompting', 'ChatGPT', 'Claude'],
    status: 'published'
  },
  {
    title_en: 'RAG Systems and Vector Databases',
    title_es: 'Sistemas RAG y Bases de Datos Vectoriales',
    description_en: 'Build Retrieval-Augmented Generation systems with embeddings.',
    description_es: 'Construye sistemas de generación aumentada por recuperación.',
    category: 'Advanced',
    difficulty: 'advanced',
    duration_minutes: 360,
    topics: ['RAG', 'Embeddings', 'Vector Databases'],
    status: 'published'
  },
  {
    title_en: 'Fine-tuning Language Models',
    title_es: 'Ajuste Fino de Modelos de Lenguaje',
    description_en: 'Learn how to fine-tune LLMs for specific tasks.',
    description_es: 'Aprende cómo ajustar modelos de lenguaje para tareas específicas.',
    category: 'Advanced',
    difficulty: 'advanced',
    duration_minutes: 420,
    topics: ['Fine-tuning', 'LoRA', 'QLoRA'],
    status: 'published'
  },
  {
    title_en: 'AI Ethics and Responsible AI',
    title_es: 'Ética de la IA e IA Responsable',
    description_en: 'Understanding ethical considerations in AI development.',
    description_es: 'Comprende las consideraciones éticas en el desarrollo de IA.',
    category: 'Fundamentals',
    difficulty: 'beginner',
    duration_minutes: 150,
    topics: ['Ethics', 'Bias', 'Fairness'],
    status: 'published'
  },
  {
    title_en: 'Building AI Agents',
    title_es: 'Construcción de Agentes de IA',
    description_en: 'Create autonomous AI agents with tool use and reasoning.',
    description_es: 'Crea agentes de IA autónomos con herramientas y razonamiento.',
    category: 'Advanced',
    difficulty: 'advanced',
    duration_minutes: 480,
    topics: ['Agents', 'Tool Use', 'Reasoning'],
    status: 'published'
  },
  {
    title_en: 'Multimodal AI: Vision and Language',
    title_es: 'IA Multimodal: Visión y Lenguaje',
    description_en: 'Work with models that understand both text and images.',
    description_es: 'Trabaja con modelos que entienden texto e imágenes.',
    category: 'Practical',
    difficulty: 'intermediate',
    duration_minutes: 300,
    topics: ['Vision', 'Multimodal', 'CLIP'],
    status: 'published'
  },
  {
    title_en: 'LLM Security and Safety',
    title_es: 'Seguridad de los Modelos de Lenguaje',
    description_en: 'Protect your AI applications from adversarial attacks.',
    description_es: 'Protege tus aplicaciones de IA de ataques adversariales.',
    category: 'Advanced',
    difficulty: 'advanced',
    duration_minutes: 280,
    topics: ['Security', 'Adversarial', 'Safety'],
    status: 'published'
  },
  {
    title_en: 'Generative AI for Content Creation',
    title_es: 'IA Generativa para Creación de Contenido',
    description_en: 'Use AI to generate text, images, and multimedia content.',
    description_es: 'Usa IA para generar contenido de texto, imágenes y multimedia.',
    category: 'Practical',
    difficulty: 'intermediate',
    duration_minutes: 210,
    topics: ['Content', 'Generation', 'Creative AI'],
    status: 'published'
  },
  {
    title_en: 'Understanding Transformers Deep Dive',
    title_es: 'Comprensión Profunda de Transformers',
    description_en: 'Deep dive into the transformer architecture that powers modern AI.',
    description_es: 'Análisis profundo de la arquitectura transformer moderna.',
    category: 'Fundamentals',
    difficulty: 'advanced',
    duration_minutes: 400,
    topics: ['Transformers', 'Attention', 'Self-Attention'],
    status: 'published'
  }
];

async function populateCourses() {
  console.log('🚀 Adding demo courses (keeping existing ones)...\n');

  try {
    // Get existing courses count
    const { count: existingCount } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Existing courses: ${existingCount || 0}`);

    // Add default values for each course
    const coursesToInsert = demoCourses.map(course => ({
      ...course,
      enrollment_count: Math.floor(Math.random() * 500),
      rating_avg: Math.min(5.0, Math.max(1.0, parseFloat((Math.random() * 2 + 3).toFixed(1)))),
      completion_rate: Math.min(100, Math.max(0, Math.random() * 80)),
      view_count: Math.floor(Math.random() * 2000),
      created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      published_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
    }));

    // Insert courses
    const { data, error } = await supabase
      .from('courses')
      .insert(coursesToInsert)
      .select();

    if (error) {
      console.error('❌ Error inserting courses:', error);
      process.exit(1);
    }

    console.log(`✅ Successfully inserted ${data?.length || 0} NEW courses\n`);

    console.log('📚 Courses added:');
    data?.forEach((course: Record<string, unknown>, index: number) => {
      console.log(`  ${index + 1}. ${course.title_en}`);
    });

    // Get updated total
    const { count: totalAfter } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Total courses now: ${totalAfter || 0}`);
    console.log('✅ Done! New courses are available in the library.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

populateCourses();
