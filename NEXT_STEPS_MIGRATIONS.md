# 🚀 PASOS POST-MIGRACIÓN

## 1️⃣ Ejecutar las Migraciones SQL

✅ **HECHO** - El SQL está copiado en tu portapapeles

**Acción requerida**:
1. Abre: https://supabase.com/dashboard/project/yabsciwdpblqzskfupnj/sql/new
2. Pega el SQL (Ctrl+V)
3. Haz clic en "RUN"
4. Verifica que dice "Success"

---

## 2️⃣ Verificar que las Migraciones Funcionaron

Una vez ejecutadas, corre:
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

---

## 3️⃣ Ejecutar el Script de Curación

```bash
$env:NODE_ENV='development'; npx tsx scripts/curate-news.ts
```

Esto debería:
- ✅ Usar Ollama (modelo local)
- ✅ Procesar 100 artículos
- ✅ **GUARDAR artículos en la base de datos** (antes fallaba)
- ✅ Usar imágenes scrapeadas (no fallback de Unsplash)

---

## 4️⃣ Build y Deploy

Si todo funciona:
```bash
npm run build
```

Si el build es exitoso:
```bash
git add -A
git commit -m "fix: aplicar migraciones de schema para image metadata y visual hashes"
git push origin master
```

---

## 🔍 Problemas Comunes

### Si el schema check falla:
- Revisa que el SQL se ejecutó sin errores en Supabase
- Verifica que estás usando las credenciales correctas en `.env.local`

### Si sigue usando imágenes de Unsplash:
- Esto es normal para sitios que bloquean scraping (403)
- Los artículos que SÍ permiten scraping usarán sus imágenes originales
- En el log verás: `[ImageScraper] ✓ Found valid image from og:image`

### Si no almacena artículos:
- Verifica que las columnas existen: `npx tsx scripts/check-db-schema.ts`
- Revisa los permisos de RLS en Supabase

---

**¿TODO LISTO?** → Ejecuta las migraciones en Supabase y avísame cuando termines 👍
