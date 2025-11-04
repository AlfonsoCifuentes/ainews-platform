/**
 * Enhanced News Scraper with Browser Automation
 * 
 * Integrates browser automation for JS-heavy sites with the existing news curator.
 * Falls back to regular scraping for simple sites.
 */

import { secureFetch } from '@/lib/utils/security';
import {
  scrapeWithBrowser,
  extractArticleWithBrowser,
  requiresBrowserAutomation,
  smartScrape,
} from '@/lib/scraping/browser-automation';
import { extractArticleContent } from '@/lib/scraping/article-extractor';

export interface ScrapedArticle {
  title: string;
  content: string;
  excerpt: string;
  author?: string;
  publishedDate?: string;
  imageUrl?: string;
  sourceUrl: string;
  scrapingMethod: 'fetch' | 'browser' | 'smart';
  loadTime: number;
}

/**
 * Scrape article with intelligent method selection
 * 
 * Strategy:
 * 1. Check if URL is known to be JS-heavy → Use browser automation
 * 2. Try regular fetch first → If content incomplete, use browser
 * 3. Extract article content with appropriate method
 */
export async function scrapeArticle(url: string): Promise<ScrapedArticle> {
  const startTime = Date.now();
  
  try {
    // Check if URL requires browser automation
    const needsBrowser = requiresBrowserAutomation(url);
    
    if (needsBrowser) {
      console.log(`[NewsScraper] Using browser automation for ${url}`);
      
      try {
        const article = await extractArticleWithBrowser(url, {
          timeout: 20000,
          waitForNetworkIdle: true,
        });
        
        return {
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
          author: article.author,
          publishedDate: article.publishedDate,
          imageUrl: article.images[0],
          sourceUrl: url,
          scrapingMethod: 'browser',
          loadTime: article.loadTime,
        };
      } catch (browserError) {
        console.error(`[NewsScraper] Browser automation failed for ${url}:`, browserError);
        
        // Fallback to regular scraping
        return await scrapeWithFetch(url, startTime);
      }
    }
    
    // Try regular fetch first (faster, cheaper)
    return await scrapeWithFetch(url, startTime);
    
  } catch (error) {
    console.error(`[NewsScraper] All scraping methods failed for ${url}:`, error);
    
    // Last resort: Try smart scrape (auto-detects need for browser)
    try {
      const scraped = await smartScrape(url, { timeout: 15000 });
      const extracted = await extractArticleContent(scraped.html, url);
      
      return {
        title: extracted.title,
        content: extracted.content,
        excerpt: extracted.excerpt,
        author: extracted.author,
        publishedDate: extracted.publishedDate,
        imageUrl: extracted.imageUrl,
        sourceUrl: url,
        scrapingMethod: 'smart',
        loadTime: Date.now() - startTime,
      };
    } catch (finalError) {
      throw new Error(`Failed to scrape ${url}: ${finalError}`);
    }
  }
}

/**
 * Scrape with regular fetch (no browser)
 */
async function scrapeWithFetch(url: string, startTime: number): Promise<ScrapedArticle> {
  // Use secureFetch with retry and timeout
  const response = await secureFetch(url, {
    timeout: 10000,
    retries: 2,
    respectRobots: true,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const html = await response.text();
  
  // Check if content seems complete
  if (html.length < 3000) {
    console.warn(`[NewsScraper] Content seems incomplete for ${url}, trying browser automation`);
    
    const scraped = await smartScrape(url, { timeout: 15000 });
    const extracted = await extractArticleContent(scraped.html, url);
    
    return {
      title: extracted.title,
      content: extracted.content,
      excerpt: extracted.excerpt,
      author: extracted.author,
      publishedDate: extracted.publishedDate,
      imageUrl: extracted.imageUrl,
      sourceUrl: url,
      scrapingMethod: 'smart',
      loadTime: Date.now() - startTime,
    };
  }
  
  // Extract article content
  const extracted = await extractArticleContent(html, url);
  
  return {
    title: extracted.title,
    content: extracted.content,
    excerpt: extracted.excerpt,
    author: extracted.author,
    publishedDate: extracted.publishedDate,
    imageUrl: extracted.imageUrl,
    sourceUrl: url,
    scrapingMethod: 'fetch',
    loadTime: Date.now() - startTime,
  };
}

/**
 * Scrape multiple articles in parallel
 * Uses batch processing to avoid overwhelming the system
 */
export async function scrapeMultipleArticles(
  urls: string[]
): Promise<Map<string, ScrapedArticle | Error>> {
  const results = new Map<string, ScrapedArticle | Error>();
  
  // Process in batches of 10
  const batchSize = 10;
  
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    
    const batchResults = await Promise.allSettled(
      batch.map((url) => scrapeArticle(url))
    );
    
    batch.forEach((url, index) => {
      const result = batchResults[index];
      
      if (result.status === 'fulfilled') {
        results.set(url, result.value);
      } else {
        results.set(url, result.reason as Error);
      }
    });
    
    // Small delay between batches to be polite
    if (i + batchSize < urls.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Get scraping statistics
 * Useful for monitoring which methods are being used
 */
export async function getScrapingStats(
  articles: ScrapedArticle[]
): Promise<{
  totalArticles: number;
  byMethod: Record<'fetch' | 'browser' | 'smart', number>;
  averageLoadTime: number;
  successRate: number;
}> {
  const byMethod = articles.reduce(
    (acc, article) => {
      acc[article.scrapingMethod] = (acc[article.scrapingMethod] || 0) + 1;
      return acc;
    },
    {} as Record<'fetch' | 'browser' | 'smart', number>
  );
  
  const averageLoadTime =
    articles.reduce((sum, article) => sum + article.loadTime, 0) / articles.length;
  
  return {
    totalArticles: articles.length,
    byMethod,
    averageLoadTime,
    successRate: articles.length > 0 ? 1 : 0,
  };
}
