#!/usr/bin/env tsx
/**
 * Force upgrade a specific article by ID
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { z } from 'zod';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ArticleRewriteSchema = z.object({
  title: z.string(),
  summary: z.string(),
  content: z.union([z.string(), z.object({}).passthrough()]),
  value_score: z.number().optional(),
}).transform((data) => {
  let contentStr: string;
  if (typeof data.content === 'object' && data.content !== null) {
    contentStr = Object.entries(data.content)
      .map(([key, value]) => `## ${key.replace(/_/g, ' ')}\n\n${value}`)
      .join('\n\n');
  } else {
    contentStr = data.content as string;
  }
  return { title: data.title, summary: data.summary, content: contentStr, value_score: data.value_score ?? 0.8 };
});

async function rewriteArticle(title: string, summary: string, content: string, lang: 'en' | 'es') {
  const prompt = lang === 'es' 
    ? `Eres un analista senior de IA. Reescribe esta noticia en español con VALOR EDITORIAL AÑADIDO.

Estructura requerida:
1. Título profesional y atractivo (máx 100 caracteres)
2. Resumen ejecutivo (80-200 palabras)  
3. Contenido estructurado (400-800 palabras) con:
   - La noticia: ¿Qué pasó exactamente?
   - Análisis técnico: Explica la tecnología
   - Por qué importa: Impacto en usuarios/industria
   - Implicaciones futuras: ¿Qué significa para los próximos 6-12 meses?
   - Conclusión clave

REGLAS:
- NO incluir URLs crudas en el texto
- NO usar "Leer más", avisos de cookies
- Párrafos cortos (2-4 oraciones)
- Autoevalúa calidad (value_score 0-1)

Devuelve SOLO JSON válido con: title, summary, content, value_score

ARTÍCULO ORIGINAL:
Título: ${title}
Resumen: ${summary}
Contenido: ${content.slice(0, 4000)}`
    : `You are a senior AI analyst. Rewrite this news with EDITORIAL VALUE ADDED.

Required structure:
1. Professional, engaging title (max 100 chars)
2. Executive summary (80-200 words)
3. Structured content (400-800 words) with:
   - The News: What happened?
   - Technical Deep Dive
   - Why It Matters
   - Future Implications
   - Key Takeaway

RULES:
- NO raw URLs
- NO "Read more", cookie notices
- Short paragraphs
- Self-evaluate quality (value_score 0-1)

Return ONLY valid JSON with: title, summary, content, value_score

ORIGINAL:
Title: ${title}
Summary: ${summary}
Content: ${content.slice(0, 4000)}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 2500,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content?.trim() || '';
  return ArticleRewriteSchema.parse(JSON.parse(raw));
}

async function main() {
  const articleId = process.argv[2];
  if (!articleId) {
    console.error('Usage: npx tsx scripts/force-upgrade-article.ts <article-id>');
    process.exit(1);
  }

  console.log(`🔍 Fetching article ${articleId}...`);

  const { data: article, error } = await db
    .from('news_articles')
    .select('*')
    .eq('id', articleId)
    .single();

  if (error || !article) {
    console.error('Article not found:', error);
    process.exit(1);
  }

  console.log(`📰 Found: ${article.title_es?.slice(0, 60)}...`);
  console.log(`   Current rewrite_model: ${article.rewrite_model || 'NONE'}`);
  console.log(`   Current rewrite_version: ${article.rewrite_version || 0}`);

  console.log('\n🇺🇸 Rewriting English...');
  const en = await rewriteArticle(
    article.title_en || article.title_es || '',
    article.summary_en || article.summary_es || '',
    article.content_en || article.content_es || '',
    'en'
  );
  console.log(`   ✓ Title: ${en.title.slice(0, 60)}...`);

  console.log('\n🇪🇸 Rewriting Spanish...');
  const es = await rewriteArticle(
    article.title_es || article.title_en || '',
    article.summary_es || article.summary_en || '',
    article.content_es || article.content_en || '',
    'es'
  );
  console.log(`   ✓ Title: ${es.title.slice(0, 60)}...`);

  console.log('\n💾 Updating database...');
  const { error: updateError } = await db
    .from('news_articles')
    .update({
      title_en: en.title,
      summary_en: en.summary,
      content_en: en.content,
      title_es: es.title,
      summary_es: es.summary,
      content_es: es.content,
      rewrite_model: 'gpt-4o-mini',
      rewrite_version: 2,
      rewrite_at: new Date().toISOString(),
      value_score: Math.max(en.value_score, es.value_score),
      ai_generated: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', articleId);

  if (updateError) {
    console.error('❌ Update failed:', updateError);
    process.exit(1);
  }

  console.log('\n✅ Article upgraded successfully!');
  console.log(`   Value score: ${Math.max(en.value_score, es.value_score)}`);
}

main().catch(console.error);
