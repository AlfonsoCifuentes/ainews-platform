#!/usr/bin/env tsx
/**
 * Quick test script for news curation (processes only 20 articles for testing)
 */

import 'dotenv/config';
import { createLLMClient } from '../lib/ai/llm-client';
import Parser from 'rss-parser';
import { z } from 'zod';

const parser = new Parser({
  customFields: {
    item: ['media:content', 'media:thumbnail', 'enclosure']
  }
});

// Schema for LLM article classification  
const ArticleClassificationSchema = z.object({
  relevant: z.boolean().describe('Is this article about AI/ML/tech?'),
  quality_score: z.number().min(0).max(1).describe('Quality rating 0-1'),
  category: z.enum(['machinelearning', 'nlp', 'computervision', 'robotics', 'ethics', 'business', 'research', 'tools', 'news', 'other']),
  summary: z.string().describe('Brief summary of the article')
});

async function main() {
  console.log('[Test Curate] Starting quick test with 20 articles...');

  try {
    const llm = createLLMClient('gemini');
    console.log('[Test Curate] Initialized Gemini client');

    // Fetch only from one source for speed
    console.log('[Test Curate] Fetching from OpenAI Blog...');
    const feed = await parser.parseURL('https://openai.com/blog/rss.xml');
    const articles = feed.items.slice(0, 20); // Only test 20 articles
    
    console.log(`[Test Curate] Fetched ${articles.length} articles`);
    console.log('[Test Curate] Classifying with Gemini...');
    
    const classified = [];
    
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      
      try {
        const systemPrompt = `You are a JSON-only response AI. You MUST respond ONLY with valid JSON, no markdown, no explanations, no formatting.
Your response must match this exact structure:
{
  "relevant": boolean,
  "quality_score": number (0-1),
  "category": "machinelearning" | "nlp" | "computervision" | "robotics" | "ethics" | "business" | "research" | "tools" | "news" | "other",
  "summary": string
}`;
        
        const result = await llm.classify(
          `Title: ${article.title}
Content: ${article.contentSnippet || ''}

Is this article relevant to AI/ML/tech? Return JSON only.`,
          ArticleClassificationSchema,
          systemPrompt
        );
        
        if (result.relevant && result.quality_score >= 0.6) {
          classified.push({ article, classification: result });
          console.log(`[Test Curate] ✓ ${article.title?.slice(0, 50)}... (score: ${result.quality_score}, category: ${result.category})`);
        } else {
          console.log(`[Test Curate] ✗ ${article.title?.slice(0, 50)}... (score: ${result.quality_score}, not relevant or low quality)`);
        }
        
        // Small delay every 5 articles
        if ((i + 1) % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // If rate limited, wait longer
        if (errorMessage.includes('429') || errorMessage.includes('rate_limit')) {
          console.log('[Test Curate] Rate limited, waiting 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          i--; // Retry this article
          continue;
        }
        
        console.error(`[Test Curate] ✗ Classification failed for "${article.title?.slice(0, 40)}":`, errorMessage);
      }
    }
    
    console.log(`\n[Test Curate] ===== RESULTS =====`);
    console.log(`[Test Curate] Total tested: ${articles.length}`);
    console.log(`[Test Curate] Passed filter: ${classified.length}`);
    console.log(`[Test Curate] Pass rate: ${((classified.length / articles.length) * 100).toFixed(1)}%`);
    
    if (classified.length > 0) {
      console.log(`\n[Test Curate] Sample classified articles:`);
      classified.slice(0, 5).forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.article.title} (${item.classification.category}, score: ${item.classification.quality_score})`);
      });
    }
    
    console.log('\n[Test Curate] ✓ Test completed successfully!');
    
  } catch (error) {
    console.error('[Test Curate] ✗ Error:', error);
    process.exit(1);
  }
}

main();
