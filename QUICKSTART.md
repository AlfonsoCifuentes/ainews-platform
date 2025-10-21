# 🚀 Quick Start Guide - AINews Platform

## ✅ Lo que Ya Tienes

Has completado la **fase de planeación y estructura inicial** del proyecto. Aquí está todo lo que ya está listo:

### Documentación Creada
- ✅ **PROJECT_MASTER.md** - Plan completo y arquitectura del proyecto
- ✅ **.github/copilot-instructions.md** - Guía para AI agents
- ✅ **README.md** - Documentación general
- ✅ **QUICKSTART.md** (este archivo) - Guía de inicio

### Configuración Base
- ✅ Next.js 14+ con App Router configurado
- ✅ TypeScript strict mode
- ✅ Tailwind CSS 4.0 con design system
- ✅ Internacionalización (i18n) con next-intl
- ✅ Estructura de carpetas completa
- ✅ GitHub Actions workflows (CI/CD + AI curation)
- ✅ Variables de entorno template (.env.example)

### Páginas Base Creadas
- ✅ Homepage (con hero y features)
- ✅ /news - Página de noticias
- ✅ /courses - Página de cursos
- ✅ Traducciones EN/ES completas

---

## 🎯 Próximos Pasos Inmediatos

### 1. Instalar Dependencias (5 minutos)

```powershell
# Navega a la carpeta del proyecto
cd H:\Proyectos\AINews

# Instala todas las dependencias
npm install

# Esto instalará:
# - Next.js 14+
# - React 18+
# - TypeScript
# - Tailwind CSS
# - Framer Motion
# - next-intl
# - Radix UI components
# - Supabase client
# Y todas las dev dependencies
```

### 2. Configurar Supabase (15 minutos)

#### 2.1 Crear Cuenta y Proyecto
1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto:
   - Nombre: `ainews` (o el que elijas)
   - Database Password: (guárdalo en lugar seguro)
   - Region: Elige la más cercana

#### 2.2 Obtener Credenciales
En el dashboard de Supabase:
1. Ve a **Settings** → **API**
2. Copia estos valores:
   - `Project URL` → NEXT_PUBLIC_SUPABASE_URL
   - `anon public` key → NEXT_PUBLIC_SUPABASE_ANON_KEY
   - `service_role` key → SUPABASE_SERVICE_ROLE_KEY (⚠️ nunca expongas esta)

#### 2.3 Crear Tablas Iniciales
En Supabase → **SQL Editor**, ejecuta:

```sql
-- Tabla de artículos de noticias
CREATE TABLE news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en TEXT NOT NULL,
  title_es TEXT NOT NULL,
  content_en TEXT NOT NULL,
  content_es TEXT NOT NULL,
  summary_en TEXT,
  summary_es TEXT,
  category VARCHAR(50),
  tags TEXT[],
  source_url TEXT,
  image_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  ai_generated BOOLEAN DEFAULT true,
  quality_score DECIMAL(3,2),
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de cursos
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en TEXT NOT NULL,
  title_es TEXT NOT NULL,
  description_en TEXT,
  description_es TEXT,
  difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_minutes INTEGER,
  topics TEXT[],
  ai_generated BOOLEAN DEFAULT true,
  generation_prompt TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  enrollment_count INTEGER DEFAULT 0,
  rating_avg DECIMAL(2,1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de logs del sistema de IA
CREATE TABLE ai_system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(50) NOT NULL,
  model_used VARCHAR(100),
  input_tokens INTEGER,
  output_tokens INTEGER,
  success BOOLEAN,
  error_message TEXT,
  execution_time INTEGER,
  cost DECIMAL(10,6),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_news_published ON news_articles(published_at DESC);
CREATE INDEX idx_news_category ON news_articles(category);
CREATE INDEX idx_courses_difficulty ON courses(difficulty);
```

### 3. Configurar Variables de Entorno (5 minutos)

```powershell
# Copia el template
cp .env.example .env.local

# Abre .env.local y añade tus credenciales
notepad .env.local
```

Contenido de `.env.local`:
```bash
# Supabase (copiadas del paso 2.2)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui

# LLM APIs (usa uno o ambos - GRATIS)
# OpenRouter: https://openrouter.ai (obtén $5 de crédito gratis)
OPENROUTER_API_KEY=tu-key-aqui

# Groq: https://console.groq.com (gratis, muy rápido)
GROQ_API_KEY=tu-key-aqui

# Desarrollo
NODE_ENV=development
```

### 4. Ejecutar en Desarrollo (2 minutos)

```powershell
# Inicia el servidor de desarrollo
npm run dev

# Abre en el navegador:
# http://localhost:3000/en  (Inglés)
# http://localhost:3000/es  (Español)
```

🎉 **¡Ya tienes la aplicación funcionando!**

---

## 📝 Tareas de Desarrollo (Sprint 1)

### Semana 1-2: Fundamentos

#### Día 1-2: Setup y UI Base ✅ (Ya hecho)
- [x] Configurar proyecto
- [x] Crear estructura de carpetas
- [x] Configurar i18n
- [x] Páginas base

#### Día 3-4: Componentes UI
- [ ] Crear componentes en `components/ui/` (usando shadcn)
  ```powershell
  # Instalar shadcn CLI
  npx shadcn-ui@latest init
  
  # Agregar componentes necesarios
  npx shadcn-ui@latest add button
  npx shadcn-ui@latest add card
  npx shadcn-ui@latest add dialog
  npx shadcn-ui@latest add dropdown-menu
  npx shadcn-ui@latest add tabs
  ```

- [ ] Crear `components/layout/Header.tsx` con navegación
- [ ] Crear `components/layout/Footer.tsx`
- [ ] Implementar LanguageSwitcher

#### Día 5-7: Sistema de Noticias
- [ ] Crear `lib/db/supabase.ts` (cliente de Supabase)
- [ ] Crear `lib/db/queries/news.ts` (queries de noticias)
- [ ] Implementar `components/news/ArticleCard.tsx`
- [ ] Implementar `components/news/NewsGrid.tsx`
- [ ] Conectar página `/news` con datos reales

---

## 🤖 Configurar AI Agents

### Opción 1: OpenRouter (Recomendado para empezar)

1. Ve a [openrouter.ai](https://openrouter.ai)
2. Regístrate (gratis)
3. Obtén $5 de crédito gratis
4. Crea una API key
5. Añádela a `.env.local`

**Modelos recomendados (gratuitos/baratos):**
- `mistralai/mistral-7b-instruct` (GRATIS)
- `meta-llama/llama-3.1-8b-instruct` (GRATIS)
- `google/gemini-flash-1.5` (casi gratis)

### Opción 2: Groq (Más rápido)

1. Ve a [console.groq.com](https://console.groq.com)
2. Regístrate (gratis)
3. Crea una API key
4. Añádela a `.env.local`

**Modelos disponibles:**
- `llama-3.1-70b-versatile` (GRATIS, ultra-rápido)
- `mixtral-8x7b-32768` (GRATIS)

### Crear AI Agent Base

Crea `lib/ai/llm-client.ts`:

```typescript
export class LLMClient {
  private apiKey: string;
  private baseUrl: string;
  
  constructor(provider: 'openrouter' | 'groq' = 'openrouter') {
    if (provider === 'openrouter') {
      this.apiKey = process.env.OPENROUTER_API_KEY!;
      this.baseUrl = 'https://openrouter.ai/api/v1';
    } else {
      this.apiKey = process.env.GROQ_API_KEY!;
      this.baseUrl = 'https://api.groq.com/openai/v1';
    }
  }
  
  async generate(prompt: string, model?: string) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'mistralai/mistral-7b-instruct',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    
    return response.json();
  }
}
```

---

## 🎨 Personalizar Diseño

### Colores y Tema

Edita `tailwind.config.ts` para cambiar colores:

```typescript
colors: {
  primary: {
    DEFAULT: 'hsl(221.2 83.2% 53.3%)', // Azul
    foreground: 'hsl(210 40% 98%)',
  },
  // Cambia estos valores según tu marca
}
```

### Fuentes

Cambia la fuente en `app/[locale]/layout.tsx`:

```typescript
import { Inter, Poppins, Montserrat } from 'next/font/google';

const font = Poppins({ 
  subsets: ['latin'],
  weight: ['400', '600', '700']
});
```

---

## 🚀 Deploy a Producción (Cuando Estés Listo)

### Deploy en Vercel (GRATIS)

```powershell
# Instalar Vercel CLI
npm i -g vercel

# Hacer deploy
vercel

# Para producción
vercel --prod
```

O simplemente:
1. Push a GitHub
2. Importa el repo en [vercel.com](https://vercel.com)
3. Configura las environment variables
4. ¡Deploy automático!

---

## 📚 Recursos y Documentación

### Aprende las Tecnologías
- **Next.js**: https://nextjs.org/docs
- **Supabase**: https://supabase.com/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Framer Motion**: https://www.framer.com/motion/

### Inspiración de Diseño
- **Awwwards**: https://www.awwwards.com
- **Dribbble**: https://dribbble.com/tags/web-design
- **Mobbin** (móvil): https://mobbin.com

### Comunidades
- **Next.js Discord**: https://nextjs.org/discord
- **Supabase Discord**: https://discord.supabase.com
- **r/webdev**: https://reddit.com/r/webdev

---

## 🆘 Troubleshooting

### Error: "Cannot find module 'next-intl'"
```powershell
npm install next-intl
```

### Error: "Supabase connection failed"
- Verifica que las URLs y keys en `.env.local` sean correctas
- Asegúrate de que no haya espacios antes/después
- Reinicia el servidor (`Ctrl+C` y `npm run dev`)

### Errores de TypeScript
```powershell
# Limpiar caché
rm -rf .next
npm run dev
```

### Puerto 3000 ocupado
```powershell
# Usar otro puerto
npm run dev -- -p 3001
```

---

## 🎯 Checklist Día 1

Asegúrate de completar esto HOY:

- [ ] `npm install` ejecutado correctamente
- [ ] Supabase proyecto creado y configurado
- [ ] `.env.local` con todas las variables
- [ ] `npm run dev` funciona sin errores
- [ ] Puedes ver la homepage en http://localhost:3000/en
- [ ] El cambio de idioma funciona (EN ↔ ES)
- [ ] API key de OpenRouter o Groq configurada y funcionando

---

## 📞 Necesitas Ayuda?

1. **Revisa el PROJECT_MASTER.md** para detalles de arquitectura
2. **Lee .github/copilot-instructions.md** para convenciones
3. **Busca en la documentación oficial** de cada tecnología
4. **Pregunta en comunidades** (Discord, Reddit)

---

## 🎉 ¡Siguiente Milestone!

Una vez completado este quickstart, tu siguiente objetivo es:

**Sprint 1 Completo**: Tener el sistema de noticias funcionando con curación de IA automática.

Ver `PROJECT_MASTER.md` sección "ROADMAP DE IMPLEMENTACIÓN" para el plan detallado.

---

**¡Vamos a construir algo increíble! 🚀**

*Última actualización: 2025-10-21*
