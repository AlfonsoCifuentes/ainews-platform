#!/usr/bin/env tsx

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import pLimit from 'p-limit';
import { load } from 'cheerio';

const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) {
	loadEnv({ path: envLocal });
} else {
	loadEnv();
}

import { getSupabaseServerClient } from '../lib/db/supabase';
import { getBestArticleImage } from '../lib/services/image-scraper';
import { scrapeArticleImageAdvanced } from '../lib/services/advanced-image-scraper';
import { validateImageEnhanced } from '../lib/services/image-validator';

type SupabaseClient = ReturnType<typeof getSupabaseServerClient>;

type NewsRow = {
	id: string;
	source_url: string;
	image_url: string | null;
	is_hidden: boolean | null;
	title_en: string | null;
	title_es: string | null;
	summary_en: string | null;
	summary_es: string | null;
	content_en: string | null;
	content_es: string | null;
	created_at: string;
};

const EXECUTE = process.argv.includes('--execute');
const LIMIT = Number(
	(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] ?? '120').trim(),
);
const PARALLELISM = Number(
	(process.argv.find((arg) => arg.startsWith('--parallel='))?.split('=')[1] ?? '2').trim(),
);

const BOILERPLATE_PATTERNS: RegExp[] = [
	/\barxiv:\d{4}\.\d{4,5}(v\d+)?\b/gi,
	/\bannounce type\s*:\s*\w+\b/gi,
	/\btipo de anuncio\s*:\s*\w+\b/gi,
	/\bsubmission history\b/gi,
	/\bhistorial de env[íi]os\b/gi,
	/\breferences and citations\b/gi,
	/\breferencias y citas\b/gi,
	/\bbibtex\b/gi,
	/\bnasa ads\b/gi,
	/\bgoogle scholar\b/gi,
	/\bsemantic scholar\b/gi,
	/\bview pdf\b/gi,
	/\bver pdf\b/gi,
	/\bhtml \(experimental\)\b/gi,
	/\barxivlabs\b/gi,
	/\btools? bibliogr[aá]ficas?\b/gi,
	/\bherramientas bibliogr[aá]ficas\b/gi,
	/\bread more\b/gi,
	/\bcontinue reading\b/gi,
	/\bleer m[aá]s\b/gi,
	/\bcontinuar leyendo\b/gi,
	/\bcookie policy\b/gi,
	/\bpol[ií]tica de cookies\b/gi,
	/\bzdnet recommends\b/gi,
	/\bzdnet recomienda\b/gi,
	/\bour process ['"]?zdnet recommends['"]?\b/gi,
	/\bnuestro proceso ['"]?zdnet recomienda['"]?\b/gi,
	/\bwhen you buy through our links\b/gi,
	/\bcuando compras a trav[eé]s de nuestros enlaces\b/gi,
	/\bwe may earn (an )?affiliate commission\b/gi,
	/\bpodemos ganar (una )?comisi[oó]n\b/gi,
	/\beditorial standards\b/gi,
	/\best[aá]ndares editoriales\b/gi,
	/\bshow comments\b/gi,
	/\bmostrar comentarios\b/gi,
	/\bsign in to comment\b/gi,
	/\binicie sesi[oó]n para comentar\b/gi,
	/\bcommunity guidelines\b/gi,
	/\bpautas de la comunidad\b/gi,
	/\bread original article\b/gi,
	/\bleer art[ií]culo original\b/gi,
];

const STOCK_IMAGE_HOSTS = [
	'source.unsplash.com',
	'images.unsplash.com',
	'unsplash.com',
	'pixabay.com',
	'pexels.com',
	'picsum.photos',
];

function isStockImage(url: string | null): boolean {
	if (!url) return true;
	try {
		const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
		return STOCK_IMAGE_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
	} catch {
		return false;
	}
}

function isSourceUnlikelyToProvideEditorialImage(sourceUrl: string): boolean {
	try {
		const host = new URL(sourceUrl).hostname.replace(/^www\./, '').toLowerCase();
		return host === 'arxiv.org' || host === 'reddit.com' || host.endsWith('.reddit.com');
	} catch {
		return false;
	}
}

function normalizeWhitespace(text: string): string {
	return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanBoilerplateText(raw: string | null): string | null {
	if (!raw) return raw;
	let text = raw;
	for (const pattern of BOILERPLATE_PATTERNS) {
		text = text.replace(pattern, ' ');
	}

	text = text
		.replace(/\bannounce type\s*:\s*\w+\b/gi, ' ')
		.replace(/\btipo de anuncio\s*:\s*\w+\b/gi, ' ')
		.replace(/^abstract\s*:\s*/i, '')
		.replace(/^\s*(computer science\s*>\s*.*)$/gim, ' ')
		.replace(/^\s*(ciencias de la computaci[oó]n\s*>\s*.*)$/gim, ' ')
		.replace(/^\s*(subjects?|asignaturas)\s*:\s*.*$/gim, ' ')
		.replace(/^\s*(cite as|citar como)\s*:\s*.*$/gim, ' ')
		.replace(/^\s*doi\s*:\s*.*$/gim, ' ')
		.replace(/^\s*(submission history|historial de env[íi]os).*$/gim, ' ')
		.replace(/^\s*(from:\s*.+)$/gim, ' ')
		.replace(/^\s*(de:\s*.+)$/gim, ' ')
		.replace(/\n{3,}/g, '\n\n');

	text = normalizeWhitespace(text);
	return text || null;
}

function looksPolluted(text: string | null): boolean {
	if (!text) return false;
	const lower = text.toLowerCase();
	return (
		lower.includes('arxiv:') ||
		lower.includes('submission history') ||
		lower.includes('historial de env') ||
		lower.includes('references and citations') ||
		lower.includes('bibtex') ||
		lower.includes('google scholar') ||
		lower.includes('view pdf') ||
		lower.includes('zdnet recommends') ||
		lower.includes('zdnet recomienda') ||
		lower.includes('when you buy through our links') ||
		lower.includes('podemos ganar una comisión') ||
		lower.includes('editorial standards') ||
		lower.includes('estándares editoriales') ||
		lower.includes('show comments') ||
		lower.includes('mostrar comentarios')
	);
}

function hasAiSignal(text: string): boolean {
	const lower = text.toLowerCase();
	const patterns: RegExp[] = [
		/\bartificial intelligence\b/,
		/\bmachine learning\b/,
		/\bdeep learning\b/,
		/\bgenerative ai\b/,
		/\bllm(s)?\b/,
		/\blanguage model(s)?\b/,
		/\bopenai\b/,
		/\bchatgpt\b/,
		/\banthropic\b/,
		/\bclaude\b/,
		/\bdeepmind\b/,
		/\bgemini\b/,
		/\bcopilot\b/,
		/\bcomputer vision\b/,
		/\brobotics?\b/,
	];
	if (patterns.some((p) => p.test(lower))) return true;
	const aiCount = lower.match(/\bai\b/g)?.length ?? 0;
	return aiCount > 0 && /\b(model|assistant|agent|inference|training|prompt|safety|alignment|automation)\b/.test(lower);
}

function isLikelyOffTopicConsumerTech(row: NewsRow): boolean {
	const text = `${row.title_en ?? ''} ${row.title_es ?? ''} ${row.summary_en ?? ''} ${row.summary_es ?? ''}`.toLowerCase();
	if (hasAiSignal(text)) return false;

	const hasHardware =
		/\b(macbook|thinkpad|iphone|ipad|laptop|port[aá]til|smartphone|tablet|galaxy|pixel)\b/.test(text);
	const hasComparison =
		/\b(vs\.?|versus|which is better|cu[aá]l es (la )?mejor|should you buy|deber[ií]as comprar|buying guide|gu[ií]a de compra|review|an[aá]lisis|hands[- ]on)\b/.test(text);

	return hasHardware && hasComparison;
}

async function extractArxivAbstract(url: string): Promise<string | null> {
	try {
		const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
		if (host !== 'arxiv.org') return null;

		const response = await fetch(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			},
			signal: AbortSignal.timeout(12000),
		});
		if (!response.ok) return null;

		const html = await response.text();
		const $ = load(html);

		const titleRaw =
			$('meta[property="og:title"]').attr('content') || $('h1.title').first().text() || '';
		const abstractRaw =
			$('meta[name="citation_abstract"]').attr('content') ||
			$('blockquote.abstract').first().text() ||
			'';

		const title = normalizeWhitespace(titleRaw.replace(/^title\s*:\s*/i, ''));
		const abstract = normalizeWhitespace(abstractRaw.replace(/^abstract\s*:\s*/i, ''));

		if (!abstract || abstract.length < 120) return null;
		return `${title}\n\n${abstract}`.trim();
	} catch {
		return null;
	}
}

async function recoverOriginalImage(row: NewsRow): Promise<string | null> {
	try {
		const fast = await getBestArticleImage(row.source_url);
		if (fast) return fast;
	} catch {
		// ignore
	}

	try {
		const advanced = await scrapeArticleImageAdvanced(row.source_url);
		if (advanced?.url && advanced.confidence > 0.4) {
			const validation = await validateImageEnhanced(advanced.url, {
				skipRegister: true,
				skipCache: false,
			});
			if (validation.isValid) {
				return advanced.url;
			}
		}
	} catch {
		// ignore
	}

	return null;
}

function buildUpdatePatch(row: NewsRow, arxivOverride: string | null): Partial<NewsRow> {
	const patch: Partial<NewsRow> = {};

	const nextSummaryEn = cleanBoilerplateText(row.summary_en);
	const nextSummaryEs = cleanBoilerplateText(row.summary_es);
	const nextContentEn = arxivOverride || cleanBoilerplateText(row.content_en);
	const nextContentEs = arxivOverride || cleanBoilerplateText(row.content_es);

	if (nextSummaryEn !== row.summary_en && nextSummaryEn) patch.summary_en = nextSummaryEn;
	if (nextSummaryEs !== row.summary_es && nextSummaryEs) patch.summary_es = nextSummaryEs;
	if (nextContentEn !== row.content_en && nextContentEn) patch.content_en = nextContentEn;
	if (nextContentEs !== row.content_es && nextContentEs) patch.content_es = nextContentEs;

	return patch;
}

async function fetchCandidateRows(db: SupabaseClient, maxRows: number): Promise<NewsRow[]> {
	const { data, error } = await db
		.from('news_articles')
		.select('id,source_url,image_url,is_hidden,title_en,title_es,summary_en,summary_es,content_en,content_es,created_at')
		.order('created_at', { ascending: false })
		.limit(maxRows);

	if (error) throw error;

	const rows = (data as NewsRow[] | null) ?? [];
	return rows.filter((row) => {
		const needsImageRepair = isStockImage(row.image_url);
		const textPolluted =
			looksPolluted(row.summary_en) ||
			looksPolluted(row.summary_es) ||
			looksPolluted(row.content_en) ||
			looksPolluted(row.content_es);
		const offTopic = isLikelyOffTopicConsumerTech(row);
		return needsImageRepair || textPolluted || offTopic;
	});
}

async function main(): Promise<void> {
	const db = getSupabaseServerClient();
	const limit = Number.isFinite(LIMIT) && LIMIT > 0 ? LIMIT : 120;
	const parallel = Number.isFinite(PARALLELISM) && PARALLELISM > 0 ? PARALLELISM : 2;
	const scanRows = Math.max(limit * 4, 250);

	console.log(
		`[Repair] Starting news quality repair (execute=${EXECUTE}, limit=${limit}, parallel=${parallel})`,
	);

	const candidates = await fetchCandidateRows(db, scanRows);
	const rows = candidates.slice(0, limit);
	console.log(`[Repair] Found ${candidates.length} candidate rows, processing ${rows.length}`);

	const concurrency = pLimit(parallel);
	let textFixed = 0;
	let imageFixed = 0;
	let updated = 0;

	await Promise.all(
		rows.map((row) =>
			concurrency(async () => {
				const arxivOverride = await extractArxivAbstract(row.source_url);
				const patch = buildUpdatePatch(row, arxivOverride);
				const offTopic = isLikelyOffTopicConsumerTech(row);

				if (Object.keys(patch).length > 0) {
					textFixed += 1;
				}

				if (offTopic && row.is_hidden !== true) {
					patch.is_hidden = true;
				}

				if (isStockImage(row.image_url)) {
					const recovered = await recoverOriginalImage(row);
					if (recovered) {
						patch.image_url = recovered;
						imageFixed += 1;
					} else if ((isSourceUnlikelyToProvideEditorialImage(row.source_url) || offTopic) && row.is_hidden !== true) {
						patch.is_hidden = true;
					}
				}

				if (Object.keys(patch).length === 0) return;

				if (EXECUTE) {
					const { error } = await db.from('news_articles').update(patch).eq('id', row.id);
					if (error) {
						console.error(`[Repair] Update failed for ${row.id}: ${error.message}`);
						return;
					}
				}

				updated += 1;
				const touchedText = 'content_en' in patch || 'content_es' in patch || 'summary_en' in patch || 'summary_es' in patch;
				const touchedImage = 'image_url' in patch;
				console.log(
					`[Repair] ${EXECUTE ? 'Updated' : 'Preview'} ${row.id} (text=${touchedText}, image=${touchedImage})`,
				);
			}),
		),
	);

	console.log(
		`[Repair] Completed. Updated=${updated}, text_fixed=${textFixed}, image_fixed=${imageFixed}, execute=${EXECUTE}`,
	);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('[Repair] Fatal error:', error);
		process.exit(1);
	});
