#!/usr/bin/env tsx

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { z } from 'zod';

const envLocal = resolve(process.cwd(), '.env.local');
if (existsSync(envLocal)) {
	loadEnv({ path: envLocal });
} else {
	loadEnv();
}

import { getSupabaseServerClient } from '../lib/db/supabase';
import { createLLMClient, createLLMClientForTask, type LLMClient, type LLMProvider } from '../lib/ai/llm-client';
import { buildVerticalVoiceSystemPrompt } from '../lib/ai/prompt-voice';
import { translateArticle } from '../lib/ai/translator';

type SupabaseClient = ReturnType<typeof getSupabaseServerClient>;

const ArticleRewriteSchema = z.object({
	title: z.string().min(8).max(180),
	summary: z.string().min(60).max(520),
	content: z.string().min(200).max(3200),
});

type ArticleRewrite = z.infer<typeof ArticleRewriteSchema>;

type MaintainArgs = {
	dryRun: boolean;
	rewriteDays: number;
	deleteOlderThanDays: number;
	confirmDelete: boolean;
	batchSize: number;
	maxRewrite: number;
	provider?: LLMProvider;
	model?: string;
};

function readArgValue(name: string): string | undefined {
	// npm v11 may treat unknown flags as npm config and expose them via env vars
	// e.g. `--rewrite-days=3` -> process.env.npm_config_rewrite_days === '3'
	const envKey = `npm_config_${name.replace(/^--/, '').replace(/-/g, '_')}`;
	const fromEnv = process.env[envKey];
	if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv.trim();

	// Support: --flag value AND --flag=value
	const eqPrefix = `${name}=`;
	const eq = process.argv.find((a) => a.startsWith(eqPrefix));
	if (eq) return eq.slice(eqPrefix.length);

	const idx = process.argv.indexOf(name);
	if (idx === -1) return undefined;
	return process.argv[idx + 1];
}

function readArgNumber(name: string, defaultValue: number): number {
	const raw = readArgValue(name);
	if (!raw) return defaultValue;
	const n = Number(raw);
	return Number.isFinite(n) ? n : defaultValue;
}

function hasFlag(name: string): boolean {
	const envKey = `npm_config_${name.replace(/^--/, '').replace(/-/g, '_')}`;
	const raw = (process.env[envKey] || '').trim().toLowerCase();
	if (raw === 'true' || raw === '1' || raw === 'yes') return true;

	if (process.argv.includes(name)) return true;

	// Support: --flag=true / --flag=1 / --flag=yes
	const eqPrefix = `${name}=`;
	const eq = process.argv.find((a) => a.startsWith(eqPrefix));
	if (!eq) return false;
	const value = eq.slice(eqPrefix.length).trim().toLowerCase();
	if (value === '') return true;
	return value === 'true' || value === '1' || value === 'yes';
}

function getPositionalNumbers(): number[] {
	// tsx: process.argv = [node, script, ...args]
	return process.argv
		.slice(2)
		.filter((a) => !a.startsWith('-'))
		.map((a) => Number(a))
		.filter((n) => Number.isFinite(n));
}

function parseArgs(): MaintainArgs {
	const positional = getPositionalNumbers();
	const rewriteDays = readArgNumber('--rewrite-days', positional[0] ?? 3);
	const deleteOlderThanDays = readArgNumber('--delete-older-than-days', positional[1] ?? 3);

	const providerRaw = (readArgValue('--provider') || process.env.MAINTAIN_NEWS_PROVIDER || '').trim().toLowerCase();
	const provider = (providerRaw || undefined) as LLMProvider | undefined;
	const model = (readArgValue('--model') || process.env.MAINTAIN_NEWS_MODEL || undefined)?.trim() || undefined;

	const dryRun = hasFlag('--dry-run') || (process.env.DRY_RUN ?? '').toLowerCase() === 'true';
	return {
		dryRun,
		rewriteDays,
		deleteOlderThanDays,
		confirmDelete: hasFlag('--confirm-delete'),
		batchSize: readArgNumber('--batch-size', 50),
		maxRewrite: readArgNumber('--max-rewrite', 500),
		provider,
		model,
	};
}

async function createMaintenanceLLM(args: MaintainArgs): Promise<LLMClient> {
	if (args.provider) {
		return createLLMClient(args.provider, args.model);
	}

	// For this operational maintenance script we prefer OpenAI when configured
	// to avoid local-model structured-output drift.
	if (process.env.OPENAI_API_KEY) {
		const model = args.model || 'gpt-4o-mini';
		const client = createLLMClient('openai', model);
		console.log(`[LLM] ✓ Using OpenAI (${model}) for maintain-news`);
		return client;
	}

	return await createLLMClientForTask('news_rewrite');
}

function normalizeForChecks(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

function countUrls(text: string): number {
	const matches = normalizeForChecks(text).match(/https?:\/\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]+/gi);
	return matches?.length ?? 0;
}

function looksLikeUrlOnly(text: string): boolean {
	const cleaned = normalizeForChecks(text);
	if (!cleaned) return true;

	const stripped = cleaned.replace(/[()\[\]<>"'.,;:!?]/g, ' ');
	const parts = stripped.split(' ').filter(Boolean);

	if (parts.length <= 3 && parts.some((p) => p.startsWith('http://') || p.startsWith('https://'))) return true;
	if (cleaned.length < 120 && (cleaned.includes('http://') || cleaned.includes('https://'))) return true;

	const urlCount = countUrls(cleaned);
	if (urlCount >= 2 && parts.length <= urlCount * 6) return true;

	return false;
}

function containsBoilerplateArtifacts(text: string): boolean {
	const cleaned = normalizeForChecks(text).toLowerCase();
	if (!cleaned) return false;

	const patterns: RegExp[] = [
		/\b(read more|continue reading|view image|see image)\b/i,
		/\b(leer más|seguir leyendo|continúa leyendo|ver imagen|ver\s+la\s+imagen)\b/i,
		/\b(reuse this content|republish|reutilizar este contenido|republicar)\b/i,
		/\b(sign up|subscribe|newsletter|suscríbete|suscribirte|boletín)\b/i,
		/\b(cookie policy|privacy policy|política de cookies|política de privacidad)\b/i,
		/\b(share|compartir|copy link|copiar enlace)\b/i,
		/\b(all rights reserved|todos los derechos reservados)\b/i,
	];

	return patterns.some((p) => p.test(cleaned));
}

function isRewriteQualityOk(rewrite: ArticleRewrite): { ok: boolean; reasons: string[] } {
	const reasons: string[] = [];
	const title = normalizeForChecks(rewrite.title);
	const summary = normalizeForChecks(rewrite.summary);
	const content = normalizeForChecks(rewrite.content);

	if (title.length < 8) reasons.push('title_too_short');
	if (summary.length < 60) reasons.push('summary_too_short');
	if (content.length < 200) reasons.push('content_too_short');
	if (looksLikeUrlOnly(summary)) reasons.push('summary_url_only');
	if (looksLikeUrlOnly(content)) reasons.push('content_url_only');
	if (countUrls(`${summary} ${content}`) > 2) reasons.push('too_many_urls');
	if (containsBoilerplateArtifacts(`${summary}\n${content}`)) reasons.push('boilerplate_artifacts');

	return { ok: reasons.length === 0, reasons };
}

function truncateForRewrite(text: string, maxChars: number = 5200): string {
	const cleaned = normalizeForChecks(text);
	if (cleaned.length <= maxChars) return cleaned;

	const truncated = cleaned.slice(0, maxChars);
	const lastSentence = truncated.lastIndexOf('.');
	if (lastSentence > maxChars * 0.75) {
		return truncated.slice(0, lastSentence + 1).trim();
	}

	return truncated.trim();
}

async function rewriteInEnglish(llm: LLMClient, input: { title: string; summary: string; content: string }): Promise<ArticleRewrite | null> {
	const systemPrompt = buildVerticalVoiceSystemPrompt({ locale: 'en', vertical: 'news' });
	const prompt = `Rewrite the article below in English.

Hard rules:
- Do NOT include raw URLs in the summary or content.
- Remove boilerplate like "Read more", "Continue reading", cookie/privacy banners, subscription prompts, republish notices.
- Do NOT reference missing images or UI elements.
- Keep output lengths within limits: title <= 180 chars, summary 60-520 chars, content 200-3200 chars.

Return ONLY JSON with keys title, summary, content.

Original title: ${input.title}
Original summary: ${input.summary}
Original content: ${truncateForRewrite(input.content)}`;

	try {
		const rewritten = await llm.classify(prompt, ArticleRewriteSchema, systemPrompt);
		const quality = isRewriteQualityOk(rewritten);
		if (!quality.ok) {
			console.warn(`[MaintainNews] Reject rewrite: ${quality.reasons.join(', ')}`);
			return null;
		}
		return rewritten;
	} catch (error) {
		console.warn('[MaintainNews] Rewrite failed:', error instanceof Error ? error.message : error);
		return null;
	}
}

async function rewriteLastDays(db: SupabaseClient, llm: LLMClient, args: MaintainArgs): Promise<void> {
	const now = Date.now();
	const cutoffIso = new Date(now - args.rewriteDays * 24 * 60 * 60 * 1000).toISOString();
	console.log(`[MaintainNews] Rewrite window: published_at >= ${cutoffIso}`);

	let offset = 0;
	let rewrittenCount = 0;
	let skippedCount = 0;

	while (rewrittenCount + skippedCount < args.maxRewrite) {
		const { data, error } = await db
			.from('news_articles')
			.select('id, title_en, summary_en, content_en, published_at')
			.gte('published_at', cutoffIso)
			.order('published_at', { ascending: false })
			.range(offset, offset + args.batchSize - 1);

		if (error) {
			throw new Error(`[MaintainNews] Failed to fetch articles: ${error.message}`);
		}

		const rows = (data ?? []) as Array<{ id: string; title_en: string; summary_en: string; content_en: string; published_at: string }>;
		if (rows.length === 0) break;

		for (const row of rows) {
			if (rewrittenCount + skippedCount >= args.maxRewrite) break;

			const itemIndex = rewrittenCount + skippedCount + 1;
			const progress = `[MaintainNews] [${itemIndex}]`;
			const english = await rewriteInEnglish(llm, {
				title: row.title_en,
				summary: row.summary_en,
				content: row.content_en,
			});

			if (!english) {
				console.warn(`${progress} Skip (rewrite failed): ${row.id}`);
				skippedCount += 1;
				continue;
			}

			let spanish;
			try {
				spanish = await translateArticle(english.title, english.summary, english.content, 'en', 'es');
			} catch (e) {
				console.warn(`${progress} Skip (translation failed): ${row.id} (${e instanceof Error ? e.message : String(e)})`);
				skippedCount += 1;
				continue;
			}

			if (args.dryRun) {
				if (itemIndex <= 10 || itemIndex % 25 === 0) {
					console.log(`${progress} DRY-RUN rewrite: ${row.id}`);
				}
				rewrittenCount += 1;
				continue;
			}

			const { error: updateError } = await db
				.from('news_articles')
				.update({
					title_en: english.title,
					summary_en: english.summary,
					content_en: english.content,
					title_es: spanish.title,
					summary_es: spanish.summary,
					content_es: spanish.content,
					ai_generated: true,
					updated_at: new Date().toISOString(),
				})
				.eq('id', row.id);

			if (updateError) {
				console.warn(`${progress} Update failed: ${row.id} (${updateError.message})`);
				skippedCount += 1;
				continue;
			}

			if (itemIndex <= 10 || itemIndex % 25 === 0) {
				console.log(`${progress} Rewrote: ${row.id}`);
			}
			rewrittenCount += 1;
		}

		offset += rows.length;
		if (rows.length < args.batchSize) break;
	}

	console.log(`[MaintainNews] Rewrite done. Rewrote: ${rewrittenCount}, skipped: ${skippedCount}, dryRun: ${args.dryRun}`);
}

async function deleteOlderThan(db: SupabaseClient, args: MaintainArgs): Promise<void> {
	const now = Date.now();
	const cutoffIso = new Date(now - args.deleteOlderThanDays * 24 * 60 * 60 * 1000).toISOString();
	console.log(`[MaintainNews] Delete window: published_at < ${cutoffIso}`);

	const { count, error: countError } = await db
		.from('news_articles')
		.select('*', { count: 'exact', head: true })
		.lt('published_at', cutoffIso);

	if (countError) {
		throw new Error(`[MaintainNews] Failed to count old articles: ${countError.message}`);
	}

	const total = count ?? 0;
	console.log(`[MaintainNews] Old articles found: ${total}`);

	if (total === 0) return;

	if (args.dryRun) {
		console.log('[MaintainNews] DRY-RUN: skipping deletions');
		return;
	}

	if (!args.confirmDelete) {
		console.log('[MaintainNews] Skipping deletion: missing --confirm-delete');
		return;
	}

	let deleted = 0;
	while (true) {
		const { data, error } = await db
			.from('news_articles')
			.select('id')
			.lt('published_at', cutoffIso)
			.order('published_at', { ascending: true })
			.limit(args.batchSize);

		if (error) {
			throw new Error(`[MaintainNews] Failed to list old article ids: ${error.message}`);
		}

		const ids = (data ?? []).map((row) => row.id).filter(Boolean) as string[];
		if (ids.length === 0) break;

		const { error: deleteError } = await db.from('news_articles').delete().in('id', ids);
		if (deleteError) {
			throw new Error(`[MaintainNews] Failed to delete batch: ${deleteError.message}`);
		}

		deleted += ids.length;
		console.log(`[MaintainNews] Deleted ${deleted}/${total}...`);
		if (ids.length < args.batchSize) break;
	}

	console.log(`[MaintainNews] Deletion done. Deleted: ${deleted}`);
}

async function main(): Promise<void> {
	const args = parseArgs();

	if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
		throw new Error('Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)');
	}

	console.log('[MaintainNews] Starting...');
	console.log(`[MaintainNews] dryRun=${args.dryRun} rewriteDays=${args.rewriteDays} deleteOlderThanDays=${args.deleteOlderThanDays} batchSize=${args.batchSize}`);

	const db = getSupabaseServerClient();
	const llm = await createMaintenanceLLM(args);

	await rewriteLastDays(db, llm, args);
	await deleteOlderThan(db, args);

	console.log('[MaintainNews] Finished.');
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error('[MaintainNews] Fatal:', error instanceof Error ? error.message : error);
		process.exit(1);
	});
