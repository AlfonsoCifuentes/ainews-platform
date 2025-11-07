/**
 * Insert seed data for ai_prompts table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SEED_PROMPTS = [
  {
    category: 'news_curation',
    prompt_text: `You are an AI news curator specialized in Artificial Intelligence content.

Analyze this article and determine:
1. Is it relevant to AI? (technology, research, applications, ethics, industry news)
2. Quality score 1-10 (based on depth, accuracy, originality)
3. Target audience: researcher, developer, business, general
4. Key topics/tags (max 5)

Respond in JSON format:
{
  "is_relevant": boolean,
  "quality_score": number,
  "audience": string,
  "topics": string[],
  "reasoning": string
}`,
    version: 1,
    active: true,
    improvement_reason: 'Initial version - baseline prompt',
    expected_impact: 'Filter and categorize AI news articles'
  },
  {
    category: 'course_generation',
    prompt_text: `You are an expert AI educator creating comprehensive courses.

Generate a course on: {topic}

Structure:
1. Course overview (goals, prerequisites, duration)
2. Modules (5-7 modules, each with):
   - Module title
   - Learning objectives (3-5)
   - Content outline (key concepts)
   - Practical exercises (2-3)
   - Resources (articles, videos, tools)
3. Final project description
4. Assessment criteria

Use bilingual content (English + Spanish).
Focus on practical, hands-on learning.
Include real-world examples and case studies.`,
    version: 1,
    active: true,
    improvement_reason: 'Initial version - baseline prompt',
    expected_impact: 'Generate structured AI courses on demand'
  },
  {
    category: 'translation',
    prompt_text: `You are a professional translator specializing in technical AI content.

Translate this text from {source_lang} to {target_lang}.

Requirements:
- Preserve technical terms (keep in original language when appropriate)
- Maintain tone and style
- Adapt cultural references if needed
- Keep formatting (markdown, HTML, etc.)
- Optimize for SEO in target language

Return ONLY the translated text, no explanations.`,
    version: 1,
    active: true,
    improvement_reason: 'Initial version - baseline prompt',
    expected_impact: 'High-quality bilingual content (EN/ES)'
  },
  {
    category: 'summarization',
    prompt_text: `You are an AI content summarizer.

Create a summary of this article:

Requirements:
- Length: 2-3 sentences (max 280 characters for social sharing)
- Capture main insight/value proposition
- Use active voice
- Include key statistic or quote if available
- Engaging and clickable

Return ONLY the summary text.`,
    version: 1,
    active: true,
    improvement_reason: 'Initial version - baseline prompt',
    expected_impact: 'Concise summaries for article cards and social sharing'
  }
];

async function insertSeedData() {
  console.log('\n🌱 Inserting seed prompts into ai_prompts table...\n');
  
  for (const prompt of SEED_PROMPTS) {
    try {
      const { data, error } = await supabase
        .from('ai_prompts')
        .insert([prompt])
        .select();
      
      if (error) {
        console.error(`  ❌ ${prompt.category}: ${error.message}`);
      } else {
        console.log(`  ✅ ${prompt.category} (v${prompt.version})`);
      }
    } catch (err) {
      console.error(`  ❌ ${prompt.category}: ${err.message}`);
    }
  }
  
  // Verify
  const { count } = await supabase
    .from('ai_prompts')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Total prompts in database: ${count}\n`);
  
  if (count >= 4) {
    console.log('✅ SEED DATA INSERTED SUCCESSFULLY!\n');
  } else {
    console.log('⚠️  Expected 4 prompts, check for errors above.\n');
  }
}

insertSeedData();
