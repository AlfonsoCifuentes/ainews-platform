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

async function cleanRedditMetadata() {
	console.log('🧹 Cleaning Reddit metadata from article summaries...\n');
	
	const supabase = getSupabaseServerClient();
	
	// Find all articles with Reddit metadata in summaries
	const { data: articles, error: fetchError } = await supabase
		.from('news_articles')
		.select('id, title_en, summary_en, summary_es, source_url')
		.or('summary_en.ilike.%submitted by /u/%,summary_es.ilike.%submitted by /u/%');
	
	if (fetchError) {
		console.error('❌ Error fetching articles:', fetchError);
		return;
	}
	
	if (!articles || articles.length === 0) {
		console.log('✅ No articles found with Reddit metadata!');
		return;
	}
	
	console.log(`📰 Found ${articles.length} articles with Reddit metadata\n`);
	
	let cleaned = 0;
	let errors = 0;
	
	for (const article of articles) {
		const cleanedEn = sanitizeSummary(article.summary_en || '');
		const cleanedEs = sanitizeSummary(article.summary_es || '');
		
		// Only update if something actually changed
		const needsUpdate = 
			cleanedEn !== article.summary_en || 
			cleanedEs !== article.summary_es;
		
		if (!needsUpdate) {
			continue;
		}
		
		console.log(`🧼 Cleaning: "${article.title_en.slice(0, 60)}..."`);
		console.log(`   Before: "${article.summary_en?.slice(0, 80)}..."`);
		console.log(`   After:  "${cleanedEn.slice(0, 80)}..."`);
		
		const { error: updateError } = await supabase
			.from('news_articles')
			.update({
				summary_en: cleanedEn || article.summary_en,
				summary_es: cleanedEs || article.summary_es,
			})
			.eq('id', article.id);
		
		if (updateError) {
			console.error(`   ❌ Error updating ${article.id}:`, updateError.message);
			errors++;
		} else {
			console.log(`   ✅ Cleaned successfully\n`);
			cleaned++;
		}
	}
	
	console.log('\n' + '='.repeat(50));
	console.log(`✅ Cleaned ${cleaned} articles`);
	if (errors > 0) {
		console.log(`❌ ${errors} errors encountered`);
	}
	console.log('='.repeat(50));
}

cleanRedditMetadata().catch((error) => {
	console.error('💥 Fatal error:', error);
	process.exit(1);
});
