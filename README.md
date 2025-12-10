<div align="center">

# 🤖 ThotNet Core

### *The Ultimate AI News & Learning Hub*

[![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

**[Live Demo](https://thotnet-core.vercel.app)** • **[Documentation](#-documentation)** • **[Contributing](#-contributing)**

*La nueva central bilingüe de noticias y aprendizaje de IA: curación autónoma, cursos tipo libro y gamificación puntera sobre un stack $0.*

</div>

---

## ✨ Features

### 🗞️ **Intelligent News Curation**
- **50+ Premium Sources** — Automated aggregation from top AI publications
- **AI-Powered Filtering** — LLM-based relevance scoring and quality assessment
- **Dual Language** — Complete English/Spanish content with automatic translation
- **Real-time Updates** — Scheduled curation every 6 hours via GitHub Actions

### 🎓 **AI Course Generator**
- **On-Demand Courses** — Generate structured curricula on any AI topic instantly
- **RAG-Enhanced** — Context-aware content using pgvector embeddings
- **Interactive Quizzes** — Automated assessment generation
- **Progress Tracking** — Gamified learning experience with XP rewards

### 🧠 **Knowledge Graph**
- **Entity Recognition** — Automatic extraction of people, companies, concepts
- **Relationship Mapping** — Visual exploration of AI ecosystem connections
- **Fact-Checking** — Multi-source validation with confidence scoring
- **Citations** — Full source attribution with timestamps and quotes

### 🎮 **Gamification System**
- **16 Achievement Badges** — Learning, streak, engagement, and mastery categories
- **XP & Leveling** — Exponential progression system (1.15x multiplier)
- **Leaderboards** — Real-time ranking with materialized views
- **Daily Streaks** — Consistency rewards with longest streak tracking

### 📚 **Flashcard SRS**
- **Spaced Repetition** — SM-2 algorithm implementation
- **Due Date Scheduling** — Optimized review intervals
- **Performance Analytics** — Ease factor and repetition tracking
- **Auto-Generation** — Create flashcards from articles with AI

### 🔍 **Advanced Search**
- **Semantic Search** — pgvector similarity matching
- **Multi-Language** — Search across EN/ES content simultaneously
- **Trend Detection** — Discover emerging topics and bursty keywords
- **Global Search** — Unified search across articles, courses, and entities

### 🖼️ **Visual Similarity Detection**
- **Perceptual Hashing** — dHash algorithm for duplicate image detection
- **Hamming Distance** — Configurable similarity thresholds
- **Duplicate Prevention** — Automatic rejection of visually identical images
- **Content Quality** — Ensures diverse visual content in news feeds

### 🎨 **Revolutionary Design**
- **Mobile-First** — Optimized for all screen sizes
- **Brutalist Minimalism** — Bold typography with kinetic elements
- **3D Interactions** — Perspective transforms and tilt effects
- **Glassmorphism** — Backdrop blur with frosted glass aesthetics
- **Dark Mode** — Eye-friendly reading experience

### 🔐 **Authentication & Security**
- **Supabase Auth** — Email, OAuth providers
- **Row-Level Security** — PostgreSQL RLS policies on all tables
- **JWT Tokens** — Secure API authentication
- **Rate Limiting** — Protection against abuse

#### Secret hygiene (CI)
- Run `scripts/run-gitleaks.sh` locally or use the `Repository Secret Scan (gitleaks)` GitHub Action (push/PR/manual) to scan working tree and full history.
- If any secret is found: revoke/rotate at the provider immediately, then clean history (example helper: `scripts/remove-secrets-git-filter-repo.sh`) and force-push rewritten history; have all collaborators reclone.
- Do not commit `.env*` files—already ignored. Store deployment secrets in GitHub/Vercel secrets.

### 📊 **Analytics & Insights**
- **User Behavior** — Reading patterns and engagement metrics
- **Content Performance** — Article popularity and effectiveness
- **Learning Analytics** — Course completion and quiz scores
- **Trend Analysis** — Topic momentum and emerging themes

### 🌐 **PWA Support**
- **Offline Access** — Service worker with cache-first strategy
- **Installable** — Add to home screen on mobile devices
- **Background Sync** — Queue actions for later submission
- **Web Push** — Notifications for new content (optional)

---

## 🚀 Tech Stack

### **Frontend**
- **[Next.js 14+](https://nextjs.org/)** — React framework with App Router
- **[TypeScript 5.0+](https://www.typescriptlang.org/)** — Type-safe development
- **[Tailwind CSS 4.0](https://tailwindcss.com/)** — Utility-first styling
- **[Framer Motion](https://www.framer.com/motion/)** — Animation library
- **[next-intl](https://next-intl-docs.vercel.app/)** — Internationalization (i18n)
- **[Radix UI](https://www.radix-ui.com/)** — Accessible component primitives

### **Backend**
- **[Supabase](https://supabase.com/)** — PostgreSQL database + Auth + Storage
- **[tRPC](https://trpc.io/)** — Type-safe API routes
- **[Zod](https://zod.dev/)** — Schema validation
- **Next.js API Routes** — Serverless functions

### **AI/LLM**
- **[OpenRouter](https://openrouter.ai/)** — Multi-model LLM access
- **[Groq](https://groq.com/)** — Ultra-fast inference
- **[pgvector](https://github.com/pgvector/pgvector)** — Vector embeddings for RAG
- **[LangChain](https://www.langchain.com/)** — AI orchestration framework

### **Deployment**
- **[Vercel](https://vercel.com/)** — Zero-config Next.js hosting
- **[GitHub Actions](https://github.com/features/actions)** — CI/CD automation
- **[Cloudflare](https://www.cloudflare.com/)** — CDN and DNS

### **Monitoring**
- **[Sentry](https://sentry.io/)** — Error tracking (optional)
- **[Umami](https://umami.is/)** — Privacy-focused analytics (optional)

---

## 📁 Project Structure

```
thotnet-core/
├── app/
│   ├── [locale]/              # Internationalized routes
│   │   ├── news/             # News listing and articles
│   │   ├── courses/          # Course generator and viewer
│   │   ├── kg/               # Knowledge graph explorer
│   │   ├── flashcards/       # Flashcard reviewer (SRS)
│   │   ├── dashboard/        # User stats and gamification
│   │   ├── trending/         # Trending topics detector
│   │   └── search/           # Advanced search interface
│   ├── api/                  # API routes (serverless)
│   │   ├── news/            # News CRUD operations
│   │   ├── courses/         # Course generation
│   │   ├── kg/              # Knowledge graph queries
│   │   ├── gamification/    # XP, badges, leaderboard
│   │   └── search/          # Semantic search
│   └── globals.css          # Global styles
├── components/
│   ├── layout/              # Header, Footer, Navigation
│   ├── news/                # Article cards, filters
│   ├── courses/             # Course modules, quizzes
│   ├── kg/                  # Graph visualizer, entity forms
│   ├── dashboard/           # Stats, badges, leaderboard
│   ├── shared/              # Reusable UI components
│   └── ui/                  # shadcn/ui primitives
├── lib/
│   ├── ai/                  # AI agents and utilities
│   │   ├── news-curator.ts      # Automated news curation
│   │   ├── course-generator.ts  # Course creation agent
│   │   ├── learning-agent.ts    # Self-improvement system
│   │   ├── fact-checker.ts      # Multi-source validation
│   │   ├── trend-detector.ts    # Topic trend analysis
│   │   └── embeddings.ts        # Vector generation
│   ├── db/                  # Database queries
│   ├── auth/                # Authentication helpers
│   ├── types/               # TypeScript definitions
│   └── utils/               # Utility functions
├── supabase/
│   └── migrations/          # 11 SQL migration files
│       ├── 20250101000000_initial_schema.sql
│       ├── 20250101000005_phase5_knowledge_graph.sql
│       ├── 20250101000008_flashcards_srs.sql
│       └── 20250101000010_gamification_system.sql
├── scripts/
│   ├── curate-news.ts              # Manual curation script
│   └── weekly-digest-generator.ts  # Email digest generator
├── messages/
│   ├── en.json              # English translations
│   └── es.json              # Spanish translations
├── public/
│   └── sw.js                # Service worker (PWA)
└── tests/
    └── e2e/                 # Playwright tests
```

---

## 🛠️ Getting Started

### **Prerequisites**
- **Node.js 18+** — [Download](https://nodejs.org/)
- **npm/yarn/pnpm** — Package manager
- **Supabase Account** — [Sign up](https://supabase.com/)
- **OpenRouter/Groq API Key** — [Get free tier](https://openrouter.ai/)

### **Installation**

```bash
# Clone the repository
git clone https://github.com/AlfonsoCifuentes/thotnet-core.git
cd thotnet-core

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### **Environment Configuration**

Edit `.env.local` with your credentials:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LLM APIs (use free tiers)
OPENROUTER_API_KEY=your-openrouter-key
GROQ_API_KEY=your-groq-key

# Admin (for protected routes)
ADMIN_TOKEN=your-secure-token

# Optional: Analytics
NEXT_PUBLIC_UMAMI_URL=https://analytics.yourdomain.com
NEXT_PUBLIC_UMAMI_SITE_ID=your-site-id
```

### **Database Setup**

Execute all migrations in Supabase SQL Editor:

```bash
# See MANUAL_MIGRATION_GUIDE.md for step-by-step instructions
# Or use Supabase CLI:
supabase db push
```

### **Development**

```bash
# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

### **Build**

```bash
# Production build
npm run build

# Start production server
npm start
```

---

## 🗄️ Database Schema

### **Core Tables**
- `news_articles` — Bilingual content with embeddings
- `courses` — Generated curricula with modules
- `entities` — Knowledge graph nodes (people, companies, concepts)
- `entity_relations` — Typed relationships with evidence
- `citations` — Source attribution with confidence scores
- `flashcards` — SRS flashcards with SM-2 parameters
- `badges` — 16 achievement definitions (EN/ES)
- `user_xp` — Level progression with streak tracking
- `leaderboard` — Materialized view for performance

### **Key Features**
- **pgvector extension** — Semantic search and RAG
- **RLS policies** — Row-level security on all tables
- **Materialized views** — Optimized leaderboard queries
- **SQL functions** — `award_xp()`, `update_streak()`, `refresh_leaderboard()`
- **Triggers** — Automatic `updated_at` timestamps

---

## 🤖 AI Agents

### **News Curator Agent**
```typescript
// Runs every 6 hours via GitHub Actions
- Scrapes 50+ RSS feeds
- Filters with LLM (relevance + quality)
- Translates EN ↔ ES
- Generates embeddings
- Stores in Supabase
```

### **Course Generator Agent**
```typescript
// On-demand user requests
- Uses RAG for context
- Creates structured curriculum
- Generates quizzes
- Tracks user progress
```

### **Learning Agent**
```typescript
// Daily self-improvement
- Analyzes user feedback
- Updates prompt templates
- Logs performance metrics
- Self-optimizes strategies
```

### **Fact Checker Agent**
```typescript
// Real-time validation
- Cross-source verification
- Confidence scoring
- Citation extraction
- Bias detection
```

---

## 💰 Zero-Cost Infrastructure

This platform runs **100% free** using generous free tiers:

| Service | Free Tier | Usage |
|---------|-----------|-------|
| **Vercel** | 100 GB bandwidth/month | Hosting + Edge Functions |
| **Supabase** | 500 MB DB + 1 GB storage | PostgreSQL + Auth |
| **OpenRouter** | Rate-limited free tier | LLM inference |
| **Groq** | Free tier available | Ultra-fast inference |
| **GitHub Actions** | 2,000 minutes/month | Scheduled curation |
| **Cloudflare** | Unlimited | CDN + DDoS protection |

**Only cost**: Domain name (~$10-15/year)

---

## 📚 Documentation

- **[DEPLOYMENT_PHASE_1_COMPLETE.md](./DEPLOYMENT_PHASE_1_COMPLETE.md)** — Pre-deployment validation
- **[DEPLOYMENT_PHASE_2_GUIDE.md](./DEPLOYMENT_PHASE_2_GUIDE.md)** — Database setup
- **[MANUAL_MIGRATION_GUIDE.md](./MANUAL_MIGRATION_GUIDE.md)** — Step-by-step SQL execution
- **[PROJECT_MASTER.md](./PROJECT_MASTER.md)** — Complete architecture overview
- **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** — Feature completion tracking

---

## 🧪 Testing

```bash
# Run all tests
npm test

# E2E tests with Playwright
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## 🚢 Deployment

### **Vercel (Recommended)**

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy automatically

### **Manual**

```bash
# Build production bundle
npm run build

# Start server
npm start
```

See **[DEPLOYMENT_PHASE_2_GUIDE.md](./DEPLOYMENT_PHASE_2_GUIDE.md)** for detailed instructions.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m '✨ Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Development Guidelines**
- Follow TypeScript strict mode
- Use conventional commits
- Write tests for new features
- Update documentation
- Ensure `npm run build` succeeds

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenAI** — GPT models for content generation
- **Anthropic** — Claude for advanced reasoning
- **Supabase** — Amazing PostgreSQL platform
- **Vercel** — Best Next.js hosting experience
- **Open Source Community** — For incredible tools and libraries

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/AlfonsoCifuentes/thotnet-core?style=social)
![GitHub forks](https://img.shields.io/github/forks/AlfonsoCifuentes/thotnet-core?style=social)
![GitHub issues](https://img.shields.io/github/issues/AlfonsoCifuentes/thotnet-core)
![GitHub pull requests](https://img.shields.io/github/issues-pr/AlfonsoCifuentes/thotnet-core)

---

## 📧 Contact

**Alfonso Cifuentes** — [@AlfonsoCifuentes](https://github.com/AlfonsoCifuentes)

**Project Link**: [https://github.com/AlfonsoCifuentes/thotnet-core](https://github.com/AlfonsoCifuentes/thotnet-core)

---

<div align="center">

### ⭐ If you find this project useful, please give it a star! ⭐

**Built with ❤️ using AI-first principles**

</div>
