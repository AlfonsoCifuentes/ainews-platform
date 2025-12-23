#!/usr/bin/env npx tsx
/**
 * Show article content for verification
 * Usage: npx tsx scripts/show-article.ts <article-id>
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
	const articleId = process.argv[2];
	if (!articleId) {
		console.error('Usage: npx tsx scripts/show-article.ts <article-id>');
		process.exit(1);
	}

	const { data, error } = await supabase
		.from('news_articles')
		.select('title_es, title_en, content_es, content_en, rewrite_model, rewrite_version')
		.eq('id', articleId)
		.single();

	if (error || !data) {
		console.error('Article not found:', error?.message);
		process.exit(1);
	}

	console.log('\n=== ARTÍCULO ===\n');
	console.log('Título ES:', data.title_es);
	console.log('Título EN:', data.title_en);
	console.log('Modelo:', data.rewrite_model);
	console.log('Versión:', data.rewrite_version);
	
	console.log('\n=== CONTENIDO ES ===\n');
	console.log(data.content_es);
	
	console.log('\n=== CONTENIDO EN ===\n');
	console.log(data.content_en);
}

main().catch(console.error);
