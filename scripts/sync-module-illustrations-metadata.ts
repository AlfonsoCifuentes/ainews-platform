#!/usr/bin/env tsx
/**
 * Script para sincronizar metadatos de ilustraciones de módulos existentes en storage.
 * NO regenera imágenes - solo crea registros en module_illustrations.
 * Usa LLM para generar prompts descriptivos basándose en el contenido del módulo.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

interface ModuleRecord {
  id: string;
  course_id: string;
  order_index: number;
  title_en: string;
  title_es: string;
  content_en: string | null;
  content_es: string | null;
  courses: {
    title_en: string;
    title_es: string;
  } | null;
}

// ============================================================================
// Supabase Client
// ============================================================================

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

// ============================================================================
// LLM for generating descriptive prompts
// ============================================================================

async function generateDescriptivePrompt(
  moduleTitle: string,
  courseTitle: string,
  contentSnippet: string
): Promise<string> {
  // Try DeepSeek first (cheapest), then Groq, then OpenAI
  const providers = [
    { name: 'deepseek', fn: () => callDeepSeek(moduleTitle, courseTitle, contentSnippet) },
    { name: 'groq', fn: () => callGroq(moduleTitle, courseTitle, contentSnippet) },
    { name: 'openai', fn: () => callOpenAI(moduleTitle, courseTitle, contentSnippet) },
  ];

  for (const provider of providers) {
    try {
      const result = await provider.fn();
      if (result) {
        console.log(`    [${provider.name}] Generated prompt`);
        return result;
      }
    } catch (e) {
      console.log(`    [${provider.name}] Failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Fallback: generate a simple prompt without LLM
  return `Educational illustration for "${moduleTitle}" in the course "${courseTitle}". Professional, clear, textbook-style visual representation.`;
}

async function callDeepSeek(moduleTitle: string, courseTitle: string, contentSnippet: string): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating image generation prompts. Generate a concise, descriptive prompt for an educational illustration. Output ONLY the prompt, nothing else. Max 150 words.',
        },
        {
          role: 'user',
          content: `Create an image prompt for a textbook illustration about:
Course: ${courseTitle}
Module: ${moduleTitle}
Content excerpt: ${contentSnippet.slice(0, 500)}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    }),
  });

  if (!response.ok) return null;
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function callGroq(moduleTitle: string, courseTitle: string, contentSnippet: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating image generation prompts. Generate a concise, descriptive prompt for an educational illustration. Output ONLY the prompt, nothing else. Max 150 words.',
        },
        {
          role: 'user',
          content: `Create an image prompt for a textbook illustration about:
Course: ${courseTitle}
Module: ${moduleTitle}
Content excerpt: ${contentSnippet.slice(0, 500)}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    }),
  });

  if (!response.ok) return null;
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function callOpenAI(moduleTitle: string, courseTitle: string, contentSnippet: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating image generation prompts. Generate a concise, descriptive prompt for an educational illustration. Output ONLY the prompt, nothing else. Max 150 words.',
        },
        {
          role: 'user',
          content: `Create an image prompt for a textbook illustration about:
Course: ${courseTitle}
Module: ${moduleTitle}
Content excerpt: ${contentSnippet.slice(0, 500)}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    }),
  });

  if (!response.ok) return null;
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || null;
}

// ============================================================================
// Main sync logic
// ============================================================================

interface FileInFolder {
  moduleId: string;
  fileName: string;
  locale: string;
  style: string;
  visualStyle: string;
}

async function listAllModuleFiles(supabase: ReturnType<typeof getSupabase>): Promise<FileInFolder[]> {
  const result: FileInFolder[] = [];

  // List root level (folders named by module_id)
  const { data: folders, error } = await supabase.storage
    .from('module-illustrations')
    .list('', { limit: 1000 });

  if (error || !folders) {
    console.error('Failed to list storage folders:', error);
    return result;
  }

  // For each folder (module_id), list files inside
  for (const folder of folders) {
    const moduleId = folder.name;
    
    // Validate it's a UUID
    if (!/^[a-f0-9-]{36}$/i.test(moduleId)) {
      continue;
    }

    const { data: files } = await supabase.storage
      .from('module-illustrations')
      .list(moduleId, { limit: 100 });

    if (!files || files.length === 0) continue;

    for (const file of files) {
      // Parse filename: textbook-photorealistic-en-1765279143382.webp
      const match = file.name.match(/^([a-z]+)-([a-z]+)-([a-z]{2})-\d+\.(webp|png|jpg)$/i);
      
      if (match) {
        result.push({
          moduleId,
          fileName: file.name,
          style: match[1],        // textbook
          visualStyle: match[2],  // photorealistic
          locale: match[3],       // en
        });
      }
    }
  }

  return result;
}

async function main() {
  console.log('🔄 Sync Module Illustrations Metadata');
  console.log('=====================================');
  console.log('This script creates metadata records WITHOUT regenerating images.\n');

  const supabase = getSupabase();

  // Step 1: List all files in module-illustrations bucket (recursively)
  console.log('📂 Scanning module-illustrations bucket...');
  
  const allFiles = await listAllModuleFiles(supabase);

  if (allFiles.length === 0) {
    console.log('No files found in storage bucket.');
    return;
  }

  console.log(`Found ${allFiles.length} image files in storage.\n`);

  // Step 2: Get all modules with course info
  console.log('📚 Fetching modules from database...');
  
  const { data: modules, error: modulesError } = await supabase
    .from('course_modules')
    .select('id, course_id, order_index, title_en, title_es, content_en, content_es, courses(title_en, title_es)');

  if (modulesError) {
    console.error('Failed to fetch modules:', modulesError);
    return;
  }

  const moduleMap = new Map<string, ModuleRecord>();
  for (const m of (modules as ModuleRecord[])) {
    moduleMap.set(m.id, m);
  }

  console.log(`Loaded ${moduleMap.size} modules.\n`);

  // Step 3: Check which already have metadata
  console.log('🔍 Checking existing metadata...');
  
  const { data: existingRecords } = await supabase
    .from('module_illustrations')
    .select('module_id, locale, style');

  const existingSet = new Set<string>();
  for (const rec of (existingRecords || [])) {
    existingSet.add(`${rec.module_id}|${rec.locale}|${rec.style}`);
  }

  console.log(`Found ${existingSet.size} existing metadata records.\n`);

  // Step 4: Process each file
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of allFiles) {
    const { moduleId, fileName, locale, style, visualStyle } = file;

    // Check if already has metadata
    const key = `${moduleId}|${locale}|${style}`;
    if (existingSet.has(key)) {
      console.log(`⏭️ Already has metadata: ${moduleId}/${fileName}`);
      skipped++;
      continue;
    }

    // Get module info
    const mod = moduleMap.get(moduleId);
    if (!mod) {
      console.log(`⚠️ Module not found in DB: ${moduleId}`);
      failed++;
      continue;
    }

    const moduleTitle = locale === 'en' ? mod.title_en : mod.title_es;
    const courseTitle = locale === 'en' ? mod.courses?.title_en : mod.courses?.title_es;
    const content = (locale === 'en' ? mod.content_en : mod.content_es) || '';

    console.log(`\n📖 Processing: ${moduleTitle}`);

    // Generate descriptive prompt using LLM
    const prompt = await generateDescriptivePrompt(
      moduleTitle || 'Module',
      courseTitle || 'Course',
      content
    );

    // Get public URL
    const storagePath = `${moduleId}/${fileName}`;
    const { data: urlData } = supabase.storage
      .from('module-illustrations')
      .getPublicUrl(storagePath);

    const imageUrl = urlData?.publicUrl || '';

    // Insert metadata record
    const { error: insertError } = await supabase
      .from('module_illustrations')
      .insert({
        module_id: moduleId,
        locale,
        style,
        visual_style: visualStyle,
        prompt: prompt.slice(0, 2000),
        model: 'runware:97@3',
        provider: 'runware',
        image_url: imageUrl,
        storage_path: `module-illustrations/${storagePath}`,
        source: 'sync-script',
        metadata: { synced_from_storage: true, synced_at: new Date().toISOString() },
      });

    if (insertError) {
      console.log(`    ✗ Failed to insert: ${insertError.message}`);
      failed++;
    } else {
      console.log(`    ✓ Metadata created`);
      created++;
      existingSet.add(key); // Prevent duplicates in same run
    }
  }

  console.log('\n\n========================================');
  console.log('📊 Summary:');
  console.log(`   ✓ Created: ${created}`);
  console.log(`   ⏭️ Skipped: ${skipped}`);
  console.log(`   ✗ Failed: ${failed}`);
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
