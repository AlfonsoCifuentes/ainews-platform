#!/usr/bin/env tsx

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) {
	loadEnv({ path: envLocal });
} else {
	loadEnv();
}

import Parser from 'rss-parser';
import { load } from 'cheerio';
import pLimit from 'p-limit';
import { z } from 'zod';

import { createLLMClientWithFallback, type LLMClient } from '../lib/ai/llm-client';
import { batchTranslate, detectLanguage, translateArticle } from '../lib/ai/translator';
import { generateEmbedding } from '../lib/ai/embeddings';
import { AI_NEWS_SOURCES, type NewsSource } from '../lib/ai/news-sources';
import { getSupabaseServerClient } from '../lib/db/supabase';
import { getBestArticleImage } from '../lib/services/image-scraper';
import { scrapeArticleImageAdvanced } from '../lib/services/advanced-image-scraper';
import {
	initializeImageHashCache,
	registerImageHash,
	validateImageEnhanced,
} from '../lib/services/image-validator';
import { enhancedImageDescription } from '../lib/services/enhanced-image-description';
import { visualSimilarity } from '../lib/services/visual-similarity';

const parser = new Parser({
	customFields: {
		item: ['media:content', 'media:thumbnail', 'enclosure'],
	},
});

const ArticleClassificationSchema = z.object({
	relevant: z.boolean().describe('Is this article about AI/ML/tech?'),
	quality_score: z.number().min(0).max(1).describe('Quality rating 0-1'),
	category: z.enum([
		'machinelearning',
		'nlp',
		'computervision',
		'robotics',
		'ethics',
		'business',
		'research',
		'tools',
		'news',
		'other',
	]),
	summary: z.string().describe('Brief summary of the article'),
	image_alt_text: z.string().optional().describe('Alt text suggestion for the article image'),
});

type ArticleClassification = z.infer<typeof ArticleClassificationSchema>;

type ArticleTranslation = {
	title: string;
	summary: string;
	content: string;
	image_alt_text?: string;
};

interface RawArticle {
	title: string;
	link: string;
	pubDate: string;
	contentSnippet?: string;
	content?: string;
	enclosure?: { url?: string } | null;
	source: NewsSource;
}

interface ResolvedImageData {
	url: string;
	validation: Awaited<ReturnType<typeof validateImageEnhanced>>;
	enhancedAltText?: string;
}

type ClassifiedArticleRecord = {
	article: RawArticle;
	classification: ArticleClassification;
	translation?: ArticleTranslation;
	translationLanguage?: 'en' | 'es';
	cachedContent?: {
		contentOriginal: string;
		summaryOriginal: string;
	};
	cachedEmbedding?: number[] | null;
	cachedImage?: ResolvedImageData | null;
	lastError?: string;
	queueId?: string;
	queueAttempts?: number;
};

interface ArticleProcessingResult {
	success: boolean;
	retryable: boolean;
	reason?: string;
}

type ArticleQueuePayload = {
	article: RawArticle;
	classification: ArticleClassification;
	translation?: ArticleTranslation;
	translationLanguage?: 'en' | 'es';
};

type SupabaseClient = ReturnType<typeof getSupabaseServerClient>;

const MAX_ARTICLES_TO_PROCESS = 100;
const MIN_QUALITY_SCORE = 0.6;
const MAX_IMAGE_ATTEMPTS = 3;
const IMAGE_RETRY_DELAY_MS = 4000;
const IMAGE_RETRY_BACKOFF_BASE_MS = 15 * 60 * 1000;
const IMAGE_RETRY_BACKOFF_MAX_MS = 6 * 60 * 60 * 1000;
const IMAGE_RETRY_BATCH_LIMIT = 12;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function calculateNextRetryDelayMs(attempts: number): number {
	const cappedAttempts = Math.min(attempts, 6);
	const delay = IMAGE_RETRY_BACKOFF_BASE_MS * Math.pow(2, cappedAttempts - 1);
	return Math.min(delay, IMAGE_RETRY_BACKOFF_MAX_MS);
}

function cleanContent(html: string | undefined | null): string {
	if (!html) {
		return '';
	}

	const $ = load(html);
	// Remove structural elements
	$('script, style, iframe, nav, header, footer, aside, form').remove();
	// Remove ads and tracking
	$('.ad, .advertisement, .ads, [class*="ad-"], [class*="advert"]').remove();
	// Remove comments sections (various patterns)
	$('.comments, .comment-section, .discussion, #comments, .wp-comments-area, [class*="comment"]').remove();
	// Remove sidebars and related content
	$('.sidebar, .side-bar, .widget-area, [class*="sidebar"], [class*="related-posts"]').remove();
	// Remove Akismet and reCAPTCHA
	$('[class*="akismet"], [class*="recaptcha"], [class*="captcha"]').remove();
	// Remove newsletter signup and forms
	$('[class*="newsletter"], [class*="signup"], [class*="subscribe"], .form-group, form').remove();
	
	const text = $('body').text() || $.text();
	// Remove repeated whitespace
	let cleaned = text.replace(/\s+/g, ' ').trim();
	// Remove common footer patterns in Spanish
	cleaned = cleaned.replace(/DEJA UNA RESPUESTA[\s\S]*?$/i, '');
	cleaned = cleaned.replace(/Cancelar respuesta[\s\S]*?$/i, '');
	cleaned = cleaned.replace(/Este sitio usa Akismet[\s\S]*?$/i, '');
	cleaned = cleaned.replace(/Aprende cómo se procesan[\s\S]*?$/i, '');
	cleaned = cleaned.replace(/\+\s*Noticias[\s\S]*?$/i, '');
	
	return cleaned.trim();
}

function sanitizeSummary(summary: string): string {
	const cleaned = summary
		// Remove Reddit metadata
		.replace(/submitted by \/u\/[\w-]+\s*(\[link\])?(\s*\[comments\])?/gi, '')
		// Remove other common metadata patterns
		.replace(/\[link\]\s*\[comments\]/gi, '')
		.replace(/Read more at.*$/i, '')
		.replace(/Continue reading.*$/i, '')
		// Normalize whitespace
		.replace(/\s+/g, ' ')
		.trim();
	
	return cleaned.slice(0, 400);
}

function inferLanguageFromSource(article: RawArticle): 'en' | 'es' {
	if (article.source.language === 'es') return 'es';
	if (article.source.language === 'en') return 'en';
	return 'en';
}

async function fetchRSSFeeds(): Promise<RawArticle[]> {
	console.log(`[RSS] Fetching from ${AI_NEWS_SOURCES.length} sources...`);
	const limit = pLimit(4);
	const results = await Promise.all(
		AI_NEWS_SOURCES.map((source) =>
			limit(async (): Promise<RawArticle[]> => {
				try {
					const feed = await parser.parseURL(source.url);
					const items = feed.items ?? [];
					const mapped: RawArticle[] = items
						.map((item) => {
							const link = item.link || item.guid || '';
							if (!link) return null;
							return {
								title: item.title || 'Untitled',
								link,
								pubDate: item.isoDate || item.pubDate || new Date().toISOString(),
								contentSnippet: item.contentSnippet || undefined,
								content: typeof item.content === 'string' ? item.content : undefined,
								enclosure: item.enclosure ? { url: item.enclosure.url } : item['media:content'] || null,
								source,
							} satisfies RawArticle;
						})
						.filter(Boolean) as RawArticle[];

					console.log(`[RSS] ✓ ${source.name}: ${mapped.length} articles`);
					return mapped;
				} catch (error) {
					console.error(`[RSS] ✗ ${source.name} failed:`, error);
					return [];
				}
			}),
		),
	);

	const deduped: RawArticle[] = [];
	const seenLinks = new Set<string>();

	for (const article of results.flat()) {
		if (!seenLinks.has(article.link)) {
			seenLinks.add(article.link);
			deduped.push(article);
		}
	}

	deduped.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

	if (deduped.length > MAX_ARTICLES_TO_PROCESS) {
		console.log(`[RSS] Limiting to ${MAX_ARTICLES_TO_PROCESS} most recent articles (from ${deduped.length} total)`);
		return deduped.slice(0, MAX_ARTICLES_TO_PROCESS);
	}

	console.log(`[RSS] Total unique articles fetched: ${deduped.length}`);
	return deduped;
}

async function scrapeArticlePage(url: string): Promise<{ image: string | null; content: string | null }> {
	try {
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
			},
			signal: AbortSignal.timeout(10000),
		});

		if (!response.ok) {
			console.warn(`[Scraper] HTTP ${response.status} for ${url}`);
			return { image: null, content: null };
		}

		const html = await response.text();
		const $ = load(html);

		$('script, style, nav, header, footer, aside, .ad, .advertisement, iframe').remove();

		const imageSelectors = [
			'meta[property="og:image"]',
			'meta[name="twitter:image"]',
			'meta[property="twitter:image"]',
			'article img[src]',
			'main img[src]',
			'.post-thumbnail img',
			'.featured-image img',
			'.hero img[src]',
		];

		let image: string | null = null;
		for (const selector of imageSelectors) {
			const attr = selector.startsWith('meta') ? 'content' : 'src';
			const candidate = $(selector).first().attr(attr);
			if (!candidate) continue;
			if (candidate.startsWith('data:')) continue;

			if (candidate.startsWith('//')) {
				image = `https:${candidate}`;
			} else if (candidate.startsWith('/')) {
				const origin = new URL(url);
				image = `${origin.protocol}//${origin.host}${candidate}`;
			} else if (candidate.startsWith('http')) {
				image = candidate;
			}

			if (image) break;
		}

		const contentCandidates = [
			'article',
			'main',
			'.article-content',
			'.post-content',
			'.entry-content',
			'#content',
		];

		let contentHtml: string | null | undefined;
		for (const selector of contentCandidates) {
			const node = $(selector);
			if (node.length && node.text().trim().length > 200) {
				contentHtml = node.html() ?? node.text();
				break;
			}
		}

		contentHtml = contentHtml ?? $('body').html() ?? null;

		return {
			image: image || null,
			content: contentHtml ? cleanContent(contentHtml) : null,
		};
	} catch (error) {
		console.error(`[Scraper] Failed for ${url}:`, error instanceof Error ? error.message : error);
		return { image: null, content: null };
	}
}

async function ensureArticleContent(entry: ClassifiedArticleRecord): Promise<{
	contentOriginal: string;
	summaryOriginal: string;
}> {
	if (entry.cachedContent) {
		return entry.cachedContent;
	}

	console.log(`[Scraper] Fetching article content for ${entry.article.title.slice(0, 80)}...`);
	const scraped = await scrapeArticlePage(entry.article.link);

	const fallbackContent = cleanContent(entry.article.content) || entry.article.contentSnippet || '';
	const contentOriginal = scraped.content && scraped.content.length > 200 ? scraped.content : fallbackContent;
	const summaryOriginal = sanitizeSummary(
		entry.article.contentSnippet || scraped.content?.slice(0, 300) || contentOriginal.slice(0, 300),
	);

	entry.cachedContent = { contentOriginal, summaryOriginal };
	return entry.cachedContent;
}

async function generateEnhancedAltText(imageUrl: string): Promise<string | undefined> {
	if (!enhancedImageDescription.isAvailable()) {
		return undefined;
	}

	try {
		const description = await enhancedImageDescription.generateDescription(imageUrl);
		return description.accessibilityAlt;
	} catch (error) {
		console.warn('[EnhancedAlt] Failed to generate:', error instanceof Error ? error.message : error);
		return undefined;
	}
}

async function resolveOriginalImage(entry: ClassifiedArticleRecord, totalAttempt: number): Promise<ResolvedImageData | null> {
	const skipCache = totalAttempt > 1;

	const rssItem = {
		enclosure: entry.article.enclosure || undefined,
		content: entry.article.content,
		contentSnippet: entry.article.contentSnippet,
	};

	try {
		const fastUrl = await getBestArticleImage(entry.article.link, rssItem, {
			skipRegister: true,
			skipCache,
		});

		if (fastUrl) {
			const validation = await validateImageEnhanced(fastUrl, {
				skipRegister: true,
				skipCache,
			});

			if (validation.isValid) {
				const enhancedAltText = await generateEnhancedAltText(fastUrl);
				return { url: fastUrl, validation, enhancedAltText };
			}

			console.log(`[ImageValidator] Fast path rejected: ${validation.reason ?? 'unknown reason'}`);
		}
	} catch (error) {
		console.warn('[ImageValidator] Fast extraction failed:', error instanceof Error ? error.message : error);
	}

	try {
		const advancedResult = await scrapeArticleImageAdvanced(entry.article.link);
		if (advancedResult?.url && advancedResult.confidence > 0.4) {
			const validation = await validateImageEnhanced(advancedResult.url, {
				skipRegister: true,
				skipCache,
			});

			if (validation.isValid) {
				const enhancedAltText = await generateEnhancedAltText(advancedResult.url);
				return { url: advancedResult.url, validation, enhancedAltText };
			}

			console.log(`[ImageValidator] Advanced path rejected: ${validation.reason ?? 'unknown reason'}`);
		}
	} catch (error) {
		console.warn('[ImageValidator] Advanced scraper failed:', error instanceof Error ? error.message : error);
	}

	return null;
}

async function classifyArticle(article: RawArticle, llmClient: LLMClient, systemPrompt: string): Promise<ArticleClassification | null> {
	const snippet = cleanContent(article.content) || article.contentSnippet || '';
	const prompt = `Title: ${article.title}\nContent: ${snippet.slice(0, 500)}...\n\nIs this article relevant to AI/ML/tech? Return JSON only.`;

	try {
		const result = await llmClient.classify(prompt, ArticleClassificationSchema, systemPrompt);
		console.log(
			`[LLM] ✓ ${article.title.slice(0, 60)}... (score: ${result.quality_score.toFixed(2)}, category: ${result.category})`,
		);
		return result;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(`[LLM] ✗ Classification failed for ${article.title.slice(0, 60)}: ${message}`);
		return null;
	}
}

async function filterAndClassifyArticles(articles: RawArticle[], llmClient: LLMClient): Promise<ClassifiedArticleRecord[]> {
	if (articles.length === 0) {
		return [];
	}

	console.log(`[LLM] Filtering ${articles.length} articles...`);
	const limit = pLimit(5);
	const systemPrompt = `You are a strict JSON-only API. CRITICAL RULES:
1. Return ONLY valid JSON, no markdown code blocks, no explanations
2. Use double quotes for ALL strings
3. For optional fields, use empty string "" instead of null or undefined
4. Escape special characters in strings (use \\" for quotes, \\n for newlines)
5. Numbers must be plain numbers without quotes

Required JSON structure:
{
	"relevant": true,
	"quality_score": 0.85,
	"category": "news",
	"summary": "Brief description here",
	"image_alt_text": "Description for image or empty string"
}

Valid categories: "machinelearning", "nlp", "computervision", "robotics", "ethics", "business", "research", "tools", "news", "other"`;

	const tasks = articles.map((article) =>
		limit(async () => {
			const classification = await classifyArticle(article, llmClient, systemPrompt);
			if (!classification) return null;
			if (!classification.relevant || classification.quality_score < MIN_QUALITY_SCORE) return null;
			return { article, classification } satisfies ClassifiedArticleRecord;
		}),
	);

	const classified = (await Promise.all(tasks)).filter(Boolean) as ClassifiedArticleRecord[];
	console.log(`[LLM] Relevant articles: ${classified.length}`);
	return classified;
}

async function filterExistingArticles(
	entries: ClassifiedArticleRecord[],
	db: SupabaseClient,
): Promise<ClassifiedArticleRecord[]> {
	if (entries.length === 0) {
		return entries;
	}

	const links = entries.map((entry) => entry.article.link);
	const { data, error } = await db
		.from('news_articles')
		.select('source_url')
		.in('source_url', links);

	if (error) {
		console.warn('[DB] Failed to fetch existing articles, proceeding without dedupe:', error);
		return entries;
	}

	const existing = new Set((data ?? []).map((row) => row.source_url));
	const filtered = entries.filter((entry) => !existing.has(entry.article.link));
	console.log(`[DB] Skipping ${entries.length - filtered.length} already-stored article(s)`);
	return filtered;
}

async function enqueueImageRetry(entry: ClassifiedArticleRecord, reason: string | undefined, db: SupabaseClient): Promise<boolean> {
	if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
		console.warn('[ImageRetry] Service role key missing, cannot enqueue retries');
		return false;
	}

	const payload: ArticleQueuePayload = {
		article: entry.article,
		classification: entry.classification,
		translation: entry.translation,
		translationLanguage: entry.translationLanguage,
	};

	try {
		const { data: existing, error: fetchError } = await db
			.from('news_image_retry_queue')
			.select('id, attempts')
			.eq('source_url', entry.article.link)
			.maybeSingle();

		if (fetchError) throw fetchError;

		const attempts = (existing?.attempts ?? 0) + 1;
		const nowIso = new Date().toISOString();
		const nextAttemptAt = new Date(Date.now() + calculateNextRetryDelayMs(attempts)).toISOString();

		const row = {
			source_url: entry.article.link,
			article_title: entry.article.title,
			feed_name: entry.article.source.name,
			article_payload: payload,
			attempts,
			next_attempt_at: nextAttemptAt,
			last_error: reason ?? null,
			last_attempt_at: nowIso,
			updated_at: nowIso,
		};

		if (existing?.id) {
			const { error: updateError } = await db
				.from('news_image_retry_queue')
				.update(row)
				.eq('id', existing.id);
			if (updateError) throw updateError;
		} else {
			const { error: insertError } = await db.from('news_image_retry_queue').insert(row);
			if (insertError) throw insertError;
		}

		console.warn(`[ImageRetry] Queued article for image retry: ${entry.article.title.slice(0, 80)}...`);
		return true;
	} catch (error) {
		console.error('[ImageRetry] Failed to enqueue retry:', error instanceof Error ? error.message : error);
		return false;
	}
}

async function deleteQueueEntries(db: SupabaseClient, ids: string[]): Promise<void> {
	if (ids.length === 0) return;
	const { error } = await db.from('news_image_retry_queue').delete().in('id', ids);
	if (error) {
		console.error('[ImageRetry] Failed to delete processed queue entries:', error);
	}
}

async function updateQueueEntryFailure(
	db: SupabaseClient,
	id: string,
	attempts: number,
	reason: string | undefined,
): Promise<void> {
	const now = new Date().toISOString();
	const nextAttemptAt = new Date(Date.now() + calculateNextRetryDelayMs(attempts + 1)).toISOString();
	const { error } = await db
		.from('news_image_retry_queue')
		.update({
			attempts: attempts + 1,
			last_error: reason ?? null,
			last_attempt_at: now,
			next_attempt_at: nextAttemptAt,
			updated_at: now,
		})
		.eq('id', id);

	if (error) {
		console.error('[ImageRetry] Failed to update queue entry:', error);
	}
}

async function determineBilingualContent(
	entry: ClassifiedArticleRecord,
	imageData: ResolvedImageData,
): Promise<{
	originalLanguage: 'en' | 'es';
	contentOriginal: string;
	summaryOriginal: string;
	titleOriginal: string;
	translation?: ArticleTranslation;
	altTextEn: string;
	altTextEs: string;
}> {
	const { contentOriginal, summaryOriginal } = await ensureArticleContent(entry);

	let originalLanguage = inferLanguageFromSource(entry.article);
	if (contentOriginal.length > 100) {
		try {
			originalLanguage = await detectLanguage(contentOriginal);
		} catch (error) {
			console.warn('[Translator] Language detection failed, using source hint:', error);
		}
	}

	const translationTarget: 'en' | 'es' = originalLanguage === 'en' ? 'es' : 'en';
	let translation = entry.translation;
	if (!translation || entry.translationLanguage !== translationTarget) {
		try {
			translation = await translateArticle(
				entry.article.title,
				summaryOriginal,
				contentOriginal,
				originalLanguage,
				translationTarget,
			);
			entry.translation = translation;
			entry.translationLanguage = translationTarget;
		} catch (error) {
			console.warn('[Translator] Translation failed:', error instanceof Error ? error.message : error);
			translation = undefined;
		}
	}

	const fallbackAlt = entry.classification.image_alt_text || imageData.enhancedAltText || `AI news image for: ${entry.article.title}`;
	let altTextEn = fallbackAlt;
	let altTextEs = fallbackAlt;

	if (originalLanguage === 'en') {
		altTextEn = fallbackAlt;
		const [altEs] = await batchTranslate([fallbackAlt], 'en', 'es');
		altTextEs = altEs || fallbackAlt;
	} else {
		altTextEs = fallbackAlt;
		const [altEn] = await batchTranslate([fallbackAlt], 'es', 'en');
		altTextEn = altEn || fallbackAlt;
	}

	return {
		originalLanguage,
		contentOriginal,
		summaryOriginal,
		titleOriginal: entry.article.title,
		translation,
		altTextEn,
		altTextEs,
	};
}

async function persistArticle(
	entry: ClassifiedArticleRecord,
	imageData: ResolvedImageData,
	bilingual: {
		originalLanguage: 'en' | 'es';
		contentOriginal: string;
		summaryOriginal: string;
		titleOriginal: string;
		translation?: ArticleTranslation;
		altTextEn: string;
		altTextEs: string;
	},
	db: SupabaseClient,
): Promise<ArticleProcessingResult> {
	try {
		const { originalLanguage, contentOriginal, summaryOriginal, translation, altTextEn, altTextEs } = bilingual;
		const titleEn = originalLanguage === 'en' ? entry.article.title : translation?.title || entry.article.title;
		const titleEs = originalLanguage === 'es' ? entry.article.title : translation?.title || entry.article.title;
		const summaryEn = originalLanguage === 'en' ? summaryOriginal : translation?.summary || summaryOriginal;
		const summaryEs = originalLanguage === 'es' ? summaryOriginal : translation?.summary || summaryOriginal;
		const contentEn = originalLanguage === 'en' ? contentOriginal : translation?.content || contentOriginal;
		const contentEs = originalLanguage === 'es' ? contentOriginal : translation?.content || contentOriginal;

		const baseTags = new Set<string>([
			entry.classification.category,
			entry.article.source.category,
		]);

		const insertPayload = {
			title_en: titleEn,
			title_es: titleEs,
			summary_en: summaryEn,
			summary_es: summaryEs,
			content_en: contentEn,
			content_es: contentEs,
			image_alt_text_en: altTextEn,
			image_alt_text_es: altTextEs,
			category: entry.classification.category,
			tags: Array.from(baseTags),
			source_url: entry.article.link,
			image_url: imageData.url,
			published_at: new Date(entry.article.pubDate).toISOString(),
			ai_generated: false,
			quality_score: entry.classification.quality_score,
			reading_time_minutes: Math.max(1, Math.ceil(contentEn.split(' ').length / 200)),
			image_width: imageData.validation.width ?? null,
			image_height: imageData.validation.height ?? null,
			image_mime: imageData.validation.mime ?? null,
			image_bytes: imageData.validation.bytes ?? null,
			image_hash: imageData.validation.visualSimilarity?.hash ?? imageData.validation.hash ?? null,
		};

		const { data: insertedArticle, error: insertError } = await db
			.from('news_articles')
			.insert(insertPayload)
			.select('id')
			.single();

		if (insertError) {
			throw insertError;
		}

		const articleId = insertedArticle?.id as string | undefined;

		const embeddingBase = `${titleEn} ${summaryEn} ${contentEn.slice(0, 1000)}`;
		let embedding = entry.cachedEmbedding;
		if (embedding === undefined) {
			embedding = await generateEmbedding(embeddingBase);
			entry.cachedEmbedding = embedding ?? null;
		}

		if (Array.isArray(embedding) && articleId) {
			const { error: embeddingError } = await db.from('content_embeddings').insert({
				content_id: articleId,
				content_type: 'article',
				embedding,
			});
			if (embeddingError) {
				console.warn('[Embeddings] Insert failed:', embeddingError);
			}
		}

		registerImageHash(imageData.url);

		const perceptualHash = imageData.validation.visualSimilarity?.hash && imageData.validation.visualSimilarity.hash !== 'error'
			? imageData.validation.visualSimilarity.hash
			: imageData.validation.hash;

		if (perceptualHash) {
			try {
				await visualSimilarity.storeHash(imageData.url, perceptualHash, articleId);
			} catch (error) {
				console.warn('[VisualSimilarity] Failed to store hash:', error instanceof Error ? error.message : error);
			}
		}

		console.log(`[DB] ✓ Stored article: ${entry.article.title.slice(0, 80)}...`);
		return { success: true, retryable: false };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error('[DB] ✗ Failed to store article:', message);
		entry.lastError = message;
		return { success: false, retryable: true, reason: message };
	}
}

async function processArticle(entry: ClassifiedArticleRecord, db: SupabaseClient): Promise<ArticleProcessingResult> {
	let imageData: ResolvedImageData | null = entry.cachedImage ?? null;
	let attempt = 0;

	while (attempt < MAX_IMAGE_ATTEMPTS && !imageData) {
		attempt += 1;
		const totalAttempt = attempt + (entry.queueAttempts ?? 0);
		imageData = await resolveOriginalImage(entry, totalAttempt);

		if (!imageData && attempt < MAX_IMAGE_ATTEMPTS) {
			console.log(`[ImageValidator] Retry ${attempt}/${MAX_IMAGE_ATTEMPTS} failed for ${entry.article.title.slice(0, 60)}..., waiting...`);
			await sleep(IMAGE_RETRY_DELAY_MS * attempt);
		}
	}

	if (!imageData) {
		const reason = 'Unable to locate a valid original image';
		console.warn(`[ImageValidator] ${reason} for ${entry.article.title.slice(0, 80)}...`);
		entry.lastError = reason;
		return { success: false, retryable: true, reason };
	}

	entry.cachedImage = imageData;

	const bilingual = await determineBilingualContent(entry, imageData);
	return persistArticle(entry, imageData, bilingual, db);
}

async function processImageRetryQueue(db: SupabaseClient): Promise<void> {
	if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
		return;
	}

	const nowIso = new Date().toISOString();
	const { data, error } = await db
		.from('news_image_retry_queue')
		.select('id, source_url, article_payload, attempts')
		.lte('next_attempt_at', nowIso)
		.order('next_attempt_at', { ascending: true })
		.limit(IMAGE_RETRY_BATCH_LIMIT);

	if (error) {
		console.error('[ImageRetry] Failed to fetch queue:', error);
		return;
	}

	if (!data || data.length === 0) {
		console.log('[ImageRetry] Queue empty');
		return;
	}

	console.log(`[ImageRetry] Processing ${data.length} queued article(s)...`);
	const successIds: string[] = [];

	for (const item of data) {
		const payload = item.article_payload as ArticleQueuePayload | null;
		if (!payload?.article || !payload.classification) {
			console.warn(`[ImageRetry] Invalid payload for ${item.source_url}, removing from queue`);
			successIds.push(item.id);
			continue;
		}

		const entry: ClassifiedArticleRecord = {
			article: payload.article,
			classification: payload.classification,
			translation: payload.translation,
			translationLanguage: payload.translationLanguage,
			queueId: item.id,
			queueAttempts: item.attempts ?? 0,
		};

		const result = await processArticle(entry, db);

		if (result.success) {
			successIds.push(item.id);
		} else if (result.retryable) {
			await updateQueueEntryFailure(db, item.id, item.attempts ?? 0, result.reason);
		} else {
			successIds.push(item.id);
		}
	}

	await deleteQueueEntries(db, successIds);
}

async function main(): Promise<void> {
	console.log('[News Curator] Starting curation workflow...');
	const db = getSupabaseServerClient();
	await initializeImageHashCache();
	await processImageRetryQueue(db);

	let llm: LLMClient;
	try {
		llm = await createLLMClientWithFallback();
	} catch (error) {
		console.error('[LLM] Failed to initialize:', error);
		return;
	}

	const articles = await fetchRSSFeeds();
	if (articles.length === 0) {
		console.log('[News Curator] No articles fetched, exiting.');
		return;
	}

	const classified = await filterAndClassifyArticles(articles, llm);
	if (classified.length === 0) {
		console.log('[News Curator] No relevant articles after classification.');
		return;
	}

	const freshEntries = await filterExistingArticles(classified, db);
	if (freshEntries.length === 0) {
		console.log('[News Curator] All relevant articles already stored.');
		return;
	}

	let stored = 0;
	let queued = 0;
	let skipped = 0;

	for (const entry of freshEntries) {
		const result = await processArticle(entry, db);
		if (result.success) {
			stored += 1;
			if (entry.queueId) {
				await deleteQueueEntries(db, [entry.queueId]);
			}
		} else if (result.retryable) {
			const queuedOk = await enqueueImageRetry(entry, result.reason, db);
			if (queuedOk) queued += 1;
			else skipped += 1;
		} else {
			skipped += 1;
		}
	}

	await processImageRetryQueue(db);

	console.log(
		`[News Curator] Completed. Stored: ${stored}, queued for retry: ${queued}, skipped: ${skipped}`,
	);
}

main()
	.then(() => {
		console.log('[News Curator] Workflow finished.');
		process.exit(0);
	})
	.catch((error) => {
		console.error('[News Curator] Fatal error:', error);
		process.exit(1);
	});
