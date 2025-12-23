#!/usr/bin/env tsx
/**
 * Upgrade existing news articles - GPT-4o-mini + Value-Added Content
 * 
 * This script re-processes news articles to add editorial VALUE for AdSense:
 * - Uses GPT-4o-mini (cost-effective, fast)
 * - Tracks which model/version was used for rewriting
 * - Adds value_score for quality tracking
 * - Generates insights, not just summaries
 * 
 * Usage:
 *   npx tsx scripts/upgrade-news-content.ts --dry-run   # Preview changes
 *   npx tsx scripts/upgrade-news-content.ts --execute   # Apply changes
 *   npx tsx scripts/upgrade-news-content.ts --execute --limit 10  # Process 10 articles
 *   npx tsx scripts/upgrade-news-content.ts --execute --needs-upgrade  # Only articles without GPT-4o-mini rewrite
 */

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) {
	loadEnv({ path: envLocal });
} else {
	loadEnv();
}

import { z } from 'zod';
import pLimit from 'p-limit';
import OpenAI from 'openai';
import { buildVerticalVoiceSystemPrompt } from '../lib/ai/prompt-voice';
import { getSupabaseServerClient } from '../lib/db/supabase';

// =============================================================================
// OpenAI Client (GPT-4o-mini for cost efficiency)
// =============================================================================

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = 'gpt-4o-mini'; // Fast, cheap, no rate limits
export const REWRITE_VERSION = 2; // Increment when prompt changes significantly
export const REWRITE_MODEL = 'gpt-4o-mini';

// =============================================================================
// Configuration
// =============================================================================

const BATCH_SIZE = 5; // Process 5 articles at a time (OpenAI has high limits)
const DELAY_BETWEEN_BATCHES_MS = 2000; // 2 second delay between batches
const DELAY_BETWEEN_ARTICLES_MS = 500; // 0.5 second delay between articles

// =============================================================================
// Types & Schemas
// =============================================================================

interface NewsArticle {
	id: string;
	title_en: string | null;
	title_es: string | null;
	summary_en: string | null;
	summary_es: string | null;
	content_en: string | null;
	content_es: string | null;
	source_url: string | null;
	created_at: string;
	rewrite_model: string | null;
	rewrite_version: number | null;
}

const ArticleRewriteSchema = z.object({
	title: z.string().describe('Professional, engaging title'),
	summary: z.string().describe('2-sentence executive summary'),
	content: z.string().describe('Structured article with analysis (400+ words)'),
	value_score: z.number().min(0).max(1).optional().describe('Self-assessed quality score'),
});

type ArticleRewrite = z.infer<typeof ArticleRewriteSchema>;

// =============================================================================
// VALUE-ADDED AI Analyst Prompt (optimized for AdSense)
// =============================================================================

function buildValueAddedPrompt(
	title: string,
	summary: string,
	content: string,
	language: 'en' | 'es',
): string {
	const workingContent = content.slice(0, 4000); // Truncate for token limits

	if (language === 'es') {
		return `Eres un analista senior de IA y periodista tecnológico experto. Reescribe el artículo siguiente en español con VALOR EDITORIAL AÑADIDO.

## OBJETIVO
Transformar noticias básicas en contenido premium que aporte valor real al lector y sea atractivo para anunciantes de tecnología.

## ESTRUCTURA REQUERIDA

### Título (title)
- Gancho informativo que capte la atención
- Incluir la innovación clave o el impacto principal
- Máximo 100 caracteres, evitar clickbait vacío

### Resumen (summary) - 80-200 palabras
- Párrafo de entrada que enganche al lector
- Responder: ¿Qué pasó? ¿Por qué importa? ¿Qué viene después?
- Lenguaje claro y directo, sin jerga innecesaria

### Contenido (content) - 400-800 palabras
Estructurar con estas secciones:

1. **La Noticia**: ¿Qué ocurrió exactamente?
2. **Contexto Técnico**: Explica la tecnología subyacente con claridad
3. **Por Qué Importa**: Impacto en usuarios, empresas o la industria
4. **Implicaciones Futuras**: ¿Qué significa para los próximos 6-12 meses?
5. **Punto Clave**: Lo que el lector debe recordar

## REGLAS ESTRICTAS
- NO incluir URLs crudas en el texto
- NO usar "Leer más", "Continuar leyendo", avisos de cookies
- NO mencionar imágenes o elementos UI que falten
- Usar párrafos cortos (2-4 oraciones)
- Incluir términos técnicos relevantes pero explicarlos
- Añadir contexto que un profesional tech encontraría valioso

## CALIDAD (value_score)
Autoevalúa de 0 a 1:
- 0.9-1.0: Análisis profundo con insights únicos
- 0.7-0.9: Buen contexto y explicación clara
- 0.5-0.7: Información básica bien presentada
- <0.5: Solo hechos sin valor añadido

Devuelve SOLO JSON válido con: title, summary, content, value_score

---
ARTÍCULO ORIGINAL:
Título: ${title}
Resumen: ${summary}
Contenido: ${workingContent}`;
	}

	return `You are a senior AI analyst and expert tech journalist. Rewrite the article below in English with VALUE-ADDED EDITORIAL CONTENT.

## OBJECTIVE
Transform basic news into premium content that provides real value to readers and is attractive to technology advertisers.

## REQUIRED STRUCTURE

### Title (title)
- Informative hook that captures attention
- Include the key innovation or main impact
- Maximum 100 characters, avoid empty clickbait

### Summary (summary) - 80-200 words
- Opening paragraph that hooks the reader
- Answer: What happened? Why does it matter? What comes next?
- Clear and direct language, no unnecessary jargon

### Content (content) - 400-800 words
Structure with these sections:

1. **The News**: What exactly happened?
2. **Technical Deep Dive**: Explain the underlying technology clearly
3. **Why It Matters**: Impact on users, companies, or the industry
4. **Future Implications**: What does this mean for the next 6-12 months?
5. **Key Takeaway**: The main point the reader should remember

## STRICT RULES
- Do NOT include raw URLs in the text
- Do NOT use "Read more", "Continue reading", cookie notices
- Do NOT mention missing images or UI elements
- Use short paragraphs (2-4 sentences)
- Include relevant technical terms but briefly explain them
- Add context that a tech professional would find valuable

## QUALITY (value_score)
Self-evaluate from 0 to 1:
- 0.9-1.0: Deep analysis with unique insights
- 0.7-0.9: Good context and clear explanation
- 0.5-0.7: Basic information well presented
- <0.5: Just facts without added value

Return ONLY valid JSON with: title, summary, content, value_score

---
ORIGINAL ARTICLE:
Title: ${title}
Summary: ${summary}
Content: ${workingContent}`;
}

async function generateAIAnalysis(
	title: string,
	summary: string,
	content: string,
	language: 'en' | 'es',
): Promise<ArticleRewrite | null> {
	const systemPrompt = buildVerticalVoiceSystemPrompt({
		locale: language,
		vertical: 'news',
	});

	const prompt = buildValueAddedPrompt(title, summary, content, language);

	try {
		const response = await openai.chat.completions.create({
			model: MODEL,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: prompt },
			],
			temperature: 0.7,
			max_tokens: 2500,
		});
		
		const rawContent = response.choices[0]?.message?.content?.trim() || '';
		
		// Try to extract JSON from response
		let jsonStr = rawContent;
		
		// Remove markdown code fences if present
		if (jsonStr.startsWith('```')) {
			jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
		}
		
		// Try to parse JSON
		try {
			const parsed = JSON.parse(jsonStr);
			const result = ArticleRewriteSchema.parse(parsed);
			// Ensure value_score is set
			if (result.value_score === undefined) {
				result.value_score = 0.7;
			}
			return result;
		} catch {
			// Try to fix common JSON issues with newlines
			const fixedJson = jsonStr
				.replace(/\n/g, '\\n')
				.replace(/\r/g, '\\r')
				.replace(/\t/g, '\\t');
			
			// Find the JSON object boundaries
			const startIdx = fixedJson.indexOf('{');
			const endIdx = fixedJson.lastIndexOf('}');
			
			if (startIdx !== -1 && endIdx !== -1) {
				const extracted = fixedJson.slice(startIdx, endIdx + 1);
				try {
					const parsed = JSON.parse(extracted);
					const result = ArticleRewriteSchema.parse(parsed);
					if (result.value_score === undefined) {
						result.value_score = 0.7;
					}
					return result;
				} catch {
					// Last resort: manually extract fields
					const titleMatch = rawContent.match(/"title"\s*:\s*"([^"]+)"/);
					const summaryMatch = rawContent.match(/"summary"\s*:\s*"([^"]+)"/);
					const contentMatch = rawContent.match(/"content"\s*:\s*"([\s\S]*?)"\s*[,}]/);
					const scoreMatch = rawContent.match(/"value_score"\s*:\s*([\d.]+)/);
					
					if (titleMatch && summaryMatch && contentMatch) {
						return {
							title: titleMatch[1],
							summary: summaryMatch[1],
							content: contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
							value_score: scoreMatch ? parseFloat(scoreMatch[1]) : 0.7,
						};
					}
				}
			}
		}
		
		console.warn('[LLM] Could not parse response');
		return null;
	} catch (error) {
		console.warn('[LLM] Failed to generate analysis:', error instanceof Error ? error.message : error);
		return null;
	}
}

// =============================================================================
// Main Logic
// =============================================================================

async function fetchArticlesToUpgrade(supabase: ReturnType<typeof getSupabaseServerClient>, limit?: number, needsUpgrade?: boolean): Promise<NewsArticle[]> {
	let query = supabase
		.from('news_articles')
		.select('id, title_en, title_es, summary_en, summary_es, content_en, content_es, source_url, created_at, rewrite_model, rewrite_version')
		.order('created_at', { ascending: false });

	// Only fetch articles that need upgrading (not already processed with GPT-4o-mini v2+)
	if (needsUpgrade) {
		query = query.or(
			`rewrite_model.is.null,rewrite_model.neq.${REWRITE_MODEL},rewrite_version.is.null,rewrite_version.lt.${REWRITE_VERSION}`
		);
	}

	if (limit) {
		query = query.limit(limit);
	}

	const { data, error } = await query;

	if (error) {
		console.error('[DB] Error fetching articles:', error.message);
		return [];
	}

	return data || [];
}

async function updateArticle(
	supabase: ReturnType<typeof getSupabaseServerClient>,
	articleId: string,
	updates: {
		title_en?: string;
		title_es?: string;
		summary_en?: string;
		summary_es?: string;
		content_en?: string;
		content_es?: string;
		rewrite_model?: string;
		rewrite_version?: number;
		rewrite_at?: string;
		value_score?: number;
		ai_generated?: boolean;
	},
): Promise<boolean> {
	const { error } = await supabase
		.from('news_articles')
		.update({
			...updates,
			updated_at: new Date().toISOString(),
		})
		.eq('id', articleId);

	if (error) {
		console.error(`[DB] Failed to update article ${articleId}:`, error.message);
		return false;
	}

	return true;
}

async function processArticle(
	article: NewsArticle,
	supabase: ReturnType<typeof getSupabaseServerClient>,
	dryRun: boolean,
): Promise<{ success: boolean; skipped: boolean }> {
	const titleEn = article.title_en || '';
	const titleEs = article.title_es || '';
	const summaryEn = article.summary_en || '';
	const summaryEs = article.summary_es || '';
	const contentEn = article.content_en || '';
	const contentEs = article.content_es || '';

	// Skip if no content to work with
	if (!contentEn && !contentEs && !summaryEn && !summaryEs) {
		console.log(`  ⏭️  Skipping ${article.id.slice(0, 8)}... (no content)`);
		return { success: false, skipped: true };
	}

	const updates: Record<string, any> = {};
	let valueScore = 0.7;

	// Process English version
	if (titleEn || summaryEn || contentEn) {
		console.log(`  🇺🇸 Processing English...`);
		const analysisEn = await generateAIAnalysis(
			titleEn,
			summaryEn,
			contentEn,
			'en',
		);

		if (analysisEn) {
			updates.title_en = analysisEn.title;
			updates.summary_en = analysisEn.summary;
			updates.content_en = analysisEn.content;
			valueScore = analysisEn.value_score ?? 0.7;
		}
		
		// Small delay between languages
		await new Promise((resolve) => setTimeout(resolve, 1500));
	}

	// Process Spanish version
	if (titleEs || summaryEs || contentEs) {
		console.log(`  🇪🇸 Processing Spanish...`);
		const analysisEs = await generateAIAnalysis(
			titleEs,
			summaryEs,
			contentEs,
			'es',
		);

		if (analysisEs) {
			updates.title_es = analysisEs.title;
			updates.summary_es = analysisEs.summary;
			updates.content_es = analysisEs.content;
		}
	}

	if (Object.keys(updates).length === 0) {
		console.log(`  ⚠️  No updates generated for ${article.id.slice(0, 8)}...`);
		return { success: false, skipped: false };
	}

	// Add tracking metadata
	updates.rewrite_model = REWRITE_MODEL;
	updates.rewrite_version = REWRITE_VERSION;
	updates.rewrite_at = new Date().toISOString();
	updates.value_score = valueScore;
	updates.ai_generated = true;

	if (dryRun) {
		console.log(`  📝 [DRY-RUN] Would update article ${article.id.slice(0, 8)}...`);
		console.log(`     Title EN: "${updates.title_en?.slice(0, 60)}..."`);
		console.log(`     Content EN: ${updates.content_en?.length || 0} chars, score: ${valueScore}`);
		return { success: true, skipped: false };
	}

	const success = await updateArticle(supabase, article.id, updates);
	if (success) {
		console.log(`  ✅ Updated article ${article.id.slice(0, 8)}... (score: ${valueScore})`);
	}

	return { success, skipped: false };
}

async function main() {
	const args = process.argv.slice(2);
	const dryRun = !args.includes('--execute');
	const needsUpgrade = args.includes('--needs-upgrade');
	const limitArg = args.find((a) => a.startsWith('--limit'));
	const limit = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1] || '0', 10) : undefined;

	console.log('╔════════════════════════════════════════════════════════════════╗');
	console.log('║  📰 NEWS VALUE-ADDED UPGRADE - GPT-4o-mini + AdSense Ready     ║');
	console.log('╠════════════════════════════════════════════════════════════════╣');
	console.log(`║  Mode: ${dryRun ? '🔍 DRY-RUN (preview only)' : '🚀 EXECUTE (applying changes)'}               ║`);
	console.log(`║  Model: ${REWRITE_MODEL} (version ${REWRITE_VERSION})                          ║`);
	if (needsUpgrade) {
		console.log('║  Filter: Only articles needing upgrade                         ║');
	}
	if (limit) {
		console.log(`║  Limit: ${limit} articles                                          ║`);
	}
	console.log('╚════════════════════════════════════════════════════════════════╝');
	console.log('');

	if (dryRun) {
		console.log('⚠️  DRY-RUN mode: No changes will be saved.');
		console.log('   Use --execute to apply changes.\n');
	}

	// Check for OpenAI API key
	if (!process.env.OPENAI_API_KEY) {
		console.error('❌ OPENAI_API_KEY is required for GPT-4o-mini rewriting');
		console.log('   Set it in .env.local or as environment variable');
		process.exit(1);
	}

	// Initialize clients
	const supabase = getSupabaseServerClient();

	// Fetch articles
	console.log('📥 Fetching articles from database...');
	const articles = await fetchArticlesToUpgrade(supabase, limit, needsUpgrade);
	console.log(`   Found ${articles.length} articles to process.\n`);

	if (articles.length === 0) {
		console.log('✅ No articles to process. Exiting.');
		return;
	}

	// Process in batches
	let processed = 0;
	let successful = 0;
	let skipped = 0;
	let failed = 0;

	const batches = [];
	for (let i = 0; i < articles.length; i += BATCH_SIZE) {
		batches.push(articles.slice(i, i + BATCH_SIZE));
	}

	console.log(`📦 Processing ${batches.length} batches of up to ${BATCH_SIZE} articles each...\n`);

	for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
		const batch = batches[batchIndex];
		console.log(`\n━━━ Batch ${batchIndex + 1}/${batches.length} ━━━`);

		for (const article of batch) {
			processed++;
			const shortTitle = (article.title_en || article.title_es || 'Untitled').slice(0, 50);
			console.log(`\n[${processed}/${articles.length}] "${shortTitle}..."`);

			try {
				const result = await processArticle(article, supabase, dryRun);
				if (result.skipped) {
					skipped++;
				} else if (result.success) {
					successful++;
				} else {
					failed++;
				}
			} catch (error) {
				console.error(`  ❌ Error processing article:`, error instanceof Error ? error.message : error);
				failed++;
			}
			
			// Delay between articles to avoid rate limits
			if (batch.indexOf(article) < batch.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_ARTICLES_MS));
			}
		}

		// Delay between batches to avoid rate limits
		if (batchIndex < batches.length - 1) {
			console.log(`\n⏳ Waiting ${DELAY_BETWEEN_BATCHES_MS / 1000}s before next batch...`);
			await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
		}
	}

	// Summary
	console.log('\n');
	console.log('╔════════════════════════════════════════════════════════════╗');
	console.log('║                      SUMMARY                               ║');
	console.log('╠════════════════════════════════════════════════════════════╣');
	console.log(`║  Total processed: ${processed.toString().padEnd(40)}║`);
	console.log(`║  ✅ Successful:   ${successful.toString().padEnd(40)}║`);
	console.log(`║  ⏭️  Skipped:      ${skipped.toString().padEnd(40)}║`);
	console.log(`║  ❌ Failed:       ${failed.toString().padEnd(40)}║`);
	console.log('╚════════════════════════════════════════════════════════════╝');

	if (dryRun) {
		console.log('\n💡 This was a DRY-RUN. To apply changes, run:');
		console.log('   npx tsx scripts/upgrade-news-content.ts --execute');
		if (limit) {
			console.log(`   npx tsx scripts/upgrade-news-content.ts --execute --limit ${limit}`);
		}
	}
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
