# 🗄️ MANUAL DE APLICACIÓN DE MIGRACIONES

## ⚠️ IMPORTANTE: Acción Requerida

El schema de la base de datos necesita actualizaciones para soportar las nuevas funciones de validación de imágenes.

## 📋 Migraciones Pendientes

### ✅ Migración 1: Metadatos de Imágenes
**Archivo**: `20251104_add_image_metadata.sql`  
**Descripción**: Agrega columnas para almacenar metadatos de imágenes (dimensiones, alt text bilingüe, hash para deduplicación)

### ✅ Migración 2: Similaridad Visual
**Archivo**: `20251109_create_image_visual_hashes.sql`  
**Descripción**: Crea tabla para detectar imágenes duplicadas usando perceptual hashing

## 🚀 PASOS PARA APLICAR

### Opción A: Copiar y Pegar SQL (RECOMENDADO)

1. **Abrir Supabase SQL Editor**:
   ```
   https://supabase.com/dashboard/project/yabsciwdpblqzskfupnj/sql/new
   ```

2. **Mostrar SQL de las migraciones**:
   ```bash
   npx tsx scripts/show-migrations.ts
   ```

3. **Copiar el SQL** que aparece en la terminal

4. **Pegar en Supabase SQL Editor** y hacer clic en "Run"

5. **Verificar**:
   ```bash
   npx tsx scripts/check-db-schema.ts
   ```

### Opción B: Ejecutar Directamente (Si tienes acceso a la terminal de Supabase)

Si tienes instalado `supabase-cli`:
```bash
supabase db push
```

## 🔍 Verificación Post-Migración

Ejecuta:
```bash
npx tsx scripts/check-db-schema.ts
```

Deberías ver:
```
✅ image_alt_text_en column
✅ image_alt_text_es column  
✅ image_width column
✅ image_hash column
✅ image_visual_hashes table exists
```

## ❌ Si algo falla

1. **Revisar errores** en Supabase SQL Editor
2. **Verificar permisos** del servicio role key
3. **Contactar** si hay problemas de schema

## 📝 SQL Completo (Copia esto si prefieres)

### Migración 1:
```sql
-- Migration: Add image metadata columns to news_articles
ALTER TABLE news_articles
  ADD COLUMN IF NOT EXISTS image_width INTEGER,
  ADD COLUMN IF NOT EXISTS image_height INTEGER,
  ADD COLUMN IF NOT EXISTS image_mime VARCHAR(50),
  ADD COLUMN IF NOT EXISTS image_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS blur_data_url TEXT,
  ADD COLUMN IF NOT EXISTS image_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS image_alt_text_en VARCHAR(500),
  ADD COLUMN IF NOT EXISTS image_alt_text_es VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_news_articles_image_hash ON news_articles(image_hash);
CREATE INDEX IF NOT EXISTS idx_news_articles_link ON news_articles(link);
CREATE INDEX IF NOT EXISTS idx_news_articles_category_created ON news_articles(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_source ON news_articles(source);

ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS link_normalized VARCHAR(500);
```

### Migración 2:
```sql
-- Migration: Create image_visual_hashes table
CREATE TABLE IF NOT EXISTS image_visual_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url VARCHAR(1000) NOT NULL,
  perceptual_hash VARCHAR(64) NOT NULL,
  hamming_distance INTEGER DEFAULT 0,
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_url ON image_visual_hashes(image_url);
CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_hash ON image_visual_hashes(perceptual_hash);
CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_article ON image_visual_hashes(article_id);
CREATE INDEX IF NOT EXISTS idx_image_visual_hashes_created ON image_visual_hashes(created_at DESC);

ALTER TABLE image_visual_hashes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to image_visual_hashes"
  ON image_visual_hashes FOR SELECT TO anon USING (true);

CREATE POLICY "Allow service role full access to image_visual_hashes"
  ON image_visual_hashes TO service_role USING (true) WITH CHECK (true);
```

## ✅ Una vez completado

Ejecuta el script de curación para verificar que todo funciona:
```bash
npm run curate
```
