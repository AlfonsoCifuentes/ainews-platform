#!/usr/bin/env tsx

/* Remodel all courses using Ollama heavy model
 * Usage: OLLAMA_HOST=http://localhost:11434 OLLAMA_MODEL=gpt-4o ./scripts/remodel-courses-ollama.ts
 */

import 'dotenv/config';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || process.env.OLLAMA_MODEL || 'gpt-4o-mini';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function remodelCourse(courseId: string) {
  console.log(`Remodeling course: ${courseId}`);

  const { data: modules } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  if (!modules || modules.length === 0) {
    console.log(`No modules for course ${courseId}`);
    return;
  }

  for (const mod of modules) {
    const prompt = `You are an expert course designer. Expand the following module into a detailed professional-level learning module. Provide:
- Deeper explanations
- Examples
- Exercises with answers and grading rubrics
- Short exam questions
- Gamified activity ideas

Module Title: ${mod.title_en}\n
Module Content:\n${mod.content_en}\n
Please return JSON with fields: "content" (longer markdown), "exercises" (array of question objects), "exam" (array of exam questions with answers), and "activityIdeas" (array).`;

    console.log(`Calling Ollama to expand module: ${mod.id}`);

    const resp = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt }),
    });

    if (!resp.ok) {
      console.error('Ollama call failed', await resp.text());
      continue;
    }

    const output = await resp.text();

    // Try parse JSON from output; if not JSON, just append output to content
    let content = mod.content_en || '';
    try {
      const json = JSON.parse(output);
      const newContent = json.content || output;
      // For now, update content_en to be the new generated content
      content = newContent;
    } catch (e) {
      // Not JSON, append generated text
      content = `${mod.content_en}\n\n---\n\n${output}`;
    }

    // Save back to DB
    const { error } = await supabase
      .from('course_modules')
      .update({ content_en: content })
      .eq('id', mod.id);

    if (error) {
      console.error('Failed to update module', mod.id, error.message);
    } else {
      console.log(`Updated module ${mod.id}`);
    }

    // Optional: wait to avoid rate limits
    await new Promise((res) => setTimeout(res, 250));
  }
}

async function main() {
  const { data: courses } = await supabase.from('courses').select('id').limit(100);
  if (!courses) {
    console.log('No courses found');
    return;
  }

  for (const course of courses) {
    await remodelCourse(course.id);
  }
}

main().then(() => console.log('Remodel complete')).catch((e) => console.error(e));
