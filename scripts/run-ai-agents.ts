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

type AgentType = 'trend_detector' | 'fact_checker' | 'bias_auditor' | 'multi_perspective';

function parseArgs(argv: string[]) {
	const args = new Map<string, string>();
	const positionals: string[] = [];

	for (let i = 0; i < argv.length; i++) {
		const raw = argv[i] ?? '';
		if (!raw.startsWith('--')) {
			positionals.push(raw);
			continue;
		}

		const [k, v] = raw.split('=', 2);
		const key = k.replace(/^--/, '');
		if (v != null) {
			args.set(key, v);
			continue;
		}

		const next = argv[i + 1];
		if (next && !next.startsWith('--')) {
			args.set(key, next);
			i++;
			continue;
		}

		args.set(key, 'true');
	}

	return { args, positionals };
}

function requireSupabaseEnv(): void {
	const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey =
		process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseKey) {
		throw new Error(
			'Missing Supabase env. Need SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).',
		);
	}
}

function normalizeAgentType(value: string): AgentType {
	const t = value.trim();
	if (
		t === 'trend_detector' ||
		t === 'fact_checker' ||
		t === 'bias_auditor' ||
		t === 'multi_perspective'
	) {
		return t;
	}
	throw new Error(`Unknown agent type: ${value}`);
}

async function runAgent(agentType: AgentType, requestId: string): Promise<void> {
	requireSupabaseEnv();

	console.log(`\n═`.repeat(40));
	console.log(`🤖 Running agent: ${agentType}`);
	console.log(`Request ID: ${requestId}`);
	console.log(`═`.repeat(40));

	switch (agentType) {
		case 'trend_detector': {
			const { TrendDetector } = await import('../lib/ai/agents/trend-detector');
			const agent = new TrendDetector();
			await agent.detectTrends();
			return;
		}

		case 'fact_checker': {
			const { getSupabaseServerClient } = await import('../lib/db/supabase');
			const supabase = getSupabaseServerClient();

			const { data: recentArticle } = await supabase
				.from('news_articles')
				.select('id')
				.order('published_at', { ascending: false })
				.limit(1)
				.single();

			if (!recentArticle?.id) {
				console.log('ℹ️ No recent article found; skipping fact check.');
				return;
			}

			const { FactChecker } = await import('../lib/ai/agents/fact-checker');
			const agent = new FactChecker();
			await agent.checkArticle(recentArticle.id);
			return;
		}

		case 'bias_auditor': {
			const { BiasAuditor } = await import('../lib/ai/agents/bias-auditor');
			const agent = new BiasAuditor();
			await agent.analyzeCategory('AI', 5);
			return;
		}

		case 'multi_perspective': {
			const { MultiPerspectiveSummarizer } = await import('../lib/ai/agents/multi-perspective');
			const agent = new MultiPerspectiveSummarizer();
			await agent.generateSummary('Latest AI developments');
			return;
		}
	}
}

async function main() {
	const { args, positionals } = parseArgs(process.argv.slice(2));
	const requestId = args.get('request-id') || `${Date.now()}`;

	const agentRaw = args.get('agent') || positionals[0];
	if (!agentRaw) {
		throw new Error('Usage: tsx scripts/run-ai-agents.ts --agent fact_checker [--request-id <id>]');
	}

	const agent = normalizeAgentType(agentRaw);
	await runAgent(agent, requestId);
	console.log(`✅ Completed: ${agent}`);
}

main().catch((err) => {
	console.error('❌ Agent runner failed:', err);
	process.exit(1);
});
