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

async function checkTextOnlyImages() {
	console.log('🔍 Checking for articles with text-only/placeholder images...\n');
	
	const supabase = getSupabaseServerClient();
	
	// Get articles with potential text-only images
	const { data: articles, error } = await supabase
		.from('news_articles')
		.select('id, title_en, title_es, image_url, source_url')
		.order('created_at', { ascending: false })
		.limit(100);
	
	if (error) {
		console.error('❌ Error fetching articles:', error);
		return;
	}
	
	if (!articles || articles.length === 0) {
		console.log('No articles found');
		return;
	}
	
	console.log(`Checking ${articles.length} recent articles...\n`);
	
	const problematic: typeof articles = [];
	
	for (const article of articles) {
		if (!article.image_url) {
			problematic.push(article);
			console.log(`❌ NO IMAGE: "${article.title_en.slice(0, 60)}..."`);
			console.log(`   Source: ${article.source_url}`);
			continue;
		}
		
		// Check for Unsplash fallbacks (these are OK, but note them)
		if (article.image_url.includes('source.unsplash.com')) {
			console.log(`⚠️  FALLBACK: "${article.title_en.slice(0, 60)}..."`);
			console.log(`   Using: ${article.image_url.slice(0, 80)}...`);
			continue;
		}
		
		// Check for Google News images (these are often text-only)
		if (article.image_url.includes('lh3.googleusercontent.com')) {
			problematic.push(article);
			console.log(`🔴 GOOGLE NEWS: "${article.title_en.slice(0, 60)}..."`);
			console.log(`   Image: ${article.image_url}`);
			console.log(`   Source: ${article.source_url}`);
			continue;
		}
		
		// Check for Reddit community icons (not real article images)
		if (article.image_url.includes('styles.redditmedia.com')) {
			problematic.push(article);
			console.log(`🔴 REDDIT ICON: "${article.title_en.slice(0, 60)}..."`);
			console.log(`   Image: ${article.image_url}`);
			console.log(`   Source: ${article.source_url}`);
			continue;
		}
	}
	
	console.log('\n' + '='.repeat(80));
	console.log(`📊 Summary:`);
	console.log(`   Total checked: ${articles.length}`);
	console.log(`   Problematic images: ${problematic.length}`);
	console.log('='.repeat(80));
	
	if (problematic.length > 0) {
		console.log('\n📝 Articles needing better images:');
		for (const article of problematic) {
			console.log(`   - [${article.id}] ${article.title_en.slice(0, 60)}...`);
		}
	}
}

checkTextOnlyImages().catch((error) => {
	console.error('💥 Fatal error:', error);
	process.exit(1);
});
