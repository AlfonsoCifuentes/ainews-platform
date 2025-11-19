/**
 * Scrape AI model leaderboard from Artificial Analysis
 * Runs automatically via GitHub Actions every 6 hours
 * Updates lib/ai/fetch-real-leaderboard.ts with latest rankings
 */

import * as fs from 'fs';
import * as path from 'path';

interface LeaderboardModel {
  rank: number;
  name: string;
  provider: string;
  performance_score: number;
  description?: string;
  url?: string;
  company_logo_url?: string;
}

/**
 * Scrape leaderboard data from Artificial Analysis
 * The page is JS-rendered, so we try multiple strategies
 */
async function scrapeLeaderboard(): Promise<LeaderboardModel[]> {
  console.log('🔍 Attempting to fetch Artificial Analysis leaderboard...');
  
  // Strategy 1: Try direct API endpoint
  try {
    console.log('   Trying API endpoint...');
    const apiResponse = await fetch('https://artificialanalysis.ai/api/models/leaderboard', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (apiResponse.ok) {
      const data = await apiResponse.json();
      const models = Array.isArray(data) ? data : data.models || data.data;
      if (Array.isArray(models) && models.length > 0) {
        const validModels = validateAndCleanModels(models);
        if (validModels.length > 0) {
          console.log(`✅ Successfully fetched from API (${validModels.length} models)`);
          return validModels;
        }
      }
    }
  } catch {
    console.log('   API endpoint not available, trying alternatives...');
  }

  // Strategy 2: Try GraphQL if available
  try {
    console.log('   Trying GraphQL endpoint...');
    const graphqlResponse = await fetch('https://artificialanalysis.ai/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        query: `query { leaderboard { models { rank name provider score } } }`
      })
    });

    if (graphqlResponse.ok) {
      const data = await graphqlResponse.json();
      if (data.data?.leaderboard?.models) {
        const validModels = validateAndCleanModels(data.data.leaderboard.models);
        if (validModels.length > 0) {
          console.log(`✅ Successfully fetched from GraphQL (${validModels.length} models)`);
          return validModels;
        }
      }
    }
  } catch {
    console.log('   GraphQL endpoint not available');
  }

  // Strategy 3: Try fetching HTML and extracting data
  try {
    console.log('   Trying HTML parsing...');
    const htmlResponse = await fetch('https://artificialanalysis.ai/leaderboards/models', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (htmlResponse.ok) {
      const html = await htmlResponse.text();
      
      // Look for JSON in script tags
      const scriptMatches = html.match(/<script[^>]*>[\s\S]*?"models"[\s\S]*?<\/script>/g) || [];
      
      for (const script of scriptMatches) {
        try {
          // Extract JSON
          const jsonMatch = script.match(/({[\s\S]*?"models"[\s\S]*?})/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            const models = data.models || data.leaderboard?.models || [];
            const validModels = validateAndCleanModels(models);
            if (validModels.length > 0) {
              console.log(`✅ Successfully parsed HTML (${validModels.length} models)`);
              return validModels;
            }
          }
        } catch {
          continue;
        }
      }
    }
  } catch {
    console.log('   HTML parsing failed');
  }

  // All strategies failed - throw error
  throw new Error('Could not fetch leaderboard data from Artificial Analysis. The website may be down or changed structure.');
}

/**
 * Validate and clean model data
 */
function validateAndCleanModels(models: unknown[]): LeaderboardModel[] {
  return (Array.isArray(models) ? models : [])
    .filter((m: unknown) => {
      const model = m as Record<string, unknown>;
      return (model.rank || model.name) && model.provider;
    })
    .map((m: unknown, index: number) => {
      const model = m as Record<string, unknown>;
      return {
        rank: parseInt(String(model.rank)) || (index + 1),
        name: String(model.name || model.model).trim(),
        provider: String(model.provider || model.organization).trim(),
        performance_score: parseFloat(String(model.performance_score || model.score || model.elo || 0)) || 0,
        description: String(model.description || model.summary || ''),
        url: String(model.url || ''),
        company_logo_url: getLogoUrl(String(model.provider || model.organization))
      };
    })
    .filter(m => m.performance_score > 0) // Filter out invalid scores
    .sort((a, b) => b.performance_score - a.performance_score) // Sort by score descending
    .map((m, index) => ({ ...m, rank: index + 1 })) // Re-rank
    .slice(0, 10); // Top 10
}

/**
 * Fallback: parse HTML table if JSON extraction fails
 */
function _parseHTMLTable(html: string): LeaderboardModel[] {
  const models: LeaderboardModel[] = [];
  
  // Look for table rows with model data
  const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
  const rows = html.match(rowRegex) || [];

  let rank = 1;
  for (const row of rows) {
    // Extract cells
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
    const cells: string[] = [];
    let cellMatch;
    
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      // Remove HTML tags
      const text = cellMatch[1].replace(/<[^>]*>/g, '').trim();
      if (text) cells.push(text);
    }

    // Expect format: [rank, name, provider, score, ...]
    if (cells.length >= 4) {
      const score = parseFloat(cells[3]);
      if (!isNaN(score)) {
        models.push({
          rank,
          name: cells[1],
          provider: cells[2],
          performance_score: score,
          company_logo_url: getLogoUrl(cells[2])
        });
        rank++;
      }
    }
  }

  return models;
}

/**
 * Map provider names to logo URLs
 */
function getLogoUrl(provider: string): string {
  const logoMap: Record<string, string> = {
    'openai': 'openai',
    'anthropic': 'anthropic',
    'google': 'google',
    'google deepmind': 'google-deepmind',
    'meta': 'meta',
    'mistral': 'mistral',
    'mistral ai': 'mistral',
    'xai': 'xai',
    'alibaba': 'alibaba',
    'qwen': 'alibaba',
    'groq': 'groq'
  };

  const normalized = provider.toLowerCase();
  return logoMap[normalized] || normalized.replace(/\s+/g, '-');
}

/**
 * Generate TypeScript code with the leaderboard data
 */
function generateTypeScriptCode(models: LeaderboardModel[]): string {
  const modelCode = models
    .map(m => `    {
      rank: ${m.rank},
      name: '${m.name.replace(/'/g, "\\'")}',
      provider: '${m.provider.replace(/'/g, "\\'")}',
      performance_score: ${m.performance_score},
      description: '${(m.description || '').replace(/'/g, "\\'")}',
      url: '${m.url || ''}',
      company_logo_url: '${m.company_logo_url}'
    }`)
    .join(',\n');

  return `/**
 * Get the official leaderboard data
 * This should match https://artificialanalysis.ai/leaderboards/models
 * Auto-updated: ${new Date().toISOString()}
 * Source: Web scraping from Artificial Analysis
 */
export function getOfficialLeaderboardData(): LeaderboardModel[] {
  return [
${modelCode}
  ];
}`;
}

/**
 * Update the fetch-real-leaderboard.ts file
 */
async function updateLeaderboardFile(models: LeaderboardModel[]): Promise<void> {
  const filePath = path.join(
    process.cwd(),
    'lib/ai/fetch-real-leaderboard.ts'
  );

  // Read the current file
  let content = fs.readFileSync(filePath, 'utf-8');

  // Generate new function code
  const newFunctionCode = generateTypeScriptCode(models);

  // Replace the getOfficialLeaderboardData function
  const functionRegex = /export function getOfficialLeaderboardData\(\): LeaderboardModel\[\] \{[\s\S]*?^\}/m;
  
  if (!functionRegex.test(content)) {
    throw new Error('Could not find getOfficialLeaderboardData function in file');
  }

  content = content.replace(functionRegex, newFunctionCode);

  // Write back
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ Updated ${filePath}`);
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    console.log('🚀 Starting Artificial Analysis leaderboard update...\n');

    // Try to scrape the latest data
    let models: LeaderboardModel[];
    
    try {
      models = await scrapeLeaderboard();
    } catch (error) {
      console.warn('⚠️  Could not scrape live data. Using fallback update process.');
      console.warn('   Manual update: Edit getOfficialLeaderboardData() in fetch-real-leaderboard.ts');
      console.warn('   Or provide LEADERBOARD_JSON env var with JSON data\n');
      
      // Check if env var provides data
      const envData = process.env.LEADERBOARD_JSON;
      if (envData) {
        try {
          models = validateAndCleanModels(JSON.parse(envData));
          console.log('✅ Using data from LEADERBOARD_JSON environment variable\n');
        } catch {
          console.error('❌ Invalid JSON in LEADERBOARD_JSON');
          process.exit(1);
        }
      } else {
        console.log('ℹ️  No LEADERBOARD_JSON env var provided.');
        console.log('   To use this script: Set LEADERBOARD_JSON with JSON array of models');
        console.log('   Example: LEADERBOARD_JSON=\'[{"rank":1,"name":"Model","provider":"Company","score":99}]\'\n');
        process.exit(0);
      }
    }

    // Update the TypeScript file
    await updateLeaderboardFile(models);

    console.log('\n📊 Top 5 Models:');
    models.slice(0, 5).forEach(m => {
      console.log(`  ${m.rank}. ${m.name} (${m.provider}) - ${m.performance_score}%`);
    });

    console.log('\n✅ Leaderboard update complete!');
    process.exit(0);

  } catch {
    console.error('\n❌ Error during update');
    process.exit(1);
  }
}

main();
