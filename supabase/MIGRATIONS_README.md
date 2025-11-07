# 🗄️ APLICAR MIGRACIONES A SUPABASE

## 📋 Instrucciones

### Opción 1: Archivo Consolidado (Recomendado)

1. **Abre el SQL Editor de Supabase:**
   ```
   https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
   ```

2. **Copia todo el contenido del archivo:**
   ```
   supabase/APPLY_MIGRATIONS.sql
   ```

3. **Pégalo en el editor y haz click en "Run"**

4. **Verifica el resultado:**
   - Deberías ver mensajes de éxito
   - La query final mostrará el conteo de filas en cada tabla
   - Los 4 prompts iniciales deberían estar insertados

---

### Opción 2: Migraciones Individuales

Si prefieres aplicar las migraciones una por una:

#### 1️⃣ Learning Agent (ai_prompts)
```bash
# Archivo:
supabase/migrations/20250107000001_learning_agent.sql
```

#### 2️⃣ Trending Cache
```bash
# Archivo:
supabase/migrations/20250107000002_trending_cache.sql
```

#### 3️⃣ Entity Relations & Citations
```bash
# Archivo:
supabase/migrations/20250107000003_entity_relations.sql
```

---

## ✅ Verificación

Después de aplicar las migraciones, ejecuta en el SQL Editor:

```sql
-- Verificar tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('ai_prompts', 'trending_cache', 'entity_relations', 'citations')
ORDER BY table_name;

-- Verificar prompts seed (deberían ser 4)
SELECT category, version, active 
FROM ai_prompts 
ORDER BY category;

-- Verificar índices
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('ai_prompts', 'trending_cache', 'entity_relations', 'citations')
ORDER BY tablename, indexname;
```

**Resultado esperado:**
- ✅ 4 tablas creadas: `ai_prompts`, `trending_cache`, `entity_relations`, `citations`
- ✅ 4 prompts iniciales: news_curation, course_generation, translation, summarization
- ✅ 11 índices creados
- ✅ 2 vistas creadas: `entity_stats`, `top_relations`

---

## 🚀 Próximos Pasos

Una vez aplicadas las migraciones:

### 1. Probar AI Agents localmente

```bash
# Learning Agent (analiza feedback y mejora prompts)
npm run ai:learn

# Trending Detection (detecta topics trending)
npm run ai:detect-trends

# Entity Extraction (extrae entidades de artículos)
npm run ai:extract-entities
```

### 2. Verificar GitHub Actions

Los workflows están en `.github/workflows/`:
- `learning-agent.yml` - Ejecuta diariamente a las 3:00 AM UTC
- `detect-trending.yml` - Ejecuta cada 6 horas
- `extract-entities.yml` - Ejecuta diariamente a las 4:00 AM UTC

**Asegúrate de que los GitHub Secrets estén configurados:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` (o `OPENROUTER_API_KEY` o `GROQ_API_KEY`)

### 3. Monitorear ejecuciones

Consulta los logs de los agents:

```sql
SELECT 
  agent_type,
  status,
  duration_ms,
  items_processed,
  created_at
FROM ai_system_logs
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🔧 Troubleshooting

### Error: "relation entities does not exist"

La tabla `entities` debe existir de migraciones anteriores. Si no existe, ejecuta primero:

```sql
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Error: "relation news_articles does not exist"

La tabla `news_articles` debe existir. Si no existe, revisa las migraciones iniciales del proyecto.

### Error: "function uuid_generate_v4 does not exist"

Instala la extensión UUID:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## 📊 Estructura de las Migraciones

```
Migración 1: Learning Agent
├── ai_prompts table (prompts versionados)
├── 2 índices (category_active, created)
└── 4 prompts seed (news, courses, translation, summarization)

Migración 2: Trending Cache
├── trending_cache table (topics con momentum)
├── 2 índices (detected, momentum)
└── función delete_old_trending_cache()

Migración 3: Knowledge Graph Relations
├── entity_relations table (source → target)
├── citations table (evidencias)
├── 7 índices (source, target, type, weight, entity, relation, article)
└── 2 vistas (entity_stats, top_relations)
```

---

## 🎯 Resultado Final

Después de aplicar las migraciones y ejecutar los agents por primera vez:

- **Learning Agent**: Analizará feedback (si existe) y mantendrá prompts actualizados
- **Trending Detection**: Generará cache de topics trending cada 6h
- **Entity Extraction**: Extraerá entidades y relaciones de artículos recientes
- **Knowledge Graph**: Visualización interactiva en `/kg` con React Flow

**Homepage promises: 100% cumplidas** ✅

---

## 📞 Soporte

Si tienes problemas aplicando las migraciones:

1. Verifica que estés en el proyecto correcto de Supabase
2. Asegúrate de tener permisos de escritura en la base de datos
3. Revisa los logs de error en el SQL Editor
4. Consulta la documentación de Supabase: https://supabase.com/docs

---

**Última actualización:** 2025-01-07
