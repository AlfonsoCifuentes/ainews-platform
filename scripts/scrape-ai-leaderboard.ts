#!/usr/bin/env node

/**
 * AI Leaderboard Scraper
 * Scrapes artificialanalysis.ai/leaderboards/models and updates Supabase
 * Runs daily via GitHub Actions
 * 
 * Uses Playwright for headless browser scraping since the site renders via JavaScript
 */

import { chromium, type Browser, type Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface AIModel {
  rank: number;
  name: string;
  provider: string;
  performance_score: number;
  context_window?: string;
  price_per_million?: number;
  output_speed?: number;
  latency?: number;
  description?: string;
  model_url?: string;
}

// Provider name normalization map
const PROVIDER_MAP: Record<string, string> = {
  'google': 'Google',
  'openai': 'OpenAI',
  'anthropic': 'Anthropic',
  'meta': 'Meta',
  'xai': 'xAI',
  'mistral': 'Mistral',
  'deepseek': 'DeepSeek',
  'alibaba': 'Alibaba',
  'amazon': 'Amazon',
  'microsoft azure': 'Microsoft',
  'nvidia': 'NVIDIA',
  'cohere': 'Cohere',
  'ai21 labs': 'AI21 Labs',
  'baidu': 'Baidu',
  'bytedance seed': 'ByteDance',
  'kimi': 'Kimi',
  'z ai': 'Z AI',
  'nous research': 'Nous Research',
  'allen institute for ai': 'Allen Institute',
  'ibm': 'IBM',
  'lg ai research': 'LG AI Research',
  'xiaomi': 'Xiaomi',
  'upstage': 'Upstage',
  'reka ai': 'Reka AI',
  'servicenow': 'ServiceNow',
  'inclusionai': 'InclusionAI',
  'kwaikat': 'KwaiKAT',
  'minimax': 'MiniMax',
  'mbzuai institute of foundation models': 'MBZUAI',
  'liquid ai': 'Liquid AI',
  'motif technologies': 'Motif',
  'deep cogito': 'Deep Cogito',
};

function normalizeProvider(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return PROVIDER_MAP[lower] || raw.trim();
}

function parseNumber(text: string): number {
  // Extract first number from string like "73", "$4.50", "134", "29.22"
  const match = text.replace(/[$,]/g, '').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

async function scrapeLeaderboard(): Promise<AIModel[]> {
  console.log('🤖 Starting AI Leaderboard scrape from artificialanalysis.ai...');
  
  let browser: Browser | null = null;
  
  try {
    // Launch headless browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page: Page = await browser.newPage();
    
    // Navigate to the leaderboard page
    console.log('📄 Loading leaderboard page...');
    await page.goto('https://artificialanalysis.ai/leaderboards/models', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    // Wait for the table to load
    console.log('⏳ Waiting for table to render...');
    await page.waitForSelector('table', { timeout: 30000 });
    
    // Give it a bit more time to fully render
    await page.waitForTimeout(2000);
    
    // Extract data from the table
    console.log('📊 Extracting model data...');
    const models = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      const data: Array<{
        name: string;
        context: string;
        provider: string;
        score: number;
        price: number;
        speed: number;
        latency: number;
      }> = [];
      
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 4) return;
        
        // Get text content from each cell
        const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim() || '');
        
        // Extract model name - usually first cell
        const nameCell = cells[0];
        const name = nameCell.textContent?.trim() || '';
        
        // Skip header rows or invalid entries
        if (!name || name.toLowerCase().includes('model') || name.length < 2) return;
        
        // Extract provider - look for the image alt text or logo text
        let provider = '';
        const providerImg = row.querySelector('img[alt*="logo"]');
        if (providerImg) {
          provider = providerImg.getAttribute('alt')?.replace(' logo', '').replace('logo', '').trim() || '';
        }
        if (!provider && cellTexts[2]) {
          provider = cellTexts[2].replace(/logo/gi, '').trim();
        }
        
        // Extract numeric values - try to parse from cell texts
        const score = parseInt(cellTexts[3] || '0', 10);
        const priceMatch = cellTexts[5]?.match(/\$?([\d.]+)/);
        const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
        const speed = parseInt(cellTexts[6] || '0', 10);
        const latencyMatch = cellTexts[7]?.match(/([\d.]+)/);
        const latency = latencyMatch ? parseFloat(latencyMatch[1]) : 0;
        
        // Context window in position 1
        const context = cellTexts[1] || '';
        
        data.push({
          name: name.replace(/\s+logo\s*/gi, '').trim(),
          context,
          provider,
          score,
          price,
          speed,
          latency
        });
      });
      
      return data;
    });
    
    await browser.close();
    browser = null;
    
    // Process and rank models
    const processedModels: AIModel[] = models
      .filter(m => m.name && m.score > 0)
      .map((m, index) => ({
        rank: index + 1,
        name: m.name,
        provider: normalizeProvider(m.provider || 'Unknown'),
        performance_score: m.score,
        context_window: m.context,
        price_per_million: m.price,
        output_speed: m.speed,
        latency: m.latency,
        model_url: `https://artificialanalysis.ai/models/${encodeURIComponent(m.name.toLowerCase().replace(/\s+/g, '-'))}`,
      }));
    
    // Sort by performance score descending and re-rank
    processedModels.sort((a, b) => b.performance_score - a.performance_score);
    processedModels.forEach((m, i) => m.rank = i + 1);
    
    // Limit to top 50
    const topModels = processedModels.slice(0, 50);
    
    console.log(`📊 Extracted ${topModels.length} models from leaderboard`);
    if (topModels.length > 0) {
      console.log('🏆 Top 5 models:');
      topModels.slice(0, 5).forEach(m => {
        console.log(`   ${m.rank}. ${m.name} (${m.provider}) - Score: ${m.performance_score}`);
      });
    }
    
    return topModels;
    
  } catch (error) {
    console.error('❌ Scraping error:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

async function updateSupabase(models: AIModel[]): Promise<void> {
  console.log(`📊 Updating Supabase with ${models.length} models...`);

  if (models.length === 0) {
    console.warn('⚠️ No models to insert, skipping update');
    return;
  }

  try {
    // Delete old data
    const { error: deleteError } = await supabase
      .from('ai_leaderboard')
      .delete()
      .neq('rank', -1); // Delete all

    if (deleteError) {
      console.error('Error deleting old data:', deleteError);
      throw deleteError;
    }

    // Insert new data - only use columns that exist in the table
    const { error: insertError } = await supabase
      .from('ai_leaderboard')
      .insert(
        models.map(model => ({
          rank: model.rank,
          name: model.name,
          provider: model.provider,
          performance_score: model.performance_score,
          description: model.description || `${model.context_window || ''} context, $${model.price_per_million?.toFixed(2) || '?'}/M tokens, ${model.output_speed || '?'} t/s`.trim(),
          model_url: model.model_url,
          archived_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }))
      );

    if (insertError) {
      console.error('Error inserting new data:', insertError);
      throw insertError;
    }

    console.log('✅ Successfully updated Supabase');
  } catch (error) {
    console.error('❌ Supabase update error:', error);
    throw error;
  }
}

async function main() {
  try {
    const models = await scrapeLeaderboard();
    console.log(`✅ Successfully scraped ${models.length} models`);
    
    if (models.length > 0) {
      await updateSupabase(models);
      console.log('🎉 Leaderboard update completed successfully!');
    } else {
      console.error('❌ No models scraped, not updating database');
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
