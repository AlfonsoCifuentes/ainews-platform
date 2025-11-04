#!/usr/bin/env node
/**
 * Diagnostic Script - Check Articles Quality
 * 
 * Analyzes stored articles to identify:
 * 1. Missing images
 * 2. Missing translations (articles only in one language)
 * 3. Duplicate content between EN/ES fields
 */

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

interface DiagnosticReport {
  total: number;
  missingImages: number;
  missingTranslations: number;
  lowQuality: number;
  recentArticles: Array<{
    id: string;
    title_en: string;
    title_es: string;
    image_url: string | null;
    published_at: string;
    hasTranslation: boolean;
  }>;
}

async function diagnoseArticles(): Promise<DiagnosticReport> {
  const db = getSupabaseServerClient();
  
  console.log('[Diagnosis] Fetching articles from database...\n');
  
  const { data: articles, error } = await db
    .from('news_articles')
    .select('id, title_en, title_es, content_en, content_es, image_url, published_at, quality_score')
    .order('published_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('[Diagnosis] Error fetching articles:', error);
    throw error;
  }
  
  if (!articles || articles.length === 0) {
    console.log('[Diagnosis] No articles found in database');
    return {
      total: 0,
      missingImages: 0,
      missingTranslations: 0,
      lowQuality: 0,
      recentArticles: []
    };
  }
  
  let missingImages = 0;
  let missingTranslations = 0;
  let lowQuality = 0;
  
  const recentArticles = articles.slice(0, 10).map(article => {
    const hasImage = !!article.image_url;
    const hasTranslation = article.title_en !== article.title_es && 
                          article.content_en !== article.content_es;
    
    if (!hasImage) missingImages++;
    if (!hasTranslation) missingTranslations++;
    if (article.quality_score && article.quality_score < 0.6) lowQuality++;
    
    return {
      id: article.id,
      title_en: article.title_en,
      title_es: article.title_es,
      image_url: article.image_url,
      published_at: article.published_at,
      hasTranslation
    };
  });
  
  return {
    total: articles.length,
    missingImages,
    missingTranslations,
    lowQuality,
    recentArticles
  };
}

async function main() {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('   AI NEWS PLATFORM - ARTICLE QUALITY DIAGNOSIS');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const report = await diagnoseArticles();
    
    console.log('\n📊 SUMMARY REPORT:');
    console.log('─────────────────────────────────────────────────────────');
    console.log(`  Total articles analyzed: ${report.total}`);
    console.log(`  ❌ Missing images: ${report.missingImages} (${((report.missingImages / report.total) * 100).toFixed(1)}%)`);
    console.log(`  ❌ Missing translations: ${report.missingTranslations} (${((report.missingTranslations / report.total) * 100).toFixed(1)}%)`);
    console.log(`  ⚠️  Low quality (<0.6): ${report.lowQuality} (${((report.lowQuality / report.total) * 100).toFixed(1)}%)`);
    
    console.log('\n\n📰 RECENT ARTICLES (Last 10):');
    console.log('─────────────────────────────────────────────────────────');
    
    report.recentArticles.forEach((article, index) => {
      const imageStatus = article.image_url ? '✅' : '❌';
      const translationStatus = article.hasTranslation ? '✅' : '❌';
      
      console.log(`\n${index + 1}. ${article.title_en.slice(0, 60)}...`);
      console.log(`   ES Title: ${article.title_es.slice(0, 60)}...`);
      console.log(`   Image: ${imageStatus} ${article.image_url || 'MISSING'}`);
      console.log(`   Translation: ${translationStatus} ${article.hasTranslation ? 'BILINGUAL' : 'SAME CONTENT'}`);
      console.log(`   Published: ${new Date(article.published_at).toLocaleString()}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════');
    
    if (report.missingImages > 0 || report.missingTranslations > 0) {
      console.log('\n⚠️  ISSUES DETECTED:');
      
      if (report.missingImages > 0) {
        console.log('  • Some articles are missing images');
        console.log('    → Check getBestArticleImage() function');
        console.log('    → Verify Unsplash fallback is working');
      }
      
      if (report.missingTranslations > 0) {
        console.log('  • Some articles are not translated');
        console.log('    → Check translateArticle() function');
        console.log('    → Verify LLM API keys (GEMINI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY)');
        console.log('    → Check GitHub Actions logs for translation errors');
      }
      
      console.log('\n💡 RECOMMENDED ACTIONS:');
      console.log('  1. Run: npm run ai:curate (to test locally)');
      console.log('  2. Check GitHub Actions logs');
      console.log('  3. Verify all API keys are set in .env.local');
      console.log('  4. Review scripts/curate-news.ts for errors');
    } else {
      console.log('\n✅ No critical issues detected! All articles look good.');
    }
    
    console.log('\n═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Diagnosis failed:', error);
    process.exit(1);
  }
}

main();
