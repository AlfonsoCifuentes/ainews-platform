#!/usr/bin/env tsx
/**
 * Upgrade existing news articles to AI Analyst mode
 * 
 * This script re-processes all news articles in the database to generate
 * original insights instead of just summaries. It uses the same AI Analyst
 * prompt from curate-news.ts.
 * 
 * Usage:
 *   npx tsx scripts/upgrade-news-content.ts --dry-run   # Preview changes
 *   npx tsx scripts/upgrade-news-content.ts --execute   # Apply changes
 *   npx tsx scripts/upgrade-news-content.ts --execute --limit 10  # Process 10 articles
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
}

const ArticleRewriteSchema = z.object({
	title: z.string().describe('Professional, engaging title'),
	summary: z.string().describe('2-sentence executive summary'),
	content: z.string().describe('Structured article with analysis (400+ words)'),
});

type ArticleRewrite = z.infer<typeof ArticleRewriteSchema>;

// =============================================================================
// AI Analyst Prompt (same as curate-news.ts)
// =============================================================================

async function generateAIAnalysis(
	title: string,
	summary: string,
	content: string,
	language: 'en' | 'es',
): Promise<ArticleRewrite | null> {
	const workingContent = content.slice(0, 4000); // Truncate for token limits

	const systemPrompt = buildVerticalVoiceSystemPrompt({
		locale: language,
		vertical: 'news',
	});

	const prompt = `${systemPrompt}

You are an expert AI Analyst. Your task is to read the provided news content and generate a comprehensive, high-value analysis report in ${language === 'en' ? 'English' : 'Spanish'}.

DO NOT just summarize. You must ADD VALUE by explaining the technical context, implications, and future outlook.

Input Data:
- Title: ${title}
- Summary: ${summary}
- Content: ${workingContent}

Instructions:
1. **Title**: Create a professional, engaging title.
2. **Summary**: A 2-sentence executive summary.
3. **Content**: Write a structured article (Markdown) of at least 400 words containing:
   - **The News**: What happened? (Clear, concise, rewritten)
   - **Technical Deep Dive**: Explain the underlying technology or concepts. Use your expert knowledge to fill in gaps if the source is brief.
   - **Why It Matters**: Analyze the impact on the AI industry, developers, or society.
   - **Future Implications**: What does this mean for the next 6-12 months?

IMPORTANT: Return ONLY valid JSON with keys: "title", "summary", "content". Escape all newlines in strings as \\n.`;

	try {
		const response = await openai.chat.completions.create({
			model: MODEL,
			messages: [
				{ role: 'system', content: 'You are an expert AI analyst. Always respond with valid JSON only.' },
				{ role: 'user', content: prompt },
			],
			temperature: 0.7,
			max_tokens: 2000,
		});
		
		const rawContent = response.choices[0]?.message?.content?.trim() || '';
		console.log(`[OpenAI] ✓ Using ${MODEL}`);
		
		// Try to extract JSON from response
		let jsonStr = rawContent;
		
		// Remove markdown code fences if present
		if (jsonStr.startsWith('```')) {
			jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
		}
		
		// Try to parse JSON, handling newlines in content
		try {
			const parsed = JSON.parse(jsonStr);
			return ArticleRewriteSchema.parse(parsed);
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
					return ArticleRewriteSchema.parse(parsed);
				} catch {
					// Last resort: manually extract fields
					const titleMatch = rawContent.match(/"title"\s*:\s*"([^"]+)"/);
					const summaryMatch = rawContent.match(/"summary"\s*:\s*"([^"]+)"/);
					const contentMatch = rawContent.match(/"content"\s*:\s*"([\s\S]*?)"\s*[,}]/);
					
					if (titleMatch && summaryMatch && contentMatch) {
						return {
							title: titleMatch[1],
							summary: summaryMatch[1],
							content: contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
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

async function fetchArticlesToUpgrade(supabase: ReturnType<typeof getSupabaseServerClient>, limit?: number): Promise<NewsArticle[]> {
	let query = supabase
		.from('news_articles')
		.select('id, title_en, title_es, summary_en, summary_es, content_en, content_es, source_url, created_at')
		.order('created_at', { ascending: false });

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
	},
): Promise<boolean> {
	const { error } = await supabase
		.from('news_articles')
		.update(updates)
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

	const updates: Record<string, string> = {};

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

	if (dryRun) {
		console.log(`  📝 [DRY-RUN] Would update article ${article.id.slice(0, 8)}...`);
		console.log(`     Title EN: "${updates.title_en?.slice(0, 60)}..."`);
		console.log(`     Content EN: ${updates.content_en?.length || 0} chars`);
		return { success: true, skipped: false };
	}

	const success = await updateArticle(supabase, article.id, updates);
	if (success) {
		console.log(`  ✅ Updated article ${article.id.slice(0, 8)}...`);
	}

	return { success, skipped: false };
}

async function main() {
	const args = process.argv.slice(2);
	const dryRun = !args.includes('--execute');
	const limitArg = args.find((a) => a.startsWith('--limit'));
	const limit = limitArg ? parseInt(limitArg.split('=')[1] || args[args.indexOf('--limit') + 1] || '0', 10) : undefined;

	console.log('╔════════════════════════════════════════════════════════════╗');
	console.log('║       NEWS CONTENT UPGRADE TO AI ANALYST MODE              ║');
	console.log('╠════════════════════════════════════════════════════════════╣');
	console.log(`║  Mode: ${dryRun ? '🔍 DRY-RUN (preview only)' : '🚀 EXECUTE (applying changes)'}           ║`);
	if (limit) {
		console.log(`║  Limit: ${limit} articles                                      ║`);
	}
	console.log('╚════════════════════════════════════════════════════════════╝');
	console.log('');

	if (dryRun) {
		console.log('⚠️  DRY-RUN mode: No changes will be saved.');
		console.log('   Use --execute to apply changes.\n');
	}

	// Initialize clients
	const supabase = getSupabaseServerClient();

	// Fetch articles
	console.log('📥 Fetching articles from database...');
	const articles = await fetchArticlesToUpgrade(supabase, limit);
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
