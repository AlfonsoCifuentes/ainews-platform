# AI Agent Instructions - AINews Platform

## Project Overview

This is a **bilingual AI-powered news and learning platform** focused on Artificial Intelligence content. The platform combines automated news curation, AI-generated courses, and self-improving autonomous agents.

**Core Philosophy**: Build with $0 infrastructure cost using free tiers, mobile-first revolutionary design, and AI that learns and improves continuously.

---

## Tech Stack

### Frontend
- **Next.js 14+** (App Router) with TypeScript
- **Tailwind CSS 4.0** for styling
- **Framer Motion** for animations
- **next-intl** for i18n (English/Spanish)
- **Radix UI** for accessible components

### Backend
- **Next.js API Routes** (serverless)
- **Supabase** (PostgreSQL + Auth + Storage)
- **tRPC** for type-safe APIs
- **Zod** for validation

### AI/LLM
- **OpenRouter / Groq** (free tier LLM APIs)
- **Supabase pgvector** (embeddings + RAG)
- **LangChain** or custom agent framework
- **GitHub Actions** for scheduled AI tasks

---

## Critical Conventions

### File Structure
```
app/[locale]/          # All routes are i18n-wrapped
├── news/             # News module
├── courses/          # Course module
└── api/              # API routes (not in [locale])

components/
├── ui/               # shadcn components
├── news/             # News-specific components
├── courses/          # Course-specific components
└── shared/           # Reusable components

lib/
├── ai/               # AI agent framework
├── db/               # Database queries
└── utils/            # Utilities (i18n, seo, etc.)
```

### Naming Conventions
- **Components**: PascalCase (e.g., `ArticleCard.tsx`)
- **Utilities**: camelCase (e.g., `getTranslatedContent.ts`)
- **Types**: PascalCase with `I` prefix for interfaces (e.g., `IArticle`)
- **Database tables**: snake_case (e.g., `news_articles`)

### TypeScript Rules
- **NO `any` types** - use `unknown` or proper types
- **Strict mode enabled** - all config options on
- **Zod schemas** for all API inputs/outputs
- **Type imports** with `import type` when possible

---

## Internationalization (i18n)

### Dual Content Strategy
All user-facing content exists in **both English and Spanish**:

**Database**: Dual columns (`title_en`, `title_es`, `content_en`, `content_es`)

**Helper pattern**:
```typescript
// lib/utils/i18n.ts
export function getLocalizedField<T>(
  obj: T, 
  field: keyof T, 
  locale: 'en' | 'es'
): string {
  return obj[`${String(field)}_${locale}`];
}

// Usage
const title = getLocalizedField(article, 'title', locale);
```

**Translation keys**: Use `messages/en.json` and `messages/es.json` for UI strings

**SEO**: Always generate `alternates.languages` for both locales

---

## AI Agent System

### Architecture
The platform has **autonomous AI agents** that run on schedule (GitHub Actions):

1. **News Curator Agent** (`lib/ai/news-curator.ts`)
   - Scrapes RSS feeds every 6 hours
   - Filters with LLM (relevance + quality)
   - Translates EN ↔ ES
   - Generates embeddings
   - Stores in Supabase

2. **Course Generator Agent** (`lib/ai/course-generator.ts`)
   - Generates courses on-demand (user request)
   - Uses RAG for context
   - Creates structured curriculum
   - Generates quizzes and resources

3. **Learning Agent** (`lib/ai/learning-agent.ts`)
   - Analyzes user feedback daily
   - Updates prompt templates
   - Logs improvements
   - Self-optimizes strategies

### Agent Implementation Pattern
```typescript
// lib/ai/agent-framework.ts
export abstract class AIAgent {
  protected llm: LLMClient;
  protected db: SupabaseClient;
  
  abstract execute(): Promise<void>;
  
  async logPerformance(metrics: Metrics) {
    await this.db.from('ai_system_logs').insert(metrics);
  }
}

// Usage
class NewsAgent extends AIAgent {
  async execute() {
    const articles = await this.fetchFeeds();
    const filtered = await this.llm.filter(articles);
    const translated = await this.translate(filtered);
    await this.store(translated);
    await this.logPerformance({...});
  }
}
```

### LLM Client Pattern
```typescript
// lib/ai/models/llm-client.ts
export class LLMClient {
  constructor(
    private apiKey: string,
    private baseUrl: string,
    private model: string
  ) {}
  
  async generate(prompt: string, options?: GenerateOptions) {
    // Unified interface for any LLM provider
  }
  
  async classify(text: string, schema: ZodSchema) {
    // Structured output with Zod validation
  }
}
```

---

## Database Patterns

### Key Tables
- `news_articles` - Dual language columns + embeddings reference
- `courses` - Generated courses + metadata
- `course_modules` - Nested content (dual language)
- `user_progress` - Tracking + gamification
- `ai_system_logs` - All AI operations logged
- `ai_feedback` - User feedback for learning agent

### Embeddings + RAG
```typescript
// lib/ai/embeddings.ts
export async function generateEmbedding(text: string): Promise<number[]> {
  // Using Supabase pgvector
  const { data } = await supabase.rpc('generate_embedding', { 
    input: text 
  });
  return data;
}

export async function similaritySearch(
  query: string, 
  limit: number = 10
): Promise<Content[]> {
  const embedding = await generateEmbedding(query);
  const { data } = await supabase.rpc('match_documents', {
    query_embedding: embedding,
    match_threshold: 0.78,
    match_count: limit
  });
  return data;
}
```

---

## Design System Rules

### Mobile-First Approach
**Always design/code mobile first**, then scale up:
```tsx
// ✅ Correct
<div className="flex flex-col md:flex-row gap-4 md:gap-8">

// ❌ Wrong
<div className="flex flex-row gap-8 max-md:flex-col max-md:gap-4">
```

### Revolutionary UI Patterns
- **Bento Grid Layouts** - Use `grid grid-cols-[auto_1fr]` patterns
- **Glassmorphism** - `backdrop-blur-xl bg-white/10` with border
- **3D Tilt Effects** - Framer Motion with `perspective` and `rotateX/Y`
- **Micro-interactions** - Every hover/click has feedback
- **Smooth Animations** - Use `transition-all duration-300 ease-out`

### Component Example
```tsx
// components/news/ArticleCard.tsx
export function ArticleCard({ article, locale }: Props) {
  return (
    <motion.article
      whileHover={{ scale: 1.02, rotateX: 2, rotateY: 2 }}
      className="group relative overflow-hidden rounded-3xl 
                 backdrop-blur-xl bg-white/10 border border-white/20
                 transition-all duration-300 hover:shadow-2xl"
    >
      <Image 
        src={article.image_url} 
        alt={getLocalizedField(article, 'title', locale)}
        className="w-full aspect-video object-cover"
      />
      <div className="p-6">
        <h3 className="text-2xl font-bold mb-2 group-hover:text-primary">
          {getLocalizedField(article, 'title', locale)}
        </h3>
        <p className="text-muted-foreground line-clamp-3">
          {getLocalizedField(article, 'summary', locale)}
        </p>
      </div>
    </motion.article>
  );
}
```

---

## API Routes

### Pattern
```typescript
// app/api/news/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const QuerySchema = z.object({
  locale: z.enum(['en', 'es']),
  category: z.string().optional(),
  limit: z.number().min(1).max(50).default(10)
});

export async function GET(req: NextRequest) {
  try {
    const params = QuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );
    
    const articles = await getArticles(params);
    return NextResponse.json({ data: articles });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors }, 
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
```

---

## Environment Variables

Required in `.env.local` (NEVER commit):
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LLM APIs (use free tiers)
OPENROUTER_API_KEY=
GROQ_API_KEY=

# Analytics (optional)
NEXT_PUBLIC_UMAMI_URL=
NEXT_PUBLIC_UMAMI_SITE_ID=
```

---

## Performance Rules

### Image Optimization
```tsx
// Always use Next.js Image with priority for above-fold
import Image from 'next/image';

<Image
  src={article.image_url}
  alt={title}
  width={800}
  height={450}
  priority={isAboveFold}
  placeholder="blur"
  blurDataURL={article.blur_data_url}
/>
```

### Dynamic Imports
```tsx
// Lazy load heavy components
const CourseGenerator = dynamic(
  () => import('@/components/courses/CourseGenerator'),
  { loading: () => <Skeleton />, ssr: false }
);
```

### Bundle Size
- Use `next/bundle-analyzer` to monitor
- Tree-shake unused code
- Code-split by route (automatic with App Router)
- Target: <150KB initial JS bundle

---

## Testing Strategy

### Critical Paths to Test
1. **News curation workflow** (E2E with Playwright)
2. **Course generation** (unit + integration)
3. **i18n rendering** (both locales)
4. **AI agent execution** (mocked LLM responses)

### Test Example
```typescript
// tests/e2e/news-curation.spec.ts
test('should curate and display news in both languages', async ({ page }) => {
  // Trigger curation (mock or real)
  await page.goto('/en/news');
  await expect(page.locator('article').first()).toBeVisible();
  
  // Switch to Spanish
  await page.click('[data-testid="language-switcher"]');
  await page.click('[data-lang="es"]');
  await expect(page.url()).toContain('/es/news');
  await expect(page.locator('article').first()).toBeVisible();
});
```

---

## Key Files Reference

### Core Configuration
- `next.config.js` - Next.js config + i18n setup
- `tailwind.config.ts` - Design system tokens
- `tsconfig.json` - Strict TypeScript rules
- `package.json` - Scripts for AI tasks

### Critical Components
- `app/[locale]/layout.tsx` - Root layout with i18n provider
- `components/layout/Header.tsx` - Navigation + language switcher
- `lib/ai/news-curator.ts` - Main news AI agent
- `lib/db/supabase.ts` - Database client singleton

### Automation
- `.github/workflows/ai-curation.yml` - Scheduled news curation
- `scripts/curate-news.ts` - Runnable curation script

---

## Common Tasks

### Adding a New AI Agent
1. Create agent class in `lib/ai/[agent-name].ts` extending `AIAgent`
2. Implement `execute()` method
3. Add logging to `ai_system_logs` table
4. Create GitHub Action workflow if scheduled
5. Add admin dashboard view for monitoring

### Adding a New Page
1. Create `app/[locale]/[page]/page.tsx`
2. Add metadata export for SEO
3. Add translation keys to `messages/{en,es}.json`
4. Update navigation in `components/layout/Header.tsx`
5. Test both locales

### Updating Database Schema
1. Create migration SQL in Supabase dashboard
2. Update `lib/db/schema.ts` types
3. Update Zod schemas in `lib/types/`
4. Update queries in `lib/db/queries.ts`
5. Test with seed data

---

## Deployment Checklist

- [ ] All environment variables set in Vercel
- [ ] Supabase production database configured
- [ ] LLM API keys working (test with low limits)
- [ ] GitHub Actions secrets configured
- [ ] Analytics installed and tracking
- [ ] Both locales (`/en`, `/es`) rendering correctly
- [ ] SEO meta tags + sitemap generated
- [ ] Lighthouse score >90 on mobile
- [ ] Error tracking (Sentry) active

---

## Resources

- **Master Plan**: See `PROJECT_MASTER.md` for full architecture
- **Design Inspiration**: Check Awwwards, Dribbble for latest trends
- **AI Sources**: RSS feeds list in `lib/ai/news-sources.ts`

---

**Remember**: This platform is **100% free to build and run**. Every decision should optimize for the free tier limits while maintaining world-class UX.
