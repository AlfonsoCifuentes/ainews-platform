# ✅ CHECKLIST: APLICAR MIGRACIONES

## Pre-requisitos
- [ ] Tienes acceso al dashboard de Supabase
- [ ] Conoces tu Project ID de Supabase
- [ ] Tienes permisos para ejecutar SQL

---

## Paso 1: Abrir SQL Editor
- [ ] Ve a: https://supabase.com/dashboard
- [ ] Selecciona tu proyecto
- [ ] Click en "SQL Editor" en el menú lateral
- [ ] Click en "New Query"

---

## Paso 2: Copiar SQL
- [ ] Abre el archivo: `supabase/APPLY_MIGRATIONS.sql`
- [ ] Presiona `Ctrl+A` (seleccionar todo)
- [ ] Presiona `Ctrl+C` (copiar)

---

## Paso 3: Aplicar Migración
- [ ] En el SQL Editor de Supabase, presiona `Ctrl+V` (pegar)
- [ ] Verifica que todo el SQL esté visible
- [ ] Click en el botón verde "Run" (o presiona `Ctrl+Enter`)
- [ ] Espera a que termine (puede tomar 5-10 segundos)

---

## Paso 4: Verificar Resultado
Deberías ver mensajes como:
- [ ] "Success" o checkmarks verdes
- [ ] Tabla con conteos al final (4 filas en ai_prompts)
- [ ] Sin errores rojos

### Si hay errores:
- **"relation entities does not exist"**: Ejecuta primero las migraciones de Phase 5
- **"function uuid_generate_v4 does not exist"**: Ejecuta `CREATE EXTENSION "uuid-ossp";`
- **Otro error**: Revisa `supabase/MIGRATIONS_README.md`

---

## Paso 5: Verificar Tablas Creadas
Ejecuta esta query en el SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('ai_prompts', 'trending_cache', 'entity_relations', 'citations')
ORDER BY table_name;
```

Deberías ver:
- [ ] ai_prompts
- [ ] citations
- [ ] entity_relations
- [ ] trending_cache

---

## Paso 6: Verificar Prompts Seed
Ejecuta:

```sql
SELECT category, version, active FROM ai_prompts ORDER BY category;
```

Deberías ver:
- [ ] course_generation (v1, active)
- [ ] news_curation (v1, active)
- [ ] summarization (v1, active)
- [ ] translation (v1, active)

---

## Paso 7: Probar AI Agents (Opcional)
En tu terminal local:

```bash
# Learning Agent
npm run ai:learn
```
- [ ] Ejecuta sin errores
- [ ] Verifica en `ai_system_logs` table

```bash
# Trending Detection
npm run ai:detect-trends
```
- [ ] Ejecuta sin errores
- [ ] Verifica en `trending_cache` table (debería tener filas)

```bash
# Entity Extraction
npm run ai:extract-entities
```
- [ ] Ejecuta sin errores
- [ ] Verifica en `entity_relations` table

---

## Paso 8: Configurar GitHub Secrets
En GitHub repo settings → Secrets and variables → Actions:

- [ ] `SUPABASE_URL` = https://xxxxx.supabase.co
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = eyJhbGc...
- [ ] `GEMINI_API_KEY` = AIzaSy... (o OPENROUTER_API_KEY o GROQ_API_KEY)

---

## Paso 9: Verificar GitHub Actions
- [ ] Workflows en `.github/workflows/` existen:
  - learning-agent.yml
  - detect-trending.yml
  - extract-entities.yml

- [ ] Puedes hacer trigger manual:
  - Ve a Actions tab en GitHub
  - Selecciona un workflow
  - Click "Run workflow"

---

## Paso 10: Monitorear Primera Ejecución

### Opción A: Esperar ejecución automática
- Learning Agent: Diario 3:00 AM UTC
- Trending: Cada 6 horas (00:00, 06:00, 12:00, 18:00 UTC)
- Entity Extraction: Diario 4:00 AM UTC

### Opción B: Ejecutar manualmente
- [ ] Ve a GitHub Actions tab
- [ ] Selecciona un workflow
- [ ] Click "Run workflow" → "Run workflow"
- [ ] Espera resultado (verde = éxito, rojo = error)

---

## Paso 11: Verificar Logs
Ejecuta en Supabase SQL Editor:

```sql
SELECT 
  agent_type,
  status,
  duration_ms,
  items_processed,
  created_at
FROM ai_system_logs
ORDER BY created_at DESC
LIMIT 10;
```

- [ ] Ves registros de ejecuciones
- [ ] Status = 'success'
- [ ] items_processed > 0

---

## Paso 12: Probar UI
- [ ] Ve a `/trending` → Deberías ver topics
- [ ] Ve a `/kg?view=graph` → Deberías ver grafo interactivo
- [ ] Click en un nodo → Ver panel de info
- [ ] Usa MiniMap y Controls

---

## 🎉 COMPLETADO

Si todos los checks están ✅:

- ✅ Migraciones aplicadas correctamente
- ✅ AI Agents funcionando
- ✅ GitHub Actions configuradas
- ✅ UI mostrando datos

**Homepage Promises: 100% CUMPLIDAS**

---

## 📊 Métricas a Monitorear

### Diario:
- Número de prompts mejorados (ai_prompts con version > 1)
- Feedback procesado (ai_system_logs)
- Entidades extraídas (entity_relations count)

### Cada 6 horas:
- Topics trending detectados (trending_cache count)
- Momentum promedio de topics

### Query útil:
```sql
-- Dashboard resumido
SELECT 
  (SELECT COUNT(*) FROM ai_prompts WHERE version > 1) as prompts_mejorados,
  (SELECT COUNT(*) FROM trending_cache WHERE detected_at > NOW() - INTERVAL '6 hours') as trending_recientes,
  (SELECT COUNT(*) FROM entity_relations) as total_relaciones,
  (SELECT COUNT(*) FROM citations) as total_citas;
```

---

**Última actualización:** 2025-01-07  
**Estado:** ✅ Listo para aplicar
