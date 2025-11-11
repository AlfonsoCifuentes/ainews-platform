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
import { scrapeArticleImageAdvanced } from '../lib/services/advanced-image-scraper';
import { validateImageEnhanced } from '../lib/services/image-validator';

async function fixGoogleNewsImages() {
	console.log('🔧 Fixing Google News and Reddit placeholder images...\n');
	
	const supabase = getSupabaseServerClient();
	
	// Find articles with Google News or Reddit placeholder images
	const { data: articles, error } = await supabase
		.from('news_articles')
		.select('id, title_en, image_url, source_url')
		.or('image_url.ilike.%lh3.googleusercontent.com%,image_url.ilike.%styles.redditmedia.com%');
	
	if (error) {
		console.error('❌ Error fetching articles:', error);
		return;
	}
	
	if (!articles || articles.length === 0) {
		console.log('✅ No articles with placeholder images found!');
		return;
	}
	
	console.log(`📰 Found ${articles.length} articles with placeholder images\n`);
	
	let fixed = 0;
	let failed = 0;
	
	for (const article of articles) {
		console.log(`\n🔍 Processing: "${article.title_en.slice(0, 60)}..."`);
		console.log(`   Current image: ${article.image_url.slice(0, 80)}...`);
		console.log(`   Source URL: ${article.source_url}`);
		
		// For Google News, we need to extract the real article URL
		let targetUrl = article.source_url;
		
		if (article.source_url.includes('news.google.com')) {
			console.log('   📍 Google News detected - need to extract real URL');
			
			// Try to scrape Google News redirect to get real URL
			try {
				const response = await fetch(article.source_url, {
					redirect: 'manual',
					headers: {
						'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					},
				});
				
				const location = response.headers.get('location');
				if (location && !location.includes('google.com')) {
					targetUrl = location;
					console.log(`   ✓ Found real URL: ${targetUrl.slice(0, 80)}...`);
				} else {
					console.log('   ⚠️  Could not extract real URL from Google News');
					
					// Fallback: Use Unsplash
					const category = article.title_en.toLowerCase().includes('research') ? 'science' : 
					               article.title_en.toLowerCase().includes('business') ? 'data' :
					               article.title_en.toLowerCase().includes('robot') ? 'computer' : 'technology';
					
					const sig = Math.floor(Math.random() * 10000);
					const fallbackUrl = `https://source.unsplash.com/1600x900/?${category},artificial-intelligence&sig=${sig}`;
					
					const { error: updateError } = await supabase
						.from('news_articles')
						.update({ image_url: fallbackUrl })
						.eq('id', article.id);
					
					if (updateError) {
						console.error(`   ❌ Error updating: ${updateError.message}`);
						failed++;
					} else {
						console.log(`   ✓ Updated with fallback: ${fallbackUrl}`);
						fixed++;
					}
					continue;
				}
			} catch (err) {
				console.error(`   ❌ Error extracting URL: ${err instanceof Error ? err.message : err}`);
				failed++;
				continue;
			}
		}
		
		// Scrape the real article URL for images
		try {
			console.log(`   🌐 Scraping for images...`);
			const result = await scrapeArticleImageAdvanced(targetUrl);
			
			if (result && result.url && result.confidence > 0.3) {
				// Validate the image
				const validation = await validateImageEnhanced(result.url, {
					skipRegister: false,
					skipCache: false,
				});
				
				if (validation.isValid) {
					const { error: updateError } = await supabase
						.from('news_articles')
						.update({ image_url: result.url })
						.eq('id', article.id);
					
					if (updateError) {
						console.error(`   ❌ Error updating: ${updateError.message}`);
						failed++;
					} else {
						console.log(`   ✅ Updated with: ${result.url.slice(0, 80)}...`);
						console.log(`      Confidence: ${(result.confidence * 100).toFixed(0)}%, Method: ${result.method}`);
						fixed++;
					}
				} else {
					console.log(`   ⚠️  Image validation failed: ${validation.reason}`);
					
					// Use Unsplash fallback
					const category = article.title_en.toLowerCase().includes('research') ? 'science' : 
					               article.title_en.toLowerCase().includes('business') ? 'data' :
					               article.title_en.toLowerCase().includes('robot') ? 'computer' : 'technology';
					
					const sig = Math.floor(Math.random() * 10000);
					const fallbackUrl = `https://source.unsplash.com/1600x900/?${category},artificial-intelligence&sig=${sig}`;
					
					const { error: updateError } = await supabase
						.from('news_articles')
						.update({ image_url: fallbackUrl })
						.eq('id', article.id);
					
					if (updateError) {
						console.error(`   ❌ Error updating: ${updateError.message}`);
						failed++;
					} else {
						console.log(`   ✓ Updated with fallback: ${fallbackUrl}`);
						fixed++;
					}
				}
			} else {
				console.log(`   ⚠️  No suitable image found (confidence: ${result?.confidence || 0})`);
				
				// Use Unsplash fallback
				const category = article.title_en.toLowerCase().includes('research') ? 'science' : 
				               article.title_en.toLowerCase().includes('business') ? 'data' :
				               article.title_en.toLowerCase().includes('robot') ? 'computer' : 'technology';
				
				const sig = Math.floor(Math.random() * 10000);
				const fallbackUrl = `https://source.unsplash.com/1600x900/?${category},artificial-intelligence&sig=${sig}`;
				
				const { error: updateError } = await supabase
					.from('news_articles')
					.update({ image_url: fallbackUrl })
					.eq('id', article.id);
				
				if (updateError) {
					console.error(`   ❌ Error updating: ${updateError.message}`);
					failed++;
				} else {
					console.log(`   ✓ Updated with fallback: ${fallbackUrl}`);
					fixed++;
				}
			}
		} catch (err) {
			console.error(`   ❌ Scraping error: ${err instanceof Error ? err.message : err}`);
			failed++;
		}
		
		// Small delay to avoid rate limiting
		await new Promise(resolve => setTimeout(resolve, 1000));
	}
	
	console.log('\n' + '='.repeat(80));
	console.log(`✅ Fixed ${fixed} articles`);
	if (failed > 0) {
		console.log(`❌ ${failed} errors encountered`);
	}
	console.log('='.repeat(80));
}

fixGoogleNewsImages().catch((error) => {
	console.error('💥 Fatal error:', error);
	process.exit(1);
});
