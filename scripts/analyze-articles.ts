#!/usr/bin/env tsx
/**
 * Script to analyze and fix news articles issues:
 * 1. Articles without original images
 * 2. Articles with duplicated content (same en/es)
 * 3. Articles with missing translations
 */

import { getSupabaseServerClient } from '@/lib/db/supabase';
import { createLLMClientWithFallback } from '@/lib/ai/llm-client';
import { load } from 'cheerio';
import { z } from 'zod';

const db = getSupabaseServerClient();

const TranslationSchema = z.object({
  translated_content: z.string()
});

async function analyzeArticles() {
  console.log('🔍 Analyzing news articles...\n');

  // Fetch all articles
  const { data: articles, error } = await db
    .from('news_articles')
    .select('id, title_en, title_es, content_en, content_es, image_url, source_url')
    .order('published_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('❌ Error fetching articles:', error);
    return;
  }

  console.log(`📊 Found ${articles?.length || 0} recent articles\n`);

  let issuesFound = 0;
  const issues: {
    noImage: number;
    duplicateContent: number;
    missingTranslation: number;
    defaultImage: number;
  } = {
    noImage: 0,
    duplicateContent: 0,
    missingTranslation: 0,
    defaultImage: 0
  };

  for (const article of articles || []) {
    const hasIssues: string[] = [];

    // Check 1: No image or using default Unsplash image
    if (!article.image_url) {
      issues.noImage++;
      hasIssues.push('❌ No image');
    } else if (article.image_url.includes('unsplash.com/photo-1677442136019')) {
      issues.defaultImage++;
      hasIssues.push('⚠️  Default fallback image');
    }

    // Check 2: Duplicated content (same in both languages)
    if (article.content_en === article.content_es && article.content_en.length > 50) {
      issues.duplicateContent++;
      hasIssues.push('🔄 Duplicate content (EN = ES)');
    }

    // Check 3: Missing translation (very short or identical to title)
    if (article.content_en.length < 100 || article.content_es.length < 100) {
      issues.missingTranslation++;
      hasIssues.push('📝 Short/missing content');
    }

    if (hasIssues.length > 0) {
      issuesFound++;
      console.log(`\n📰 Article ID: ${article.id}`);
      console.log(`   Title: ${article.title_en.slice(0, 60)}...`);
      console.log(`   Issues:`);
      hasIssues.forEach(issue => console.log(`      ${issue}`));
      console.log(`   Source: ${article.source_url}`);
      console.log(`   Image: ${article.image_url?.slice(0, 80) || 'None'}...`);
    }
  }

  // Summary
  console.log('\n\n📊 Summary:');
  console.log('━'.repeat(50));
  console.log(`Total articles analyzed: ${articles?.length || 0}`);
  console.log(`Articles with issues: ${issuesFound}`);
  console.log(`\nIssue Breakdown:`);
  console.log(`  ❌ No image: ${issues.noImage}`);
  console.log(`  ⚠️  Default fallback image: ${issues.defaultImage}`);
  console.log(`  🔄 Duplicate content: ${issues.duplicateContent}`);
  console.log(`  📝 Short/missing content: ${issues.missingTranslation}`);
  console.log('━'.repeat(50));

  // Recommendations
  console.log('\n\n💡 Recommendations:');
  console.log('━'.repeat(50));
  
  if (issues.defaultImage > 0 || issues.noImage > 0) {
    console.log('\n1. Image Issues:');
    console.log('   - Update extractImageUrl() to try multiple methods:');
    console.log('     a) article.enclosure.url');
    console.log('     b) og:image meta tag from source URL');
    console.log('     c) First <img> in content');
    console.log('     d) Twitter card image');
    console.log('   - Consider scraping source URL for better images');
  }

  if (issues.duplicateContent > 0) {
    console.log('\n2. Duplicate Content:');
    console.log('   - Check if translation is failing silently');
    console.log('   - Verify LLM API responses in translateArticle()');
    console.log('   - Add validation: if translation === original, retry or skip');
  }

  if (issues.missingTranslation > 0) {
    console.log('\n3. Missing Content:');
    console.log('   - cleanContent() might be too aggressive (2000 char limit)');
    console.log('   - Some RSS feeds only have contentSnippet, not full content');
    console.log('   - Consider fetching full article from source URL');
  }

  console.log('\n━'.repeat(50));
}

async function fixArticleImage(articleId: string, sourceUrl: string) {
  console.log(`\n🔧 Attempting to fetch better image for article ${articleId}...`);
  
  try {
    // Fetch the source page
    const response = await fetch(sourceUrl);
    const html = await response.text();
    const $ = load(html);

    // Try multiple strategies
    const strategies = [
      () => $('meta[property="og:image"]').attr('content'),
      () => $('meta[name="twitter:image"]').attr('content'),
      () => $('meta[property="og:image:secure_url"]').attr('content'),
      () => $('link[rel="image_src"]').attr('href'),
      () => $('article img').first().attr('src'),
      () => $('.featured-image img').first().attr('src'),
      () => $('.post-thumbnail img').first().attr('src'),
    ];

    let imageUrl: string | undefined;
    for (const strategy of strategies) {
      imageUrl = strategy();
      if (imageUrl && imageUrl.startsWith('http')) {
        console.log(`✓ Found image: ${imageUrl.slice(0, 80)}...`);
        break;
      }
    }

    if (imageUrl) {
      // Update database
      const { error } = await db
        .from('news_articles')
        .update({ image_url: imageUrl })
        .eq('id', articleId);

      if (error) {
        console.error('❌ Failed to update:', error);
      } else {
        console.log('✓ Image updated successfully');
      }
    } else {
      console.log('⚠️  No suitable image found');
    }
  } catch (error) {
    console.error('❌ Error fetching source:', error);
  }
}

async function fixDuplicateContent(articleId: string, content: string, _sourceUrl: string) {
  console.log(`\n🔧 Attempting to fix duplicate content for article ${articleId}...`);
  
  try {
    const llm = await createLLMClientWithFallback();

    // Detect language
    const isSpanish = content.includes('ción') || content.includes('ñ') || 
                      content.toLowerCase().includes('el ') || 
                      content.toLowerCase().includes('la ');
    const originalLang = isSpanish ? 'es' : 'en';
    const targetLang = isSpanish ? 'en' : 'es';

    console.log(`   Detected language: ${originalLang.toUpperCase()}`);
    console.log(`   Translating to: ${targetLang.toUpperCase()}...`);

    // Translate using LLM
    const translation = await llm.classify(
      `Translate the following AI news article content from ${originalLang} to ${targetLang}.
Maintain technical accuracy, preserve names and figures.

Content: ${content.slice(0, 1500)}

Provide ONLY the translated text, no explanations.`,
      TranslationSchema
    );

    const translatedContent = translation.translated_content;

    if (translatedContent && translatedContent.length > 50) {
      // Update database
      const updateData = originalLang === 'en' 
        ? { content_es: translatedContent }
        : { content_en: translatedContent };

      const { error } = await db
        .from('news_articles')
        .update(updateData)
        .eq('id', articleId);

      if (error) {
        console.error('❌ Failed to update:', error);
      } else {
        console.log('✓ Content translated and updated');
        console.log(`   Length: ${translatedContent.length} chars`);
      }
    } else {
      console.log('⚠️  Translation failed or too short');
    }
  } catch (error) {
    console.error('❌ Error translating:', error);
  }
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

if (command === 'analyze') {
  analyzeArticles().catch(console.error);
} else if (command === 'fix-image' && args[1] && args[2]) {
  fixArticleImage(args[1], args[2]).catch(console.error);
} else if (command === 'fix-content' && args[1] && args[2] && args[3]) {
  fixDuplicateContent(args[1], args[2], args[3]).catch(console.error);
} else {
  console.log('Usage:');
  console.log('  npm run analyze-articles          # Analyze all recent articles');
  console.log('  npm run fix-image <id> <url>      # Fix image for specific article');
  console.log('  npm run fix-content <id> <content> <url>  # Fix duplicate content');
}
