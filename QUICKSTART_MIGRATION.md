# 🎯 GUÍA RÁPIDA DE MIGRACIÓN - FASE 5+

## 🚀 COPIA Y EJECUTA EN 3 PASOS

### Paso 1️⃣: Abre el SQL Editor
**URL directa**: https://app.supabase.com/project/yabsciwdpblqzskfupnj/sql/new

### Paso 2️⃣: Copia este archivo completo
**Ubicación**: `supabase/migrations/20241103_phase5_complete.sql`

### Paso 3️⃣: Pega y ejecuta
1. Pega el SQL en el editor
2. Haz clic en **"Run"** (botón verde)
3. Espera 5-10 segundos
4. ✅ ¡Listo!

---

## ✅ ¿Qué Se Creará?

### 8 Tablas Nuevas:
- ✅ `flashcards` - Sistema de repaso espaciado
- ✅ `user_highlights` - Resaltados de usuarios
- ✅ `comments` - Hilos de discusión
- ✅ `comment_likes` - Likes en comentarios
- ✅ `fact_checks` - Verificación de hechos
- ✅ `bias_analyses` - Análisis de sesgos
- ✅ `perspective_summaries` - Resúmenes multi-perspectiva
- ✅ `audio_files` - Caché de archivos TTS

### 2 Funciones RPC:
- ✅ `increment_comment_likes()`
- ✅ `decrement_comment_likes()`

### 18 Políticas RLS:
- ✅ Seguridad completa por usuario

---

## 🔍 Verificar Que Funcionó

Ejecuta esto después de la migración:

```sql
SELECT COUNT(*) as tablas_creadas
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'flashcards', 'user_highlights', 'comments', 'comment_likes',
    'fact_checks', 'bias_analyses', 'perspective_summaries', 'audio_files'
  );
```

**Resultado esperado**: `tablas_creadas: 8` ✅

---

## ⚠️ Si Algo Sale Mal

**Error: "relation already exists"**
- ✅ **OK** - Las tablas ya existen, puedes continuar

**Error: "permission denied"**
- 🔧 Verifica que estés usando el proyecto correcto
- 🔧 Ve a Project Settings > API > Usa el Service Role Key

**No se ejecutó nada**
- 🔧 Asegúrate de hacer clic en "Run"
- 🔧 Revisa que copiaste el SQL completo

---

## 🎉 Después de la Migración

1. ✅ Integra componentes en artículos (ver `PHASE5_DEPLOYMENT_COMPLETE.md`)
2. ✅ Despliega a producción (`git push origin master`)
3. ✅ Monitorea el panel de agentes
4. ✅ Recopila feedback de usuarios

---

**Manual completo**: Ver `MANUAL_MIGRATION_GUIDE.md` para troubleshooting detallado.
