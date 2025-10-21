# AINews Platform 🤖📰

> Plataforma bilingüe de noticias de IA y aprendizaje automatizado con gestión autónoma por inteligencia artificial.

## 🎯 Visión

Una plataforma revolucionaria que combina curación automática de noticias de IA, generación de cursos on-demand, y un sistema de inteligencia artificial que aprende y mejora continuamente.

**100% gratuito de construir y operar** usando tiers gratuitos de servicios cloud.

## 🚀 Características

### Core Features
- 📰 **Curación Automática de Noticias** - Actualización cada 6 horas con IA
- 🎓 **Generación de Cursos** - Crea cursos sobre cualquier tema de IA al instante
- 🌐 **Bilingüe** - Inglés y español con UX perfecta
- 🎨 **Diseño Revolucionario** - Mobile-first con animaciones avanzadas
- 🤖 **IA Autónoma** - Sistema que se administra y mejora solo
- 💰 **Costo $0** - Infraestructura completamente gratuita

### Advanced Features (Phase 2)
- 🔐 **Autenticación** - Email/password + OAuth (Google, GitHub)
- 📊 **Dashboard Personal** - Stats, progreso, badges, artículos guardados
- 🎮 **Gamificación** - Sistema de XP, niveles, rachas, y 12 tipos de badges
- 🔍 **Búsqueda Avanzada** - Búsqueda semántica + filtros (categoría, fecha, calidad)
- 🏆 **Leaderboard** - Tabla de clasificación semanal con top 100 usuarios

### Email & Analytics (Phase 3)
- 📧 **Email Notifications** - Bienvenida, resúmenes semanales, completación de cursos
- 📈 **Analytics Dashboard** - Métricas de plataforma y engagement en tiempo real
- ⚡ **Automated Jobs** - Digest semanal, registro de XP diario, refresh de analytics

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 14+** (App Router) - Framework React con SSR/SSG
- **TypeScript** - Type safety completo
- **Tailwind CSS 4.0** - Utility-first CSS
- **Framer Motion** - Animaciones revolucionarias
- **Radix UI** - Componentes accesibles

### Backend
- **Supabase** - PostgreSQL + Auth + Storage (gratis)
- **Next.js API Routes** - Serverless functions
- **tRPC** - Type-safe APIs
- **pgvector** - Embeddings para RAG

### AI/ML
- **OpenRouter / Groq** - LLM APIs (tier gratuito)
- **LangChain** - Framework de agentes
- **GitHub Actions** - Automatización de tareas IA

## 📦 Instalación

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/ainews.git
cd ainews

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus keys

# Ejecutar en desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🔑 Variables de Entorno

Necesitas crear un archivo `.env.local` con:

```bash
# Supabase (gratis en supabase.com)
NEXT_PUBLIC_SUPABASE_URL=tu-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-key

# LLM API (elige uno - ambos tienen tier gratuito)
OPENROUTER_API_KEY=tu-key  # openrouter.ai
# o
GROQ_API_KEY=tu-key  # console.groq.com

# Analytics (opcional)
NEXT_PUBLIC_UMAMI_URL=tu-umami-url
NEXT_PUBLIC_UMAMI_SITE_ID=tu-site-id

# Email Notifications (Resend - 3,000 emails/month gratis)
RESEND_API_KEY=tu-resend-key
```

## 📚 Scripts Disponibles

```bash
npm run dev          # Desarrollo local
npm run build        # Build producción
npm run start        # Servidor producción
npm run lint         # ESLint
npm run type-check   # TypeScript check

# Scripts de IA
npm run ai:curate    # Curación manual de noticias
npm run ai:test      # Probar agente de IA

# Scripts de Email & Analytics (Phase 3)
npx ts-node scripts/weekly-digest-generator.ts send       # Enviar digests semanales
npx ts-node scripts/weekly-digest-generator.ts record-xp  # Registrar XP diario
```

## 🏗️ Estructura del Proyecto

```
ainews/
├── app/                    # Next.js App Router
│   ├── [locale]/          # Rutas i18n (en/es)
│   │   ├── news/          # Módulo de noticias
│   │   ├── courses/       # Módulo de cursos
│   │   └── admin/         # Panel admin
│   └── api/               # API routes
├── components/            # Componentes React
│   ├── ui/               # shadcn/ui components
│   ├── news/             # News components
│   ├── courses/          # Course components
│   └── layout/           # Layout components
├── lib/                   # Utilidades
│   ├── ai/               # Sistema de IA
│   ├── db/               # Database queries
│   └── utils/            # Helpers
├── messages/             # Traducciones i18n
│   ├── en.json
│   └── es.json
├── scripts/              # Scripts de automatización
└── .github/              # CI/CD workflows
```

## 🤖 Sistema de IA

El proyecto incluye 3 agentes autónomos:

### 1. News Curator Agent
Scrapes RSS feeds, filtra con IA, traduce, y publica automáticamente.

```bash
# Ejecutar manualmente
npm run ai:curate

# Se ejecuta automáticamente cada 6h vía GitHub Actions
```

### 2. Course Generator Agent
Genera cursos completos sobre cualquier tema de IA.

```typescript
// Uso desde el código
const course = await generateCourse({
  topic: "Transformers Architecture",
  difficulty: "intermediate",
  locale: "es"
});
```

### 3. Learning Agent
Analiza feedback y mejora continuamente los prompts y estrategias.

```bash
# Ejecutar manualmente
npm run ai:learn
```

## 🌐 Internacionalización

Todos los contenidos existen en inglés y español:

- Rutas: `/en/news` y `/es/news`
- Base de datos: Columnas duales (`title_en`, `title_es`)
- UI: `messages/en.json` y `messages/es.json`

Cambiar idioma es instantáneo sin reload.

## 🎨 Sistema de Diseño

Diseño revolucionario con:
- **Bento Grid Layouts** estilo Apple
- **Glassmorphism avanzado**
- **Animaciones 3D** con Framer Motion
- **Dark/Light mode** fluido
- **Mobile-first** responsive

Ver `tailwind.config.ts` para tokens de diseño.

## 📈 Despliegue

### Vercel (Recomendado - Gratis)

1. Push a GitHub
2. Importa en [Vercel](https://vercel.com)
3. Configura environment variables
4. Deploy automático

### Cloudflare Pages (Alternativa)

```bash
npm run build
npx wrangler pages deploy .next
```

## 🧪 Testing

```bash
npm run test           # Unit tests (Jest)
npm run test:e2e       # E2E tests (Playwright)
npm run test:coverage  # Coverage report
```

## 📖 Documentación Completa

- [**PROJECT_MASTER.md**](./PROJECT_MASTER.md) - Plan completo del proyecto
- [**.github/copilot-instructions.md**](./.github/copilot-instructions.md) - Guía para AI agents
- [**Email & Analytics Setup**](./docs/EMAIL_AND_ANALYTICS.md) - Configuración de notificaciones y análisis
- [Supabase Setup](./docs/supabase-setup.md) - Configuración de base de datos
- [AI Agents Guide](./docs/ai-agents.md) - Guía de agentes de IA

## 🤝 Contribuir

¡Contribuciones bienvenidas! Por favor:

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](./LICENSE) para detalles.

## 🙏 Agradecimientos

- [Next.js](https://nextjs.org/) - Framework
- [Supabase](https://supabase.com/) - Backend
- [Vercel](https://vercel.com/) - Hosting
- [OpenRouter](https://openrouter.ai/) - LLM APIs
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## 📞 Contacto

- Website: (pendiente)
- Email: (pendiente)
- Twitter: (pendiente)

---

**Built with ❤️ and 🤖 AI**

⭐ Si te gusta el proyecto, dale una estrella en GitHub!
