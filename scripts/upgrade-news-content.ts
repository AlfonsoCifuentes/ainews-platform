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
import {
	assessNewsArticleFormatting,
	normalizeNewsArticleMarkdown,
	sanitizeScrapedContent,
} from '../lib/utils/content-formatter';
import { parseJSON, sanitizeAndFixJSON } from '../lib/utils/json-fixer';

// =============================================================================
// OpenAI Client (GPT-4o-mini for cost efficiency)
// =============================================================================

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = 'gpt-4o-mini'; // Fast, cheap, no rate limits
export const REWRITE_VERSION = 5; // Increment when prompt changes significantly
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
	title: z.string().min(8).max(180).describe('Professional, engaging title'),
	summary: z.string().min(80).max(900).describe('Executive summary'),
	content: z.union([
		z.string(),
		z.object({}).passthrough(), // Accept object and convert later
	]).describe('Flowing article text (1500-2500 words)'),
	value_score: z.number().min(0).max(1).optional().describe('Self-assessed quality score'),
}).transform((data) => {
	// If content is an object, convert to flowing text (NO markdown headings)
	let contentStr: string;
	if (typeof data.content === 'object' && data.content !== null) {
		// Just join the values as paragraphs, no headings
		contentStr = Object.entries(data.content)
			.map(([, value]) => String(value))
			.join('\n\n');
	} else {
		contentStr = data.content as string;
	}
	// Remove any markdown headings that might have been included, then ensure
	// the stored article is readable Markdown rather than one giant paragraph.
	contentStr = normalizeNewsArticleMarkdown(
		contentStr.replace(/^##?\s+.+$/gm, '').replace(/\n{3,}/g, '\n\n').trim(),
	);
	return {
		title: data.title,
		summary: sanitizeScrapedContent(data.summary),
		content: contentStr,
		value_score: data.value_score,
	};
}).pipe(
	z.object({
		title: z.string().min(8).max(180),
		summary: z.string().min(80).max(900),
		// Allow much longer content for comprehensive news articles (1500-2500 words = ~9000-15000 chars).
		content: z.string().min(5000).max(15000),
		value_score: z.number().min(0).max(1).optional(),
	}),
);

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
	const workingContent = content.slice(0, 5200); // Truncate for token limits

	if (language === 'es') {
		return `Eres un analista senior de IA y periodista tecnológico experto. Reescribe el artículo siguiente en español con VALOR EDITORIAL AÑADIDO.

## OBJETIVO
Transformar noticias básicas en contenido premium que aporte valor real al lector.

## ESTRUCTURA REQUERIDA

### Título (title)
- Debe ser CLARAMENTE diferente al título original (no reutilices la misma frase)
- Gancho informativo que capte la atención
- Máximo 110 caracteres, evitar clickbait vacío

### Resumen (summary) - 120-240 palabras
- Párrafo de entrada que enganche al lector
- Responder: ¿Qué pasó? ¿Por qué importa?
- Lenguaje claro y directo
- Reformular (no calcar el resumen original)

### Contenido (content) - 1500-2500 palabras (OBLIGATORIO: contenido extenso y detallado)
IMPORTANTE: Escribe como un artículo periodístico profesional EXTENSO, con secciones claras y lectura fluida.
- Usa encabezados Markdown ##/### cuando ayuden a ordenar la lectura
- Evita títulos de sección genéricos o mecánicos
- NO uses listas con bullets o números
- Escribe párrafos fluidos que integren naturalmente:
  * Qué ocurrió exactamente (con todos los detalles técnicos relevantes)
  * La tecnología involucrada (explicada con claridad y profundidad)
  * Contexto amplio (antecedentes históricos, evolución del campo)
  * El impacto en usuarios/industria/sociedad
  * Análisis técnico profundo (cómo funciona, arquitectura, innovaciones clave)
  * Comparación con alternativas / estado del arte (si aplica)
  * Implicaciones futuras y qué vigilar
  * Riesgos, limitaciones o contrapesos
  * Una conclusión memorable

El contenido debe leerse como prosa periodística, no como un documento estructurado.

## REGLAS
- NO incluir URLs crudas
- NO usar "Leer más", avisos de cookies
- Párrafos cortos (2-4 oraciones)
- Usar subtítulos Markdown ##/### cuando ayuden y negrita **moderada** para conceptos clave
- Separar SIEMPRE cada párrafo con una línea en blanco (\n\n); nunca devolver un único bloque largo.
- Ningún párrafo debe superar 900 caracteres.
- Términos técnicos explicados brevemente

IMPORTANTE: NO copies frases largas del original. Reformula.

## CALIDAD (value_score): Autoevalúa de 0 a 1

Devuelve SOLO JSON válido con: title, summary, content, value_score

---
ARTÍCULO ORIGINAL:
Título: ${title}
Resumen: ${summary}
Contenido: ${workingContent}`;
	}

	return `You are a senior AI analyst and expert tech journalist. Rewrite the article below in English with VALUE-ADDED EDITORIAL CONTENT.

## OBJECTIVE
Transform basic news into premium content that provides real value to readers.

## REQUIRED STRUCTURE

### Title (title)
- Must be CLEARLY different from the original headline (do not reuse the same phrasing)
- Informative hook that captures attention
- Maximum 110 characters, avoid empty clickbait

### Summary (summary) - 120-240 words
- Opening paragraph that hooks the reader
- Answer: What happened? Why does it matter?
- Clear and direct language
- Rephrase (do not mirror the original summary wording)

### Content (content) - 1500-2500 words (MANDATORY: comprehensive and detailed content)
IMPORTANT: Write as a professional EXTENSIVE journalistic article, with clear sections and flowing prose.
- Use Markdown ##/### subheadings when they help structure the reading
- Avoid generic or mechanical section titles
- Do NOT use bullet lists or numbered lists
- Write smooth flowing paragraphs that naturally integrate:
  * What exactly happened (with all relevant technical details)
  * The technology involved (explained clearly and in-depth)
  * Broad context (historical background, field evolution)
  * Impact on users/industry/society
  * Deep technical analysis (how it works, architecture, key innovations)
  * Comparisons to alternatives / prior state (if applicable)
  * Future implications and what to watch
  * Risks, limitations or counterpoints
  * A memorable conclusion

The content should read like journalistic prose, not a structured document.

## RULES
- Do NOT include raw URLs in the text
- Do NOT use "Read more", cookie notices
- Short paragraphs (2-4 sentences)
- Use Markdown ##/### subheadings when helpful and moderate **bold** for key concepts
- ALWAYS separate each paragraph with a blank line (\n\n); never return one long block.
- No paragraph may exceed 900 characters.
- Technical terms explained briefly

IMPORTANT: Do not copy long phrases from the original. Paraphrase.

## QUALITY (value_score): Self-evaluate from 0 to 1

Return ONLY valid JSON with: title, summary, content, value_score

---
ORIGINAL ARTICLE:
Title: ${title}
Summary: ${summary}
Content: ${workingContent}`;
}

function normalizeForSimilarity(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function tokenSet(text: string): Set<string> {
	const normalized = normalizeForSimilarity(text);
	if (!normalized) return new Set();
	return new Set(
		normalized
			.split(' ')
			.map((t) => t.trim())
			.filter((t) => t.length >= 3),
	);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 && b.size === 0) return 1;
	if (a.size === 0 || b.size === 0) return 0;
	let intersection = 0;
	for (const t of a) {
		if (b.has(t)) intersection += 1;
	}
	const union = a.size + b.size - intersection;
	return union === 0 ? 0 : intersection / union;
}

function isMeaningfullyDifferent(inputTitle: string, outputTitle: string, inputSummary: string, outputSummary: string): { ok: boolean; reasons: string[] } {
	const reasons: string[] = [];
	const inTitle = normalizeForSimilarity(inputTitle);
	const outTitle = normalizeForSimilarity(outputTitle);
	if (inTitle && outTitle && inTitle === outTitle) {
		reasons.push('title_identical');
	} else {
		const titleSim = jaccardSimilarity(tokenSet(inputTitle), tokenSet(outputTitle));
		if (titleSim >= 0.72) reasons.push(`title_too_similar:${titleSim.toFixed(2)}`);
	}
	const summarySim = jaccardSimilarity(tokenSet(inputSummary), tokenSet(outputSummary));
	if (summarySim >= 0.78) reasons.push(`summary_too_similar:${summarySim.toFixed(2)}`);
	return { ok: reasons.length === 0, reasons };
}

function validateValueAddedRewrite(output: { title: string; summary: string; content: string }): { ok: boolean; reasons: string[] } {
	const reasons: string[] = [];
	const titleNorm = normalizeForSimilarity(output.title);
	const summaryNorm = normalizeForSimilarity(output.summary);
	const contentHeadNorm = normalizeForSimilarity(output.content.slice(0, 700));

	if (titleNorm && summaryNorm) {
		if (titleNorm === summaryNorm) reasons.push('summary_equals_title');
		if (summaryNorm.startsWith(titleNorm)) reasons.push('summary_starts_with_title');
		const titleSummarySim = jaccardSimilarity(tokenSet(output.title), tokenSet(output.summary));
		if (titleSummarySim >= 0.86) reasons.push(`title_summary_too_similar:${titleSummarySim.toFixed(2)}`);
	}

	if (titleNorm && contentHeadNorm) {
		if (contentHeadNorm === titleNorm) reasons.push('content_equals_title');
		if (contentHeadNorm.startsWith(titleNorm)) reasons.push('content_starts_with_title');
	}

	if (summaryNorm && contentHeadNorm) {
		if (contentHeadNorm === summaryNorm) reasons.push('content_equals_summary');
		if (contentHeadNorm.startsWith(summaryNorm)) reasons.push('content_starts_with_summary');
	}
	const formatting = assessNewsArticleFormatting(output.content);
	if (!formatting.hasEnoughParagraphs || formatting.hasOversizedParagraph || formatting.hasSourceBoilerplate) {
		reasons.push(...formatting.reasons);
	}

	return { ok: reasons.length === 0, reasons };
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

	const basePrompt = buildValueAddedPrompt(title, summary, content, language);

	const attempts: Array<{ temperature: number; max_tokens: number; extra: string }> = [
		{ temperature: 0.7, max_tokens: 5000, extra: '' },
		{
			temperature: 0.85,
			max_tokens: 6000,
			extra:
				language === 'es'
					? '\n\nSEGUNDO INTENTO: cambia el titular con una frase totalmente distinta. El resumen NO puede empezar repitiendo el titular ni contener el nombre del medio/fuente al final. RECUERDA: el contenido debe tener MÍNIMO 1500 palabras.'
					: '\n\nSECOND ATTEMPT: change the headline with totally different phrasing. The summary MUST NOT start by repeating the headline or append the outlet/source name. REMEMBER: content must have MINIMUM 1500 words.',
		},
	];

	try {
		for (const attempt of attempts) {
			const response = await openai.chat.completions.create({
				model: MODEL,
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: `${basePrompt}${attempt.extra}` },
				],
				temperature: attempt.temperature,
				max_tokens: attempt.max_tokens,
				response_format: { type: 'json_object' }, // Force JSON output
			});
		
			const rawContent = response.choices[0]?.message?.content?.trim() || '';
		
			if (!rawContent) {
				console.warn('[LLM] Empty response from API');
				continue;
			}
		
		// Try to extract JSON from response
		let jsonStr = rawContent;
		
		// Remove markdown code fences if present
		if (jsonStr.startsWith('```')) {
			jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
		}
		
		// Try to parse JSON
		try {
			const parsed = parseJSON(sanitizeAndFixJSON(jsonStr), 'upgrade-news rewrite response');
			const result = ArticleRewriteSchema.parse(parsed);
			// Ensure value_score is set
			if (result.value_score === undefined) {
				result.value_score = 0.7;
			}

			const diff = isMeaningfullyDifferent(title, result.title, summary, result.summary);
			if (!diff.ok) {
				console.warn(`[LLM] Reject (too similar): ${diff.reasons.join(', ')}`);
				continue;
			}
					const quality = validateValueAddedRewrite(result);
					if (!quality.ok) {
						console.warn(`[LLM] Reject (degenerate output): ${quality.reasons.join(', ')}`);
						continue;
					}

			return result;
		} catch (parseError) {
			console.warn('[LLM] Initial parse failed:', parseError instanceof Error ? parseError.message : parseError);
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
					const parsed = parseJSON(sanitizeAndFixJSON(extracted), 'upgrade-news extracted rewrite response');
					const result = ArticleRewriteSchema.parse(parsed);
					if (result.value_score === undefined) {
						result.value_score = 0.7;
					}
					const diff = isMeaningfullyDifferent(title, result.title, summary, result.summary);
					if (!diff.ok) {
						console.warn(`[LLM] Reject (too similar): ${diff.reasons.join(', ')}`);
									continue;
					}
								const quality = validateValueAddedRewrite(result);
								if (!quality.ok) {
									console.warn(`[LLM] Reject (degenerate output): ${quality.reasons.join(', ')}`);
									continue;
								}
					return result;
				} catch {
					// Last resort: manually extract fields
					const titleMatch = rawContent.match(/"title"\s*:\s*"([^"]+)"/);
					const summaryMatch = rawContent.match(/"summary"\s*:\s*"([^"]+)"/);
					const contentMatch = rawContent.match(/"content"\s*:\s*"([\s\S]*?)"\s*[,}]/);
					const scoreMatch = rawContent.match(/"value_score"\s*:\s*([\d.]+)/);
					
					if (titleMatch && summaryMatch && contentMatch) {
						const reconstructed = {
							title: titleMatch[1],
							summary: summaryMatch[1],
							content: contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
							value_score: scoreMatch ? parseFloat(scoreMatch[1]) : 0.7,
						};
						const diff = isMeaningfullyDifferent(title, reconstructed.title, summary, reconstructed.summary);
						if (!diff.ok) {
							console.warn(`[LLM] Reject reconstructed (too similar): ${diff.reasons.join(', ')}`);
							return null;
						}
									const quality = validateValueAddedRewrite(reconstructed);
									if (!quality.ok) {
										console.warn(`[LLM] Reject reconstructed (degenerate output): ${quality.reasons.join(', ')}`);
										return null;
									}
						return reconstructed;
					}
				}
			}
		}
		
			console.warn('[LLM] Could not parse response. Raw (first 500 chars):', rawContent.slice(0, 500));
			continue;
		}
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
		.select('id, title_en, title_es, summary_en, summary_es, content_en, content_es, source_url, created_at, rewrite_model, rewrite_version');

	// Only fetch articles that need upgrading (not already processed with GPT-4o-mini v2+)
	if (needsUpgrade) {
		query = query.or(
			`rewrite_model.is.null,rewrite_model.neq.${REWRITE_MODEL},rewrite_version.is.null,rewrite_version.lt.${REWRITE_VERSION}`
		);
	}
	
	// Order by rewrite_version first (nulls first = prioritize unprocessed), then by date
	query = query
		.order('created_at', { ascending: false })
		.order('rewrite_version', { ascending: true, nullsFirst: true });

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
			updates.summary_en = sanitizeScrapedContent(analysisEn.summary);
			updates.content_en = normalizeNewsArticleMarkdown(analysisEn.content);
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
			updates.summary_es = sanitizeScrapedContent(analysisEs.summary);
			updates.content_es = normalizeNewsArticleMarkdown(analysisEs.content);
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
