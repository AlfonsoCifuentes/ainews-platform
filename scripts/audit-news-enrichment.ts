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

import { getSupabaseServerClient } from '../lib/db/supabase';

type Row = {
	id: string;
	created_at: string;
	title_en: string | null;
	summary_en: string | null;
	title_es: string | null;
	summary_es: string | null;
	ai_generated: boolean | null;
	rewrite_version: number | null;
	rewrite_model: string | null;
	value_score: number | null;
	source_url: string | null;
};

function normalizeForCompare(text: string | null | undefined): string {
	return (text ?? '')
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function readArgValue(name: string): string | undefined {
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

function percent(n: number, d: number): string {
	if (d === 0) return '0%';
	return `${((n / d) * 100).toFixed(1)}%`;
}

async function main() {
	const days = readArgNumber('--days', 7);
	const limit = readArgNumber('--limit', 500);
	const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

	const supabase = getSupabaseServerClient();

	const { data, error } = await supabase
		.from('news_articles')
		.select('id, created_at, title_en, summary_en, title_es, summary_es, ai_generated, rewrite_version, rewrite_model, value_score, source_url')
		.gte('created_at', sinceIso)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) {
		throw new Error(`[Audit] Failed to fetch news_articles: ${error.message}`);
	}

	const rows = (data ?? []) as Row[];
	const total = rows.length;

	const aiFalse = rows.filter((r) => r.ai_generated === false).length;
	const rewriteMissing = rows.filter((r) => r.rewrite_version == null).length;
	const rewriteLt3 = rows.filter((r) => (r.rewrite_version ?? 0) < 3).length;
	const modelMissing = rows.filter((r) => !r.rewrite_model).length;
	const lowValue = rows.filter((r) => (r.value_score ?? 1) < 0.55).length;
	const degenerate = rows.filter((r) => {
		const te = normalizeForCompare(r.title_en);
		const se = normalizeForCompare(r.summary_en);
		const ts = normalizeForCompare(r.title_es);
		const ss = normalizeForCompare(r.summary_es);
		return (
			(Boolean(te) && Boolean(se) && (se === te || se.startsWith(te))) ||
			(Boolean(ts) && Boolean(ss) && (ss === ts || ss.startsWith(ts)))
		);
	}).length;

	console.log('--- NEWS ENRICHMENT AUDIT ---');
	console.log(`Window: last ${days} days (since ${sinceIso})`);
	console.log(`Sample: ${total} rows (limit ${limit})`);
	console.log('');
	console.log(`ai_generated=false: ${aiFalse} (${percent(aiFalse, total)})`);
	console.log(`rewrite_version is null: ${rewriteMissing} (${percent(rewriteMissing, total)})`);
	console.log(`rewrite_version < 3: ${rewriteLt3} (${percent(rewriteLt3, total)})`);
	console.log(`rewrite_model missing: ${modelMissing} (${percent(modelMissing, total)})`);
	console.log(`value_score < 0.55: ${lowValue} (${percent(lowValue, total)})`);
	console.log(`degenerate (summary≈title): ${degenerate} (${percent(degenerate, total)})`);
	console.log('');

	const likelyRaw = rows
		.filter((r) => {
			const te = normalizeForCompare(r.title_en);
			const se = normalizeForCompare(r.summary_en);
			const ts = normalizeForCompare(r.title_es);
			const ss = normalizeForCompare(r.summary_es);
			const isDegenerate =
				(Boolean(te) && Boolean(se) && (se === te || se.startsWith(te))) ||
				(Boolean(ts) && Boolean(ss) && (ss === ts || ss.startsWith(ts)));
			return r.ai_generated === false || r.rewrite_version == null || (r.value_score ?? 1) < 0.55 || isDegenerate;
		})
		.slice(0, 15);

	if (likelyRaw.length) {
		console.log('Examples (likely under-enriched):');
		for (const r of likelyRaw) {
			const title = (r.title_en || '').slice(0, 110);
			const rv = r.rewrite_version ?? 'null';
			const vs = r.value_score ?? 'null';
			console.log(`- ${r.id.slice(0, 8)} rv=${rv} ai=${r.ai_generated ?? 'null'} vs=${vs} :: ${title}`);
		}
	} else {
		console.log('No obvious under-enriched examples found in sample.');
	}
}

main().catch((e) => {
	console.error(e instanceof Error ? e.message : e);
	process.exit(1);
});
