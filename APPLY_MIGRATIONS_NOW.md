# ✅ MIGRACIONES LISTAS PARA APLICAR

## 🎯 Acción Requerida

**Ve a Supabase SQL Editor:**
👉 https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new

---

## 📝 Opción Rápida (Copiar/Pegar)

1. **Abre el archivo:** `supabase/APPLY_MIGRATIONS.sql`
2. **Copia TODO el contenido** (Ctrl+A, Ctrl+C)
3. **Pega en el SQL Editor de Supabase**
4. **Click en "Run"** ▶️
5. **Espera confirmación** ✅

---

## 🔍 ¿Qué se va a crear?

### Tabla 1: `ai_prompts`
- Almacena prompts versionados para el Learning Agent
- 4 prompts iniciales (news curation, course generation, translation, summarization)
- Sistema de versionado con historial de mejoras

### Tabla 2: `trending_cache`
- Cache de topics trending (actualizado cada 6h)
- Evita cálculo en tiempo real costoso
- Auto-limpieza de datos > 7 días

### Tabla 3: `entity_relations`
- Relaciones entre entidades del Knowledge Graph
- 6 tipos: launched, acquired, funded, published, collaborated, competed
- Peso (weight) para relaciones fuertes/débiles

### Tabla 4: `citations`
- Evidencias que respaldan entidades y relaciones
- Citas textuales con URLs fuente
- Confidence score (0.0-1.0)

### Vistas SQL: `entity_stats`, `top_relations`
- Queries optimizadas para el Knowledge Graph

---

## ✅ Verificación Post-Migración

Ejecuta esto en el SQL Editor después de aplicar:

```sql
SELECT COUNT(*) as total FROM ai_prompts;        -- Esperado: 4
SELECT COUNT(*) as total FROM trending_cache;    -- Esperado: 0 (se llena con el agent)
SELECT COUNT(*) as total FROM entity_relations;  -- Esperado: 0 (se llena con el agent)
SELECT COUNT(*) as total FROM citations;         -- Esperado: 0 (se llena con el agent)
```

---

## 🚀 Después de Aplicar

1. **Ejecutar agents localmente (opcional):**
   ```bash
   npm run ai:learn
   npm run ai:detect-trends
   npm run ai:extract-entities
   ```

2. **Verificar GitHub Actions configuradas** con los secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`

3. **Esperar ejecuciones automáticas:**
   - Learning Agent: Diario 3:00 AM UTC
   - Trending: Cada 6 horas
   - Entity Extraction: Diario 4:00 AM UTC

---

## 🎉 Resultado Final

- ✅ Self-Improving AI (Learning Agent funcionando)
- ✅ Trending Topics (Cache cada 6h)
- ✅ Knowledge Graph (Relaciones + Visualización React Flow)
- ✅ Homepage promises: **100% cumplidas**

---

**¿Listo?** Aplica las migraciones ahora y empieza a ver tu plataforma auto-mejorar 🚀
