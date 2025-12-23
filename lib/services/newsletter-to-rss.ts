/**
 * Newsletter to RSS Conversion Service
 * 
 * Converts popular AI newsletters to RSS feeds using various methods:
 * 1. Direct RSS feeds (many newsletters now have them)
 * 2. kill-the-newsletter.com - Converts email newsletters to Atom feeds
 * 3. Beehiiv/Substack built-in feeds
 * 
 * Usage:
 * - For Substack: https://newsletter.substack.com/feed
 * - For Beehiiv: https://newsletter.beehiiv.com/feed
 * - For kill-the-newsletter: Create inbox at kill-the-newsletter.com
 */

export interface NewsletterSource {
  name: string;
  originalUrl: string;
  rssUrl: string | null;
  platform: 'substack' | 'beehiiv' | 'buttondown' | 'revue' | 'ghost' | 'custom' | 'kill-the-newsletter';
  status: 'active' | 'pending' | 'unavailable';
  notes?: string;
}

/**
 * Popular AI newsletters and their RSS equivalents
 * Many newsletters have native RSS feeds, we just need to find them
 */
export const AI_NEWSLETTERS: NewsletterSource[] = [
  // ══════════════════════════════════════════════════════════════════════════════
  // NEWSLETTERS WITH NATIVE RSS FEEDS
  // ══════════════════════════════════════════════════════════════════════════════
  {
    name: 'The Batch (DeepLearning.AI)',
    originalUrl: 'https://www.deeplearning.ai/the-batch/',
    rssUrl: 'https://www.deeplearning.ai/the-batch/feed/',
    platform: 'custom',
    status: 'active',
    notes: 'Andrew Ng weekly AI newsletter'
  },
  {
    name: 'TLDR AI',
    originalUrl: 'https://tldr.tech/ai',
    rssUrl: 'https://tldr.tech/ai/rss.xml',
    platform: 'custom',
    status: 'active',
    notes: 'Daily AI news digest'
  },
  {
    name: 'Ben\'s Bites',
    originalUrl: 'https://bensbites.beehiiv.com/',
    rssUrl: 'https://bensbites.beehiiv.com/feed',
    platform: 'beehiiv',
    status: 'active',
    notes: 'Daily AI industry digest'
  },
  {
    name: 'The Rundown AI',
    originalUrl: 'https://www.therundown.ai/',
    rssUrl: 'https://www.therundown.ai/feed',
    platform: 'beehiiv',
    status: 'active',
    notes: 'Popular daily AI newsletter'
  },
  {
    name: 'AI Breakfast',
    originalUrl: 'https://aibreakfast.beehiiv.com/',
    rssUrl: 'https://aibreakfast.beehiiv.com/feed',
    platform: 'beehiiv',
    status: 'active',
    notes: 'Morning AI news digest'
  },
  {
    name: 'Ahead of AI',
    originalUrl: 'https://magazine.sebastianraschka.com/',
    rssUrl: 'https://magazine.sebastianraschka.com/feed',
    platform: 'substack',
    status: 'active',
    notes: 'Sebastian Raschka ML research newsletter'
  },
  {
    name: 'The Neuron',
    originalUrl: 'https://www.theneurondaily.com/',
    rssUrl: 'https://www.theneurondaily.com/feed',
    platform: 'beehiiv',
    status: 'active',
    notes: 'Daily AI newsletter'
  },
  {
    name: 'Superhuman AI',
    originalUrl: 'https://www.superhuman.ai/',
    rssUrl: 'https://www.superhuman.ai/feed',
    platform: 'beehiiv',
    status: 'active',
    notes: 'AI productivity tips'
  },
  {
    name: 'AI Tool Report',
    originalUrl: 'https://aitoolreport.beehiiv.com/',
    rssUrl: 'https://aitoolreport.beehiiv.com/feed',
    platform: 'beehiiv',
    status: 'active',
    notes: 'Weekly AI tools roundup'
  },
  {
    name: 'The Algorithmic Bridge',
    originalUrl: 'https://thealgorithmicbridge.substack.com/',
    rssUrl: 'https://thealgorithmicbridge.substack.com/feed',
    platform: 'substack',
    status: 'active',
    notes: 'AI analysis and commentary'
  },
  {
    name: 'Import AI',
    originalUrl: 'https://jack-clark.net/',
    rssUrl: 'https://jack-clark.net/feed/',
    platform: 'custom',
    status: 'active',
    notes: 'Jack Clark AI policy insights'
  },
  {
    name: 'Last Week in AI',
    originalUrl: 'https://lastweekin.ai/',
    rssUrl: 'https://lastweekin.ai/feed',
    platform: 'substack',
    status: 'active',
    notes: 'Weekly AI news roundup'
  },
  {
    name: 'Davis Summarizes Papers',
    originalUrl: 'https://dblalock.substack.com/',
    rssUrl: 'https://dblalock.substack.com/feed',
    platform: 'substack',
    status: 'active',
    notes: 'ML paper summaries'
  },
  {
    name: 'AI Snake Oil',
    originalUrl: 'https://www.aisnakeoil.com/',
    rssUrl: 'https://www.aisnakeoil.com/feed',
    platform: 'substack',
    status: 'active',
    notes: 'Critical AI analysis - Princeton researchers'
  },
  {
    name: 'Interconnects',
    originalUrl: 'https://www.interconnects.ai/',
    rssUrl: 'https://www.interconnects.ai/feed',
    platform: 'substack',
    status: 'active',
    notes: 'Nathan Lambert RLHF/alignment research'
  },
  {
    name: 'ML News',
    originalUrl: 'https://newsletter.maartengrootendorst.com/',
    rssUrl: 'https://newsletter.maartengrootendorst.com/feed',
    platform: 'substack',
    status: 'active',
    notes: 'Maarten Grootendorst ML tutorials'
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // NEWSLETTERS REQUIRING KILL-THE-NEWSLETTER OR MANUAL SETUP
  // ══════════════════════════════════════════════════════════════════════════════
  {
    name: 'Stratechery (Ben Thompson)',
    originalUrl: 'https://stratechery.com/',
    rssUrl: null, // Paid, no public feed
    platform: 'custom',
    status: 'unavailable',
    notes: 'Paid newsletter - no public RSS'
  },
];

/**
 * Get active newsletter RSS URLs for the news curator
 */
export function getActiveNewsletterFeeds(): Array<{ name: string; url: string }> {
  return AI_NEWSLETTERS
    .filter(n => n.status === 'active' && n.rssUrl)
    .map(n => ({
      name: n.name,
      url: n.rssUrl!
    }));
}

/**
 * Instructions for setting up kill-the-newsletter for newsletters without RSS
 */
export function getKillTheNewsletterInstructions(): string {
  return `
# Converting Email Newsletters to RSS

For newsletters without native RSS feeds, use kill-the-newsletter.com:

1. Go to https://kill-the-newsletter.com
2. Enter a name for the newsletter
3. Get a unique email address (e.g., abc123@kill-the-newsletter.com)
4. Subscribe to the newsletter with that email
5. Get the Atom feed URL from kill-the-newsletter
6. Add the Atom URL to AI_NEWSLETTERS with platform: 'kill-the-newsletter'

## Popular newsletters to convert:
- Google AI Research Newsletter
- AWS Machine Learning Blog Newsletter
- Azure AI Newsletter

## Alternative: Use Feedbin
Feedbin ($5/mo) can:
1. Generate unique email addresses for newsletters
2. Convert them to RSS automatically
3. Aggregate all your feeds in one place
`;
}

/**
 * Validate if a newsletter RSS feed is working
 */
export async function validateNewsletterFeed(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ThotNet News Curator/1.0'
      }
    });
    
    if (!response.ok) return false;
    
    const text = await response.text();
    // Check if it looks like RSS/Atom
    return text.includes('<rss') || text.includes('<feed') || text.includes('<channel');
  } catch {
    return false;
  }
}
