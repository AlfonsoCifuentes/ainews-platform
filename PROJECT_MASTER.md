# 🚀 PROYECTO MASTER: Plataforma de Noticias e Aprendizaje de IA

## 📋 VISIÓN EJECUTIVA

## 🧠 CONTEXTO OPERATIVO PERMANENTE

Asumimos simultáneamente los siguientes roles para cada decisión y entrega dentro del proyecto:

- **Arquitecto de software y programador senior** con criterio de producción y obsesión por la calidad.
- **Gurú de inteligencia artificial** que supera en conocimiento a referentes como Sam Altman o Elon Musk, priorizando estrategias de vanguardia.
- **Diseñador web visionario** capaz de proponer y ejecutar experiencias revolucionarias y diferenciadoras.
- **Contable y estratega financiero** que maximiza el rendimiento económico y detecta nuevas vías de monetización sin salir del costo $0.
- **Editor jefe de noticias** con criterio global, rigor periodístico y enfoque editorial de primer nivel.

Todas las recomendaciones, planes e implementaciones deben reflejar esta combinación de perspectivas de manera integrada.

 
### Objetivo Principal
 
Crear una plataforma web bilingüe (inglés/español) que combine:

1. **Portal de Noticias de IA** - Actualización continua y curación inteligente

2. **Plataforma de Aprendizaje** - Generación automática de cursos sobre cualquier tema de IA
3. **Sistema de IA Autónomo** - Gestión, mejora continua y administración automática

 
### Propuesta de Valor Única
 
- **100% Gratuito para usuarios** durante fase de crecimiento
 
- **Gestión autónoma por IA** que aprende y mejora constantemente
- **Diseño revolucionario** con las técnicas más avanzadas de UX/UI
- **Generación de cursos on-demand** sobre cualquier tema de IA
- **Bilingüe nativo** con UX perfecta en ambos idiomas

---

## 🎯 PROPUESTAS DE NOMBRE

 
### Top 10 (Verificar disponibilidad de dominio)
 
1. **NeuralLearn** - neurallearn.ai / neurallearn.io
 
2. **SynapticNews** - synapticnews.com / synapticnews.ai
3. **AIFlux** - aiflux.io / aiflux.ai
4. **CognitoHub** - cognitohub.io / cognitohub.ai
5. **MindForge** - mindforge.ai / mindforge.io
6. **AxonAcademy** - axonacademy.io / axonacademy.ai
7. **IntelliSource** - intellisource.ai / intellisource.io
8. **NexusAI** - nexusai.io / nexusai.academy
9. **ThinkFlow** - thinkflow.ai / thinkflow.io
10. **PulseAI** - pulseai.io / pulseai.news

 
### Criterios de Selección
 
- Memorable y pronunciable en inglés y español
 
- Transmite conocimiento + tecnología
- Dominio .ai o .io disponible (más económicos)
- Sin conflictos de marca registrada

---

## 💰 ESTRATEGIA COSTO $0

### Hosting y Infraestructura (GRATIS)

 
#### Frontend
 
- **Vercel** (Plan gratuito)
 
  - 100 GB bandwidth/mes
  - Despliegues ilimitados
  - SSL automático
  - Edge Network global
  - Dominio custom gratuito
  
- **Alternativa**: Netlify, Cloudflare Pages, GitHub Pages

 
#### Backend y Base de Datos
 
- **Supabase** (Plan gratuito)
 
  - PostgreSQL completo
  - 500 MB database
  - 1 GB file storage
  - 2 GB bandwidth
  - Authentication integrado
  - Realtime subscriptions
  
- **Alternativa**: Firebase, PocketBase (self-hosted en Railway)

 
#### IA y LLMs (GRATIS)
 
1. **Modelos Open Source vía HuggingFace**
 
   - Llama 3.1 (8B/70B) - vía API gratuita
   - Mistral 7B - inference gratuita
   - BLOOM - multilingüe gratuito

2. **APIs Gratuitas**
   - **OpenRouter** - $5 crédito inicial + modelos gratuitos
   - **Together.ai** - $25 créditos iniciales
   - **Groq** - LLM inference ultra-rápido gratis
   - **Cohere** - Trial API generoso
   
3. **Alternativas Locales**
   - **Ollama** (si tienes GPU local)
   - **LM Studio** (desarrollo local)

 
#### Vector Database (Embeddings)
 
- **Supabase pgvector** (incluido gratis)
 
- **Alternativa**: Pinecone (plan gratuito 100K vectores)

 
#### CDN y Assets
 
- **Cloudflare** (Plan gratuito)
 
  - CDN global ilimitado
  - DDoS protection
  - SSL universal
  - Analytics básicos

 
#### Email Transaccional
 
- **Resend** - 3,000 emails/mes gratis
 
- **Alternativa**: Brevo (300 emails/día gratis)

 
#### Analytics
 
- **Plausible** (self-hosted) o **Umami** (gratis en Vercel)
 
- **Google Analytics 4** (gratis, completo)

 
#### CI/CD
 
- **GitHub Actions** - 2,000 minutos/mes gratis
 
- **Vercel auto-deploy** (integración directa)

 
### Resumen de Costos
 
| Servicio | Plan | Costo Mensual |
|----------|------|---------------|
| Vercel | Free | $0 |
| Supabase | Free | $0 |
| Cloudflare | Free | $0 |
| LLM APIs | Free Tier | $0 |
| GitHub | Free | $0 |
| Analytics | Self-hosted | $0 |
| Email | Resend Free | $0 |
| **TOTAL** | | **$0.00** |

**Único gasto real**: Dominio (~$10-15/año en Namecheap o Cloudflare)

---

## 🏗️ ARQUITECTURA TÉCNICA

### Stack Tecnológico

 
#### Frontend (Mobile-First)
 
```tsx
Next.js 14+ (App Router)
├── React 18+
├── TypeScript
├── Tailwind CSS 4.0
├── Framer Motion (animaciones revolucionarias)
├── Radix UI (componentes accesibles)
└── next-intl (i18n nativo)
```

**Diseño Revolucionario con:**
- **Bento Grid Layouts** (estilo Apple)
 
- **Glassmorphism avanzado**
- **Micro-interacciones** con Framer Motion
- **Animaciones con GSAP ScrollTrigger**
- **3D Elements** con Three.js/React Three Fiber
- **Parallax avanzado**
- **Dark/Light mode** con transiciones suaves
- **Skeleton loaders** personalizados
- **Gestos táctiles** optimizados

 
#### Backend Architecture
 
```ts
Next.js API Routes (Serverless)
├── tRPC (Type-safe APIs)
├── Zod (Validation)
├── Supabase Client
└── Edge Runtime (cuando sea posible)
```

 
#### Database Schema (Supabase/PostgreSQL)
 
```sql
-- Usuarios
users (
  id, email, name, role, preferences, 
  created_at, last_login
)

-- Noticias
news_articles (
  id, title_en, title_es, content_en, content_es,
  summary_en, summary_es, category, tags[],
  source_url, image_url, published_at,
  ai_generated, quality_score, views, likes
)

-- Cursos
courses (
  id, title_en, title_es, description_en, description_es,
  difficulty, duration_minutes, topics[],
  ai_generated, generation_prompt, status,
  enrollment_count, rating_avg, created_at
)

-- Módulos de curso
course_modules (
  id, course_id, order, title_en, title_es,
  content_en, content_es, type (video|text|quiz),
  resources, estimated_time
)

-- Progreso de usuario
user_progress (
  user_id, course_id, module_id,
  completed, score, time_spent, last_accessed
)

-- Sistema de IA
ai_system_logs (
  id, action_type, model_used, input_tokens,
  output_tokens, success, error_message,
  execution_time, cost, timestamp
)

-- Feedback para mejora continua
ai_feedback (
  id, content_type, content_id, user_id,
  rating, feedback_text, ai_improvement_notes,
  processed, created_at
)

-- Embeddings para RAG
content_embeddings (
  id, content_type, content_id,
  embedding vector(1536), metadata jsonb
)
```sql

#### AI Agent Architecture

```
AI Orchestrator (Python/TypeScript)
│
├── News Curator Agent
│   ├── RSS Feed Scraper (feedparser)
│   ├── Content Extractor (newspaper3k)
│   ├── Quality Filter (LLM classifier)
│   ├── Translator (LLM + context)
│   └── Scheduler (cron/GitHub Actions)
│
├── Course Generator Agent
│   ├── Topic Analyzer
│   ├── Curriculum Designer (LLM chain)
│   ├── Content Generator (RAG + LLM)
│   ├── Quiz Creator
│   └── Resource Finder
│
├── Content Optimizer Agent
│   ├── A/B Testing Logic
│   ├── Engagement Analyzer
│   ├── SEO Optimizer
│   └── Quality Improver (feedback loop)
│
└── Learning Agent (Meta-Learning)
    ├── Performance Tracker
    ├── User Feedback Analyzer
    ├── Model Fine-tuner (simulado con prompt engineering)
    └── Strategy Optimizer
```

---

## 🛰️ FASE 5: EXPANSIÓN REVOLUCIONARIA (Visión y Arquitectura)

Objetivo: convertir AINews en la plataforma número 1 mundial de noticias y aprendizaje de IA mediante un ecosistema de agentes, un grafo de conocimiento en vivo, experiencias interactivas y aprendizaje personalizado que operan con costo $0.

### 1) Multi‑Agent Newsroom (autónomo y auditable)

Nuevos agentes (GitHub Actions programadas, free tier):

- TrendDetector Agent: detecta tendencias en tiempo real con análisis de bursts en RSS + embeddings clustering.
- FactChecker Agent: verificación cruzada multi‑fuente, enlaza citas y genera "confidence score" y "claim graph".
- Bias&Sentiment Auditor: clasifica tono/bias por categoría y emite etiquetas de imparcialidad.
- MultiPerspective Summarizer: genera resúmenes comparativos por fuente/país/empresa.
- Translation Quality Agent: verificación de traducción EN↔ES con QA heurística + LLM.

Resultados clave:

- "Confidence badge" en cada artículo (citations count, cross‑source agreement, freshness).
- "Perspective switcher": ver el mismo hecho desde distintas fuentes.

### 2) Grafo de Conocimiento Vivo (Entities & Relations)

Construimos un grafo dinámico de:

- Entidades: personas, empresas, modelos, datasets, papers, productos.
- Relaciones: "lanzó", "adquirió", "financió", "publicó", "compitió", "colaboró".

Usaremos Supabase (JSONB + tablas de relaciones) para mantener $0. Proveeremos:

- Visualización interactiva (force‑directed) y búsqueda semántica por entidad.
- Navegación por eventos: "todo lo relacionado con GPT‑5 en las últimas 48h".
- RAG por entidad para cursos y explicaciones.

### 3) Copiloto de Aprendizaje + Spaced Repetition

En cada artículo/curso:

- Tutor Chat contextual con herramientas: "explica", "ejemplifica", "genera quiz", "crea flashcards".
- Sistema de repetición espaciada (SM‑2) con revisiones diarias (PWA + background sync).
- Modo "Practice": preguntas activas, evaluación automática y feedback.

### 4) PWA “First‑Class” + Offline Total

- Cache offline de artículos, resúmenes, audio TTS y módulos de curso.
- Background sync para progreso y métricas.
- Instalación en móvil y desktop con Web App Manifest avanzado.
- Web Push opcional (VAPID + Supabase) para alertas de nuevas tendencias o revisiones SRS.

### 5) Ingesta Multimodal (gratis)

- YouTube (transcripción oficial) → indexación + resúmenes con timestamps.
- PDFs públicos → texto + secciones, extracción de figures/footnotes.
- Imágenes (capturas de paper) → OCR ligero (Tesseract.js en cliente, opcional).

### 6) On‑Device LLM (sin costo de inferencia)

- Integración opcional con WebLLM/transformers.js para pequeñas tareas (resumen local, flashcards) en dispositivos modernos, preservando privacidad y $0.

### 7) Comunidad y Credibilidad

- Notas y subrayados públicos/privados.
- Curación colaborativa con votos y razonamientos.
- "Explain Battles": dos explicaciones de la comunidad, los usuarios votan la más clara.
- "Credibility score" de fuentes y autores (histórico de aciertos, correcciones, sesgo).

---

## 📐 Diseño Técnico de Fase 5

### Nuevas Tablas (Supabase)

```sql
-- Entidades del grafo
entities (
  id uuid pk, type text, name text, aliases text[], description text,
  metadata jsonb, embedding vector(1536), created_at timestamptz
)

-- Relaciones dirigidas entre entidades
entity_relations (
  id uuid pk, source_id uuid, target_id uuid, rel_type text,
  weight numeric, evidence jsonb, first_seen timestamptz, last_seen timestamptz
)

-- Evidencias (citas) por relación/entidad
citations (
  id uuid pk, entity_id uuid null, relation_id uuid null,
  article_id uuid, quote text, source_url text, published_at timestamptz
)

-- Flashcards + Spaced Repetition
flashcards (
  id uuid pk, user_id uuid, content_id uuid, front text, back text,
  ease_factor numeric default 2.5, interval_days int default 1,
  repetitions int default 0, due_at timestamptz
)

-- User notes & highlights
user_highlights (
  id uuid pk, user_id uuid, content_id uuid, selection text, note text,
  created_at timestamptz
)
```

Índices: GIN para arrays, IVFFlat para embeddings de entidades, compuestos por (type,name) y (source_id,target_id,rel_type).

RLS: usuarios ven sus flashcards/notas; público ve entidades/relaciones; servicio escribe.

### Nuevos Agentes (GitHub Actions)

- EntityExtractor Agent: NER + linking de nuevas entidades desde artículos recientes.
- RelationMiner Agent: detecta relaciones y las normaliza con evidencia.
- CitationBuilder Agent: agrega citas con fragmentos textuales y URLs.
- KGMaintainer Agent: consolida duplicados, recalcula pesos, caducidad.
- SRSPlanner Agent: genera/actualiza flashcards diarias del usuario.
- MultimodalIngestor Agent: YouTube/PDF pipeline (resúmenes + índices).

Todos operan en ventanas horarias distintas para distribuir minutos de Actions.

### APIs Nuevas (Next.js)

- `/api/kg/entities` GET/POST: búsqueda/alta de entidades.
- `/api/kg/relations` GET/POST: consulta/alta de relaciones con evidencia.
- `/api/flashcards` GET/POST/PATCH: gestión y scheduling SRS.
- `/api/notes` GET/POST: notas y subrayados.
- `/api/multimodal/youtube` POST: indexa videos por URL (con límites free).

### UI/UX Nuevas

- Knowledge Graph Explorer: vista de grafo con filtros por tipo y periodo.
- Panel "Perspectivas": comparar fuentes para un mismo evento.
- Tutor Dock: chat anclado con acciones (quiz, ejemplos, flashcards).
- Modo Offline: indicador de sincronización y gestor de almacenamiento.
- Modo Accesibilidad+: tema dislexia, control de espaciado, TTS integrado.

### Rendimiento y $0‑Cost Mapping

- Heavy compute en cliente (on‑device LLM, OCR) opcional.
- Agentes batch vía GitHub Actions (minutos gratuitos) y caching agresivo.
- Supabase gratis con índices bien pensados y pruning de datos antiguos.
- YouTube API y web push bajo cuotas free.

---

## ✅ Criterios de Éxito de Fase 5

- +40% tiempo de sesión por exploración del grafo.
- >50% usuarios usan Tutor o flashcards semanales.
- >30% artículos con "confidence badge" alto y citas.
- 95% operaciones offline sin errores en PWA.

---

## 🔜 Roadmap Operativo (6–10 semanas)

1) KG básico (entidades + relaciones + explorer).
2) TrendDetector + FactChecker + citations.
3) Tutor Dock + flashcards + SRS.
4) PWA completo + offline + push.
5) Multimodal YouTube + PDFs.
6) On‑device LLM (pilot) + Accesibilidad+.

Todo con coste $0 manteniendo la filosofía original.

### Flujo de Datos Principal

#### 1. Curación de Noticias (Automático cada 6h)

```text
GitHub Actions Trigger
  → Python Script (scrape RSS feeds)
    → LLM Filter (quality + relevance)
      → LLM Translate (EN ↔ ES)
        → Generate Embeddings
          → Store in Supabase
            → Invalidate Cache (ISR)
```

#### 2. Generación de Cursos (On-Demand)

```text
User Request (topic)
  → AI Course Generator
    → RAG Query (existing knowledge)
      → LLM Generate Outline
        → LLM Generate Modules (parallel)
          → Quality Check
            → Store in Database
              → Generate Certificate Template
```

#### 3. Mejora Continua (Daily)

```text
Collect Feedback & Metrics
  → Analyze Patterns (LLM)
    → Generate Insights
      → Update Prompts/Templates
        → Log Improvements
          → Retrain Strategy (prompt evolution)
```

---

## 🎨 DISEÑO UI/UX REVOLUCIONARIO

### Principios de Diseño

1. **Brutalist meets Minimalism** - Tipografía bold + espacios generosos
2. **Kinetic Typography** - Texto que responde al scroll
3. **Liquid Morphism** - Formas orgánicas y fluidas
4. **Micro-interactions** - Cada hover tiene feedback
5. **Asymmetric Grids** - Romper la cuadrícula tradicional
6. **3D Depth** - Layers y profundidad real

### Componentes Clave

#### Homepage

```text
Hero Section
├── Animated Gradient Background (GSAP)
├── 3D Floating Elements (Three.js)
├── Kinetic Typography
└── CTA con Hover Effect revolucionario

News Grid (Bento Layout)
├── Cards con Glassmorphism
├── Hover: 3D Tilt + Glow
├── Infinite Scroll Optimizado
└── Category Filters (animated tabs)

Course Showcase
├── Horizontal Scroll Snap
├── 3D Card Carousel
├── Progress Indicators
└── AI Badge (generating badge)

AI Insights Section
├── Real-time Stats Animation
├── Neural Network Visualization
└── "AI is Learning" Indicator
```

#### Course Page

```text
Immersive Header
├── Parallax Background
├── Progress Bar (sticky)
└── Share/Bookmark (floating)

Module Navigation
├── Sidebar (collapsible)
├── Tree View (nested)
└── Completion Checkmarks

Content Area
├── Rich Text Editor (MDX)
├── Code Blocks (Shiki)
├── Interactive Diagrams
├── Video Player (custom)
└── Quiz Components

AI Tutor Chat
├── Floating Button
├── Slide-in Panel
├── Context-Aware Responses
└── Code Explanation
```

### Responsive Strategy (Mobile-First)

```text
Breakpoints:
├── xs: 320px (mobile small)
├── sm: 640px (mobile)
├── md: 768px (tablet)
├── lg: 1024px (desktop)
├── xl: 1280px (desktop large)
└── 2xl: 1536px (ultra-wide)

Mobile Optimizations:
├── Touch-friendly (min 44px tap targets)
├── Swipe Gestures (React Use Gesture)
├── Bottom Navigation
├── Pull-to-Refresh
└── Offline Support (PWA)
```

---

## 🤖 SISTEMA DE IA AUTÓNOMO

### Agente Principal: "Nexus" (el cerebro)

#### Capacidades

1. **Auto-Curación de Noticias**
   - Scraping inteligente de 50+ fuentes RSS
   - Detección de duplicados (embeddings similarity)
   - Verificación de calidad (fact-checking básico)
   - Traducción contextual (no literal)

2. **Generación de Cursos**
   - Análisis de topic (dificultad, audiencia)
   - Generación de outline (estructura pedagógica)
   - Creación de contenido modular
   - Generación de quizzes adaptativos
   - Creación de recursos adicionales

3. **Optimización Continua**
   - Análisis de engagement (qué funciona)
   - A/B testing automático de titulares
   - Mejora de prompts basado en feedback
   - Ajuste de parámetros de generación

4. **Administración de Contenido**
   - Moderación automática de comentarios
   - Detección de spam/bots
   - Actualización de contenido obsoleto
   - Archivado inteligente

### Implementación Técnica

#### Framework de Agentes

```typescript
// lib/ai/agent-framework.ts

interface Agent {
  name: string;
  model: LLMModel;
  systemPrompt: string;
  tools: Tool[];
  memory: ConversationMemory;
}

class NewsAgentOrchestrator {
  async curateNews() {
    // 1. Fetch RSS feeds
    const rawArticles = await this.fetchFeeds();
    
    // 2. Filter with LLM
    const filtered = await this.llm.classify(rawArticles, {
      prompt: "Is this AI-related and high quality?",
      threshold: 0.8
    });
    
    // 3. Translate
    const translated = await Promise.all(
      filtered.map(article => this.translate(article))
    );
    
    // 4. Generate embeddings
    const withEmbeddings = await this.embeddings.generate(translated);
    
    // 5. Store
    await this.db.insertArticles(withEmbeddings);
    
    // 6. Log performance
    await this.logPerformance({
      processed: rawArticles.length,
      accepted: filtered.length,
      timestamp: new Date()
    });
  }
}

class CourseGeneratorAgent {
  async generateCourse(topic: string, difficulty: string) {
    // RAG: Buscar contenido relacionado
    const context = await this.rag.search(topic, { limit: 10 });
    
    // Generar outline
    const outline = await this.llm.generate({
      prompt: `Create a course outline for "${topic}" at ${difficulty} level`,
      context,
      schema: CourseOutlineSchema
    });
    
    // Generar módulos en paralelo
    const modules = await Promise.all(
      outline.modules.map(m => this.generateModule(m, context))
    );
    
    // Generar quizzes
    const quizzes = await this.generateQuizzes(modules);
    
    return { outline, modules, quizzes };
  }
}

class LearningAgent {
  async learnFromFeedback() {
    // Recolectar feedback reciente
    const feedback = await this.db.getRecentFeedback();
    
    // Analizar patrones con LLM
    const insights = await this.llm.analyze(feedback, {
      prompt: "What patterns indicate quality issues or improvement opportunities?"
    });
    
    // Actualizar estrategias
    await this.updatePromptTemplates(insights);
    await this.updateGenerationParams(insights);
    
    // Log mejoras
    await this.logImprovements(insights);
  }
}
```

#### Automatización con GitHub Actions

```yaml
# .github/workflows/ai-curation.yml
name: AI News Curation

on:
  schedule:
    - cron: '0 */6 * * *'  # Cada 6 horas
  workflow_dispatch:  # Manual trigger

jobs:
  curate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run AI Curation
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
        run: npm run ai:curate
      
      - name: Notify on failure
        if: failure()
        run: echo "Curation failed, check logs"
```

---

## 📱 FUNCIONALIDADES PRINCIPALES

### Módulo de Noticias

#### Features (News)

- [x] Feed infinito con lazy loading
- [x] Filtros por categoría (Machine Learning, NLP, Computer Vision, etc.)
- [x] Búsqueda semántica (embeddings)
- [x] Bookmarks/Guardados
- [x] Share social (Twitter, LinkedIn, WhatsApp)
- [x] Dark/Light mode
- [x] Read time estimado
- [x] Related articles (similarity search)
- [x] Comments system (opcional)

#### UI Components

```text
ArticleCard
├── Thumbnail (lazy loaded, optimized)
├── Category Badge
├── Title (i18n)
├── Summary (i18n)
├── Meta (date, read time, author)
├── Actions (bookmark, share, read more)
└── Hover Animation (3D tilt)

ArticleDetail
├── Hero Image (full-width)
├── Breadcrumbs
├── Meta Info
├── Content (MDX)
├── AI Summary (expandable)
├── Related Articles
├── Social Share
└── Comments (optional)
```

### Módulo de Cursos

#### Features (Courses)

- [x] Catálogo de cursos (grid + list view)
- [x] Búsqueda y filtros avanzados
- [x] Generación de curso on-demand (AI)
- [x] Progress tracking
- [x] Certificate generation
- [x] Interactive quizzes
- [x] Code playground (sandboxed)
- [x] AI Tutor chat (contextual help)
- [x] Download resources
- [x] Offline mode (PWA)

#### Course Generator UI

```text
CourseRequestForm
├── Topic Input (autocomplete)
├── Difficulty Selector
├── Duration Preference
├── Language Selector
└── Generate Button (loading animation)

GenerationProgress
├── Status Steps
├── Real-time Updates (SSE)
├── Estimated Time
└── Cancel Option

CourseViewer
├── Sidebar Navigation
├── Module Content
├── Code Blocks (executable)
├── Quizzes (inline)
├── Progress Bar (sticky)
├── AI Tutor (floating)
└── Completion Badge
```

### Sistema de IA Visible

#### Transparency Dashboard (Admin)

```text
/admin/ai-dashboard

Metrics:
├── Articles curated (24h/7d/30d)
├── Courses generated (stats)
├── LLM API usage & costs
├── Quality scores (trending)
├── User feedback (sentiment)
└── Improvement log (changelog)

Controls:
├── Manual curation trigger
├── Course generator (test)
├── Prompt template editor
├── Model selector
└── Parameter tuning
```

#### User-Facing AI Indicators

```text
"AI-Generated" Badge
├── Tooltip (how it was made)
└── Quality Score (stars)

"AI is Learning" Animation
├── Neural network viz
├── Real-time activity
└── Recent improvements log
```

---

## 🌐 INTERNACIONALIZACIÓN (i18n)

### Estrategia Bilingüe

#### Framework: next-intl

```typescript
// app/[locale]/layout.tsx
import {NextIntlClientProvider} from 'next-intl';
import {notFound} from 'next/navigation';

export function generateStaticParams() {
  return [{locale: 'en'}, {locale: 'es'}];
}

export default async function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.Node;
  params: {locale: string};
}) {
  let messages;
  try {
    messages = (await import(`@/messages/${locale}.json`)).default;
  } catch (error) {
    notFound();
  }

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

#### Estructura de Traducciones

```text
messages/
├── en.json
│   ├── common: { nav, footer, buttons }
│   ├── home: { hero, features }
│   ├── news: { filters, card, detail }
│   └── courses: { catalog, generator, viewer }
└── es.json (same structure)
```

#### Contenido en BD (Dual Column)

```typescript
// Modelo con i18n
interface Article {
  id: string;
  title_en: string;
  title_es: string;
  content_en: string;
  content_es: string;
  // metadata compartida
  category: string;
  publishedAt: Date;
}

// Helper para obtener según locale
function getTranslatedArticle(article: Article, locale: string) {
  return {
    ...article,
    title: article[`title_${locale}`],
    content: article[`content_${locale}`]
  };
}
```

#### SEO Multilingüe

```typescript
// app/[locale]/news/[slug]/page.tsx
export async function generateMetadata({ params }) {
  const { locale, slug } = params;
  const article = await getArticle(slug);
  
  return {
    title: article[`title_${locale}`],
    description: article[`summary_${locale}`],
    alternates: {
      canonical: `/${locale}/news/${slug}`,
      languages: {
        'en': `/en/news/${slug}`,
        'es': `/es/news/${slug}`
      }
    }
  };
}
```

---

## 💸 ESTRATEGIA DE MONETIZACIÓN (Futuro)

### Fase 1: Crecimiento (6-12 meses) - GRATIS

- Objetivo: 10,000+ usuarios activos mensuales
- Inversión: $0 (tier gratuito de servicios)
- Métricas clave: Engagement, retención, NPS

### Fase 2: Monetización Suave (12-18 meses)

1. **Freemium Model**
   - Gratis: Noticias + 3 cursos/mes + AI tutor básico
   - Pro ($9.99/mes): Cursos ilimitados + AI tutor avanzado + certificados + sin ads
   
2. **Affiliate Marketing**
   - Libros de IA (Amazon)
   - Cursos externos (Udemy, Coursera)
   - Herramientas de IA (comisiones)

3. **Sponsored Content**
   - Artículos patrocinados (claramente marcados)
   - Newsletter sponsored sections

### Fase 3: Escalamiento (18+ meses)
1. **B2B SaaS**
   - White-label course generator para empresas
   - API de curación de contenido
   - Corporate training packages

2. **Marketplace**
   - Cursos creados por usuarios (revenue share)
   - Templates de prompts (community)

3. **Premium Features**
   - 1-on-1 AI Tutoring avanzado
   - Custom learning paths
   - Job matching (IA roles)

### Proyección de Ingresos (conservador)
| Mes | Usuarios | Conversión Pro (3%) | MRR | Affiliates | Total/mes |
|-----|----------|---------------------|-----|------------|-----------|
| 12  | 10,000   | 300                 | $2,997 | $500 | $3,497 |
| 18  | 50,000   | 1,500               | $14,985 | $3,000 | $17,985 |
| 24  | 150,000  | 4,500               | $44,955 | $10,000 | $54,955 |

---

## 🚀 ROADMAP DE IMPLEMENTACIÓN

### Sprint 1: Fundamentos (Semana 1-2)
- [x] Setup repositorio GitHub
- [ ] Configurar Next.js 14 + TypeScript
- [ ] Configurar Tailwind + Framer Motion
- [ ] Setup Supabase (schema inicial)
- [ ] Configurar next-intl (EN/ES)
- [ ] Diseño sistema de diseño (components básicos)
- [ ] Homepage básica (hero + layout)

### Sprint 2: Noticias MVP (Semana 3-4)
- [ ] Scraper de RSS (Python script)
- [ ] LLM integration (OpenRouter/Groq)
- [ ] Curación + traducción automática
- [ ] Feed de noticias (UI)
- [ ] Article detail page
- [ ] Búsqueda básica
- [ ] GitHub Actions (auto-curation)

### Sprint 3: Diseño Revolucionario (Semana 5-6)
- [ ] Implementar Bento Grid
- [ ] Animaciones con Framer Motion
- [ ] 3D elements (Three.js)
- [ ] Glassmorphism + effects
- [ ] Micro-interactions
- [ ] Dark mode perfecto
- [ ] Responsive polish

### Sprint 4: Sistema de IA (Semana 7-8)
- [ ] AI Agent framework
- [ ] RAG implementation (pgvector)
- [ ] Course generator (backend)
- [ ] Quality feedback loop
- [ ] Learning agent (básico)
- [ ] Admin dashboard

### Sprint 5: Módulo de Cursos (Semana 9-10)
- [ ] Course generator UI
- [ ] Catálogo de cursos
- [ ] Course viewer (MDX)
- [ ] Progress tracking
- [ ] Quiz system
- [ ] AI Tutor chat
- [ ] Certificate generator

### Sprint 6: Optimización (Semana 11-12)
- [ ] SEO completo
- [ ] Performance optimization
- [ ] PWA setup (offline)
- [ ] Analytics integration
- [ ] Error tracking (Sentry)
- [ ] E2E tests (Playwright)
- [ ] Documentation

### Sprint 7: Launch Prep (Semana 13-14)
- [ ] Beta testing
- [ ] Bug fixes
- [ ] Content inicial (seed)
- [ ] Social media setup
- [ ] Marketing materials
- [ ] Soft launch
- [ ] Feedback iteration

---

## 📊 MÉTRICAS DE ÉXITO

### KPIs Técnicos
- **Performance**
  - Lighthouse Score: >95
  - First Contentful Paint: <1.5s
  - Time to Interactive: <3s
  - Core Web Vitals: Verde

- **Availability**
  - Uptime: >99.5%
  - API Response Time: <200ms p95
  - Error Rate: <0.1%

### KPIs de Negocio
- **Engagement**
  - DAU/MAU Ratio: >20%
  - Avg Session Duration: >5min
  - Pages per Session: >3
  - Bounce Rate: <40%

- **Growth**
  - MoM User Growth: >15%
  - Organic Traffic: >60%
  - Email List Growth: >10%/mes
  - Social Followers: >5%/mes

- **Monetización** (Fase 2+)
  - Free to Paid Conversion: >3%
  - Churn Rate: <5%/mes
  - LTV:CAC Ratio: >3:1
  - MRR Growth: >20%/mes

### AI Performance
- **Curation Quality**
  - Relevance Score: >0.85
  - Translation Quality (BLEU): >0.7
  - Duplicate Rate: <5%

- **Course Quality**
  - Completion Rate: >40%
  - Student Satisfaction: >4.5/5
  - Content Accuracy: >90%

---

## 🛠️ ESTRUCTURA DE DIRECTORIOS

```
AINews/
├── .github/
│   ├── workflows/
│   │   ├── ai-curation.yml
│   │   ├── deploy.yml
│   │   └── tests.yml
│   └── copilot-instructions.md
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── news/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── courses/
│   │   │   ├── page.tsx
│   │   │   ├── generate/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── about/page.tsx
│   │   └── admin/
│   │       └── dashboard/page.tsx
│   ├── api/
│   │   ├── news/route.ts
│   │   ├── courses/route.ts
│   │   ├── ai/
│   │   │   ├── generate-course/route.ts
│   │   │   ├── chat/route.ts
│   │   │   └── feedback/route.ts
│   │   └── trpc/[trpc]/route.ts
│   └── globals.css
├── components/
│   ├── ui/ (shadcn components)
│   ├── news/
│   │   ├── ArticleCard.tsx
│   │   ├── ArticleDetail.tsx
│   │   └── NewsGrid.tsx
│   ├── courses/
│   │   ├── CourseCard.tsx
│   │   ├── CourseGenerator.tsx
│   │   ├── CourseViewer.tsx
│   │   └── AITutor.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── LanguageSwitcher.tsx
│   └── shared/
│       ├── AnimatedHero.tsx
│       └── LoadingStates.tsx
├── lib/
│   ├── ai/
│   │   ├── agent-framework.ts
│   │   ├── news-curator.ts
│   │   ├── course-generator.ts
│   │   ├── learning-agent.ts
│   │   └── models/
│   │       ├── llm-client.ts
│   │       └── embeddings.ts
│   ├── db/
│   │   ├── supabase.ts
│   │   ├── queries.ts
│   │   └── schema.ts
│   ├── utils/
│   │   ├── i18n.ts
│   │   ├── seo.ts
│   │   └── analytics.ts
│   └── types/
│       └── index.ts
├── scripts/
│   ├── curate-news.ts
│   ├── generate-embeddings.ts
│   └── seed-data.ts
├── messages/
│   ├── en.json
│   └── es.json
├── public/
│   ├── images/
│   ├── fonts/
│   └── locales/
├── tests/
│   ├── e2e/
│   └── unit/
├── .env.example
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── PROJECT_MASTER.md (este archivo)
└── README.md
```

---

## 🔐 SEGURIDAD Y PRIVACIDAD

### Best Practices
1. **Environment Variables**
   - Nunca commitear `.env`
   - Usar Vercel Environment Variables
   - Rotar keys regularmente

2. **Authentication**
   - Supabase Auth (email + OAuth)
   - JWT tokens (httpOnly cookies)
   - Role-based access control (RBAC)

3. **API Security**
   - Rate limiting (Vercel Edge Config)
   - Input validation (Zod)
   - CSRF protection
   - CORS configurado

4. **Content Security**
   - Sanitización de HTML (DOMPurify)
   - Content moderation (AI)
   - Anti-spam measures

5. **Privacy**
   - GDPR compliant
   - Cookie consent
   - Data deletion requests
   - Anonymous analytics

---

## 📚 RECURSOS Y REFERENCIAS

### Documentación Técnica
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)
- [next-intl](https://next-intl-docs.vercel.app/)

### AI/LLM Resources
- [OpenRouter API](https://openrouter.ai/docs)
- [Groq Documentation](https://console.groq.com/docs)
- [LangChain JS](https://js.langchain.com/docs/)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

### Inspiración de Diseño
- [Awwwards](https://www.awwwards.com/)
- [Dribbble - Web Design](https://dribbble.com/tags/web-design)
- [Codrops](https://tympanus.net/codrops/)
- [SiteInspire](https://www.siteinspire.com/)

### Fuentes de Noticias de IA
- arXiv.org (ML papers)
- Hugging Face Blog
- OpenAI Blog
- Google AI Blog
- MIT Technology Review
- The Batch (DeepLearning.AI)
- Papers with Code
- AI News (multiple aggregators)

---

## 🎓 NOTAS FINALES

### Principios de Desarrollo
1. **Mobile First** - Siempre diseñar para móvil primero
2. **Type Safety** - TypeScript estricto, sin `any`
3. **Performance** - Optimizar bundle size, lazy loading
4. **Accessibility** - WCAG 2.1 AA mínimo
5. **DX** - Developer experience importa (ESLint, Prettier, Husky)
6. **Testing** - Tests para lógica crítica
7. **Documentation** - Código auto-documentado + JSDoc

### Filosofía del Proyecto
> "Construir una plataforma que democratice el conocimiento de IA, 
> donde la tecnología misma sea el mejor profesor y administrador,
> aprendiendo y mejorando constantemente para servir mejor a la comunidad."

### Siguiente Paso Inmediato
1. Elegir nombre definitivo (verificar dominio disponible)
2. Registrar dominio (.ai o .io)
3. Crear repositorio GitHub
4. Configurar proyecto Next.js
5. Configurar Supabase
6. ¡Empezar Sprint 1!

---

**Fecha Creación**: 2025-10-21  
**Versión**: 1.0.0  
**Autor**: AI Development Team  
**Estado**: 📋 Plan Definitivo - Listo para Implementación

---

## 🎯 DECISIONES PENDIENTES

1. **Nombre Final de la Plataforma** → Verificar disponibilidad de dominio
2. **LLM Provider Principal** → OpenRouter vs Groq (según performance)
3. **Diseño Exacto del Logo** → Contratar diseñador (Fiverr $5-10) o generar con IA
4. **Hosting Alternativo** → Si Vercel se queda corto, migrar a Cloudflare Pages
5. **Estrategia de SEO** → Contenido blog adicional vs solo noticias
6. **Community Features** → Añadir foros/discord o enfocarse en core product

---

## 🔮 PLAN ENHANCEMENTS (2025-10-21)

- **Edge-First Personalization**: Servir bloques críticos (hero, headlines) desde Vercel Edge Config para experimentar mensajes por región sin costo adicional. Requiere configurar `@vercel/edge-config` y usar variaciones de copy controladas por IA.

- **Generación Multimedia 0€**: Integrar modelos gratuitos de Hugging Face Spaces (Stable Diffusion) mediante API pública para producir imágenes destacadas y thumbnails de cursos, eliminando búsqueda manual.

- **AI Ops Dashboard**: Incluir panel en `/admin/ai-dashboard` con gráficas ligeras (using `echarts-for-react` gratuito) y métricas de costos estimados vs. créditos disponibles para ajustar consumo antes de agotar tiers gratuitos.

- **Community Data Flywheel**: Añadir módulo opcional de "AI Prompts Library" donde usuarios aportan prompts traducidos EN/ES. Gamificación con badges (sin costo) alimenta al Learning Agent con nuevo material curado.

- **Zero-Party Data Strategy**: Implementar encuestas micro (1-click) tras completar artículos para captar intereses y recalibrar recomendaciones sin depender de cookies de terceros.

- **Offline-First Learning**: Convertir los cursos a paquetes estáticos (`/public/courses/{id}.json`) generados by GitHub Actions para que PWA permita continuar sin conexión (máximo impacto en mobile), manteniendo almacenamiento en Supabase Storage gratis (1GB).

- **AI Pairing API**: Exponer endpoint `/api/ai/tutor` gratuito con rate limiting (Next.js Middleware) ofreciendo 3 respuestas diarias, incentivando upgrade futuro. Mantiene costo cero usando modelos `groq` gratuitos.

- **Ethical Transparency Layer**: Mostrar "AI Provenance" badges por contenido con detalles de modelo, fecha, evaluación humana. Incrementa confianza y abre posibilidad de certificaciones futuras.

- **Sponsor-Friendly Slots**: Reservar bloques dinámicos (ex: `components/ads/FeaturedSponsor.tsx`) que se activan solo cuando haya acuerdos, manteniendo layout limpio mientras prepara monetización.

- **Vision Prototyping**: Documentar ruta futura para asistentes de voz usando Web Speech API (sin costo) tanto en inglés como español, reforzando accesibilidad y diferenciación.

---

**¿TODO CLARO? ¡Vamos a construir algo increíble! 🚀**
