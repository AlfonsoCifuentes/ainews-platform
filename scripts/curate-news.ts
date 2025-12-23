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

import { createLLMClientForTask, type LLMClient } from '../lib/ai/llm-client';
import { buildVerticalVoiceSystemPrompt } from '../lib/ai/prompt-voice';
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
		item: [
			'media:content',
			'media:thumbnail',
			'enclosure',
			'content:encoded',
			'itunes:image',
			'itunes:summary',
		],
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
	contentEncoded?: string;
	itunesSummary?: string;
	itunesImageUrl?: string;
	mediaContentUrl?: string;
	mediaThumbnailUrl?: string;
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
const USE_FALLBACK_IMAGES = true; // Enable Unsplash fallback when image scraping fails
const IMAGE_RETRY_DELAY_MS = 4000;
const IMAGE_RETRY_BACKOFF_BASE_MS = 15 * 60 * 1000;
const IMAGE_RETRY_BACKOFF_MAX_MS = 6 * 60 * 60 * 1000;
const IMAGE_RETRY_BATCH_LIMIT = 12;
const REWRITE_MAX_CHARS = 5200;
const DEDUPE_LOOKBACK_DAYS = 21;
const DEDUPE_TOKEN_SIMILARITY = 0.78;
const USE_SEMANTIC_DEDUPE = true;
const SEMANTIC_DEDUPE_THRESHOLD = 0.93;

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

function normalizeTitleForDedupe(title: string): string {
	return title
		.toLowerCase()
		.replace(/\b(episode|ep)\.?\s*\d+\b/g, '')
		.replace(/\B#\d+\b/g, '')
		.replace(/\([^)]*\)/g, ' ')
		.replace(/\[[^\]]*\]/g, ' ')
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\b(the|a|an|and|or|of|to|in|for|on|with|from|by|at|as)\b/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function tokenSet(text: string): Set<string> {
	const tokens = text.split(' ').map((t) => t.trim()).filter((t) => t.length >= 3);
	return new Set(tokens);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 || b.size === 0) return 0;
	let intersection = 0;
	for (const t of a) {
		if (b.has(t)) intersection += 1;
	}
	const union = a.size + b.size - intersection;
	return union === 0 ? 0 : intersection / union;
}

function isNearDuplicateTitle(normalizedTitle: string, candidateNormalized: string): boolean {
	if (!normalizedTitle || !candidateNormalized) return false;
	if (normalizedTitle === candidateNormalized) return true;
	if (normalizedTitle.length >= 18 && candidateNormalized.includes(normalizedTitle)) return true;
	if (candidateNormalized.length >= 18 && normalizedTitle.includes(candidateNormalized)) return true;
	const sim = jaccardSimilarity(tokenSet(normalizedTitle), tokenSet(candidateNormalized));
	return sim >= DEDUPE_TOKEN_SIMILARITY;
}

function extractTranscriptUrlFromHtml(html: string, baseUrl: string): string | null {
	try {
		const $ = load(html);
		const anchors = $('a[href]').toArray();
		for (const node of anchors) {
			const el = $(node);
			const href = el.attr('href') ?? '';
			const text = (el.text() ?? '').toLowerCase();
			if (!href) continue;
			if (text.includes('transcript') || href.toLowerCase().includes('transcript')) {
				try {
					return new URL(href, baseUrl).href;
				} catch {
					return href;
				}
			}
		}
	} catch {
		// ignore
	}
	return null;
}

let recentNormalizedTitles: string[] = [];
let recentNormalizedTitleSet = new Set<string>();
const runNormalizedTitleSet = new Set<string>();

const ArticleRewriteSchema = z.object({
	title: z.string().min(8).max(180),
	summary: z.string().min(60).max(520),
	content: z.preprocess(
		(value) => {
			if (Array.isArray(value)) {
				return value.filter((part) => typeof part === 'string').join('\n\n');
			}
			return value;
		},
		z.string().min(200).max(3200),
	),
});

type ArticleRewrite = z.infer<typeof ArticleRewriteSchema>;

function truncateForRewrite(text: string, maxChars: number = REWRITE_MAX_CHARS): string {
	if (text.length <= maxChars) return text;

	const truncated = text.slice(0, maxChars);
	const lastSentence = truncated.lastIndexOf('.');
	if (lastSentence > maxChars * 0.75) {
		return truncated.slice(0, lastSentence + 1).trim();
	}

	return truncated.trim();
}

async function rewriteArticleContent(
	title: string,
	summary: string,
	content: string,
	language: 'en' | 'es',
	llmClient: LLMClient,
): Promise<ArticleRewrite | null> {
	const workingContent = truncateForRewrite(content);

	const systemPrompt = buildVerticalVoiceSystemPrompt({
		locale: language,
		vertical: 'news',
	});

	// AI Analyst mode: professional tech journalist perspective
	const prompt = `You are a senior AI analyst writing for an expert tech audience. Rewrite the article below in ${language === 'en' ? 'English' : 'Spanish'}.

VOICE & TONE:
- Authoritative but accessible - like a respected tech journalist
- Add brief "why it matters" context for industry impact
- Use precise technical terminology where appropriate
- Short, punchy paragraphs (2-4 sentences max)
- No fluff, no hype - just insightful analysis

HARD RULES:
- Do NOT include raw URLs in summary or content
- Remove boilerplate: "Read more", "Continue reading", "Subscribe", cookie/privacy notices
- No first-person unless essential for clarity
- No references to missing images or UI elements

Return ONLY valid JSON with keys: title, summary, content

Original title: ${title}
Original summary: ${summary}
Original content: ${workingContent}`;

	try {
		return await llmClient.classify(prompt, ArticleRewriteSchema, systemPrompt);
	} catch (error) {
		console.warn('[LLM Rewrite] Failed to rewrite article:', error instanceof Error ? error.message : error);
		return null;
	}
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
							const contentEncoded = typeof (item as any)['content:encoded'] === 'string' ? (item as any)['content:encoded'] : undefined;
							const itunesSummary = typeof (item as any)['itunes:summary'] === 'string' ? (item as any)['itunes:summary'] : undefined;
							const itunesImageRaw = (item as any)['itunes:image'];
							const itunesImageUrl =
								(typeof itunesImageRaw?.href === 'string' && itunesImageRaw.href) ||
								(typeof itunesImageRaw?.$?.href === 'string' && itunesImageRaw.$.href) ||
								undefined;
							const mediaContentUrl = typeof (item as any)['media:content']?.$?.url === 'string' ? (item as any)['media:content'].$.url : undefined;
							const mediaThumbnailUrl = typeof (item as any)['media:thumbnail']?.$?.url === 'string' ? (item as any)['media:thumbnail'].$.url : undefined;
							return {
								title: item.title || 'Untitled',
								link,
								pubDate: item.isoDate || item.pubDate || new Date().toISOString(),
								contentSnippet: item.contentSnippet || undefined,
								content: typeof item.content === 'string' ? item.content : undefined,
								contentEncoded,
								itunesSummary,
								itunesImageUrl,
								mediaContentUrl,
								mediaThumbnailUrl,
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

	const rssText =
		cleanContent(entry.article.contentEncoded) ||
		cleanContent(entry.article.content) ||
		entry.article.itunesSummary ||
		entry.article.contentSnippet ||
		'';

	// Podcast episodes often have sufficient show notes in RSS; prefer those over scraping.
	if (entry.article.source.category === 'podcast') {
		let podcastText = rssText;
		const transcriptUrl = extractTranscriptUrlFromHtml(entry.article.contentEncoded || entry.article.content || '', entry.article.link);
		if (transcriptUrl) {
			console.log(`[Podcast] Found transcript link, fetching: ${transcriptUrl}`);
			const transcript = await scrapeArticlePage(transcriptUrl);
			if (transcript.content && transcript.content.length > 500) {
				podcastText = `${podcastText}\n\n${transcript.content}`.trim();
			}
		}

		// If RSS is too thin, fall back to scraping the episode page.
		if (podcastText.length < 300) {
			const scraped = await scrapeArticlePage(entry.article.link);
			if (scraped.content && scraped.content.length > 200) {
				podcastText = scraped.content;
			}
		}

		const summaryOriginal = sanitizeSummary((entry.article.contentSnippet || podcastText.slice(0, 320)).trim());
		entry.cachedContent = { contentOriginal: podcastText, summaryOriginal };
		return entry.cachedContent;
	}

	const scraped = await scrapeArticlePage(entry.article.link);
	const contentOriginal = scraped.content && scraped.content.length > 200 ? scraped.content : rssText;
	const summaryOriginal = sanitizeSummary(entry.article.contentSnippet || scraped.content?.slice(0, 300) || contentOriginal.slice(0, 300));

	entry.cachedContent = { contentOriginal, summaryOriginal };
	return entry.cachedContent;
}

/**
 * Generate a fallback image URL from Unsplash based on article category
 */
function generateFallbackImage(category: string, title: string): ResolvedImageData {
	const categoryMap: Record<string, string> = {
		machinelearning: 'machine-learning,neural-network',
		nlp: 'language,text,communication',
		computervision: 'vision,camera,recognition',
		robotics: 'robot,automation',
		ethics: 'ethics,justice,technology',
		business: 'business,technology,startup',
		research: 'science,laboratory,research',
		tools: 'software,code,programming',
		news: 'technology,digital,innovation',
		other: 'technology,artificial-intelligence',
	};

	const keywords = categoryMap[category] || categoryMap.other;
	const sig = Math.floor(Math.random() * 100000);
	const url = `https://source.unsplash.com/1600x900/?${keywords}&sig=${sig}`;

	console.log(`[Fallback] Using Unsplash image for category "${category}"`);

	return {
		url,
		validation: {
			isValid: true,
			isDuplicate: false,
			mime: 'image/jpeg',
			width: 1600,
			height: 900,
		},
		enhancedAltText: `AI technology illustration related to ${title.slice(0, 50)}`,
	};
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
		content: entry.article.contentEncoded || entry.article.content,
		contentSnippet: entry.article.contentSnippet,
		'media:content': entry.article.mediaContentUrl ? { $: { url: entry.article.mediaContentUrl } } : undefined,
		'media:thumbnail': entry.article.mediaThumbnailUrl ? { $: { url: entry.article.mediaThumbnailUrl } } : undefined,
		'itunes:image': entry.article.itunesImageUrl ? { $: { href: entry.article.itunesImageUrl } } : undefined,
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
	const snippet = cleanContent(article.contentEncoded) || cleanContent(article.content) || article.itunesSummary || article.contentSnippet || '';
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

async function isSemanticDuplicate(db: SupabaseClient, embedding: number[]): Promise<boolean | null> {
	if (!USE_SEMANTIC_DEDUPE) return null;
	try {
		const { data, error } = await db.rpc('match_bilingual_content', {
			query_embedding: embedding,
			match_threshold: 0.9,
			match_count: 1,
		});

		if (error) {
			// Most commonly: function missing or insufficient permissions. Treat as unavailable.
			return null;
		}

		const first = Array.isArray(data) ? (data[0] as { similarity?: number } | undefined) : undefined;
		if (!first?.similarity) return false;
		return first.similarity >= SEMANTIC_DEDUPE_THRESHOLD;
	} catch {
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

	// Process in batches of 50 to avoid "Bad Request" from too many values in IN clause
	const batchSize = 50;
	const existing = new Set<string>();
	
	for (let i = 0; i < entries.length; i += batchSize) {
		const batch = entries.slice(i, i + batchSize);
		const links = batch.map((entry) => entry.article.link);
		
		const { data, error } = await db
			.from('news_articles')
			.select('source_url')
			.in('source_url', links);

		if (error) {
			console.warn('[DB] Failed to fetch existing articles batch, proceeding without dedupe:', error);
			continue;
		}
		
		(data ?? []).forEach((row) => existing.add(row.source_url));
	}

	const filtered = entries.filter((entry) => !existing.has(entry.article.link));
	console.log(`[DB] Skipping ${entries.length - filtered.length} already-stored article(s)`);
	return filtered;
}

async function enqueueImageRetry(entry: ClassifiedArticleRecord, reason: string | undefined, db: SupabaseClient): Promise<boolean> {
	if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
		console.warn('[ImageRetry] Service role key missing, cannot enqueue retries');
		return false;
	}

	if (!(await ensureImageRetryQueueAvailable(db))) {
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

let imageRetryQueueAvailable: boolean | null = null;

function isMissingImageRetryQueueTableError(error: unknown): boolean {
	const e = error as any;
	if (e?.code === 'PGRST205') return true;
	const message = typeof e?.message === 'string' ? e.message : '';
	return message.includes('news_image_retry_queue') && message.includes('schema cache');
}

async function ensureImageRetryQueueAvailable(db: SupabaseClient): Promise<boolean> {
	if (imageRetryQueueAvailable !== null) return imageRetryQueueAvailable;

	try {
		const { error } = await db.from('news_image_retry_queue').select('id').limit(1);
		if (error) {
			if (isMissingImageRetryQueueTableError(error)) {
				console.warn('[ImageRetry] Queue table missing; disabling image retry queue');
				imageRetryQueueAvailable = false;
				return false;
			}
			throw error;
		}
		imageRetryQueueAvailable = true;
		return true;
	} catch (error) {
		if (isMissingImageRetryQueueTableError(error)) {
			console.warn('[ImageRetry] Queue table missing; disabling image retry queue');
			imageRetryQueueAvailable = false;
			return false;
		}
		console.warn('[ImageRetry] Failed to probe queue table; disabling image retry queue:', error);
		imageRetryQueueAvailable = false;
		return false;
	}
}

async function deleteQueueEntries(db: SupabaseClient, ids: string[]): Promise<void> {
	if (ids.length === 0) return;
	if (!(await ensureImageRetryQueueAvailable(db))) return;
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
	if (!(await ensureImageRetryQueueAvailable(db))) return;
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
	llm: LLMClient,
): Promise<{
	originalLanguage: 'en' | 'es';
	contentPrimary: string;
	summaryPrimary: string;
	titlePrimary: string;
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

	let titlePrimary = entry.article.title;
	let summaryPrimary = summaryOriginal;
	let contentPrimary = contentOriginal;

	const rewrite = await rewriteArticleContent(titlePrimary, summaryPrimary, contentPrimary, originalLanguage, llm);
	if (rewrite) {
		titlePrimary = rewrite.title;
		summaryPrimary = rewrite.summary;
		contentPrimary = rewrite.content;
		entry.translation = undefined;
		entry.translationLanguage = undefined;
	}

	const translationTarget: 'en' | 'es' = originalLanguage === 'en' ? 'es' : 'en';
	let translation = entry.translation;
	if (!translation || entry.translationLanguage !== translationTarget) {
		try {
			translation = await translateArticle(
				titlePrimary,
				summaryPrimary,
				contentPrimary,
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
		contentPrimary,
		summaryPrimary,
		titlePrimary,
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
		contentPrimary: string;
		summaryPrimary: string;
		titlePrimary: string;
		translation?: ArticleTranslation;
		altTextEn: string;
		altTextEs: string;
	},
	db: SupabaseClient,
): Promise<ArticleProcessingResult> {
	try {
		const { originalLanguage, contentPrimary, summaryPrimary, titlePrimary, translation, altTextEn, altTextEs } = bilingual;
		const titleEn = originalLanguage === 'en' ? titlePrimary : translation?.title || titlePrimary;
		const titleEs = originalLanguage === 'es' ? titlePrimary : translation?.title || titlePrimary;
		const summaryEn = originalLanguage === 'en' ? summaryPrimary : translation?.summary || summaryPrimary;
		const summaryEs = originalLanguage === 'es' ? summaryPrimary : translation?.summary || summaryPrimary;
		const contentEn = originalLanguage === 'en' ? contentPrimary : translation?.content || contentPrimary;
		const contentEs = originalLanguage === 'es' ? contentPrimary : translation?.content || contentPrimary;

		const baseTags = new Set<string>([
			entry.classification.category,
			entry.article.source.category,
		]);

		const normalizedTitle = normalizeTitleForDedupe(titleEn);
		if (normalizedTitle) {
			for (const candidate of recentNormalizedTitles) {
				if (isNearDuplicateTitle(normalizedTitle, candidate)) {
					console.log(`[DB] ↷ Skipping near-duplicate (title match): ${entry.article.title.slice(0, 80)}...`);
					return { success: true, retryable: false, reason: 'near-duplicate-title' };
				}
			}
		}

		const embeddingBase = `${titleEn} ${summaryEn} ${contentEn.slice(0, 1000)}`;
		let embedding = entry.cachedEmbedding;
		if (embedding === undefined) {
			embedding = await generateEmbedding(embeddingBase);
			entry.cachedEmbedding = embedding ?? null;
		}

		if (Array.isArray(embedding)) {
			const semanticDup = await isSemanticDuplicate(db, embedding);
			if (semanticDup === true) {
				console.log(`[DB] ↷ Skipping semantic duplicate: ${entry.article.title.slice(0, 80)}...`);
				return { success: true, retryable: false, reason: 'semantic-duplicate' };
			}
		}

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
			ai_generated: true,
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

		if (normalizedTitle) {
			recentNormalizedTitleSet.add(normalizedTitle);
			recentNormalizedTitles.push(normalizedTitle);
			runNormalizedTitleSet.add(normalizedTitle);
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

async function processArticle(entry: ClassifiedArticleRecord, db: SupabaseClient, llm: LLMClient): Promise<ArticleProcessingResult> {
	const normalizedTitle = normalizeTitleForDedupe(entry.article.title);
	if (normalizedTitle) {
		if (runNormalizedTitleSet.has(normalizedTitle) || recentNormalizedTitleSet.has(normalizedTitle)) {
			console.log(`[Dedupe] ↷ Skipping duplicate by title: ${entry.article.title.slice(0, 80)}...`);
			return { success: true, retryable: false, reason: 'duplicate-title' };
		}
		for (const candidate of recentNormalizedTitles) {
			if (isNearDuplicateTitle(normalizedTitle, candidate)) {
				console.log(`[Dedupe] ↷ Skipping near-duplicate by title: ${entry.article.title.slice(0, 80)}...`);
				return { success: true, retryable: false, reason: 'near-duplicate-title' };
			}
		}
	}

	let imageData: ResolvedImageData | null = entry.cachedImage ?? null;

	// Skip image scraping for Google News URLs (always uses generic placeholder)
	const isGoogleNews = entry.article.link.includes('news.google.com');
	const maxAttempts = isGoogleNews ? 1 : MAX_IMAGE_ATTEMPTS;
	let attempt = 0;

	while (attempt < maxAttempts && !imageData) {
		attempt += 1;
		const totalAttempt = attempt + (entry.queueAttempts ?? 0);
		imageData = await resolveOriginalImage(entry, totalAttempt);

		if (!imageData && attempt < maxAttempts) {
			console.log(`[ImageValidator] Retry ${attempt}/${maxAttempts} failed for ${entry.article.title.slice(0, 60)}..., waiting...`);
			await sleep(IMAGE_RETRY_DELAY_MS * attempt);
		}
	}

	// Use fallback image from Unsplash if original image not found
	if (!imageData && USE_FALLBACK_IMAGES) {
		console.log(`[ImageValidator] Using fallback image for ${entry.article.title.slice(0, 60)}...`);
		imageData = generateFallbackImage(entry.classification.category, entry.article.title);
	}

	if (!imageData) {
		const reason = 'Unable to locate a valid original image';
		console.warn(`[ImageValidator] ${reason} for ${entry.article.title.slice(0, 80)}...`);
		entry.lastError = reason;
		return { success: false, retryable: true, reason };
	}

	entry.cachedImage = imageData;

	const bilingual = await determineBilingualContent(entry, imageData, llm);
	return persistArticle(entry, imageData, bilingual, db);
}

async function processImageRetryQueue(db: SupabaseClient, llm: LLMClient): Promise<void> {
	if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
		return;
	}

	if (!(await ensureImageRetryQueueAvailable(db))) {
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
		if (isMissingImageRetryQueueTableError(error)) {
			console.warn('[ImageRetry] Queue table missing; disabling image retry queue');
			imageRetryQueueAvailable = false;
			return;
		}
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

		const result = await processArticle(entry, db, llm);

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

	// Build a lightweight in-memory dedupe index for recent articles.
	try {
		const since = new Date(Date.now() - DEDUPE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
		const { data, error } = await db
			.from('news_articles')
			.select('title_en,title_es,published_at')
			.gte('published_at', since)
			.order('published_at', { ascending: false })
			.limit(2000);
		if (error) throw error;
		recentNormalizedTitles = [];
		recentNormalizedTitleSet = new Set<string>();
		for (const row of data ?? []) {
			const t1 = typeof row.title_en === 'string' ? normalizeTitleForDedupe(row.title_en) : '';
			const t2 = typeof row.title_es === 'string' ? normalizeTitleForDedupe(row.title_es) : '';
			if (t1) {
				recentNormalizedTitles.push(t1);
				recentNormalizedTitleSet.add(t1);
			}
			if (t2) {
				recentNormalizedTitles.push(t2);
				recentNormalizedTitleSet.add(t2);
			}
		}
		console.log(`[Dedupe] Loaded ${recentNormalizedTitleSet.size} normalized titles from last ${DEDUPE_LOOKBACK_DAYS} days`);
	} catch (error) {
		console.warn('[Dedupe] Failed to build recent-title index, continuing without it:', error);
	}

	let llm: LLMClient;
	try {
			llm = await createLLMClientForTask('news_rewrite');
	} catch (error) {
		console.error('[LLM] Failed to initialize:', error);
		return;
	}

	await processImageRetryQueue(db, llm);

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
		const result = await processArticle(entry, db, llm);
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

	await processImageRetryQueue(db, llm);

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
