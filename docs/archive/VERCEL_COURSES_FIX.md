# Recuperación de Cursos en Vercel - Guía de Acción

## ✅ Problema Identificado

Los cursos están retornando 404 en Vercel porque:
1. **Falta `SUPABASE_SERVICE_ROLE_KEY`** en las variables de entorno de Vercel
2. O la variable existe pero no está siendo leída correctamente

## 📋 Soluciones Implementadas

### 1. **Código Mejorado** ✅
- `/app/api/courses/route.ts` - Ahora maneja fallback a anon key
- `/lib/db/supabase.ts` - Fallback robusto cuando falta service role key
- Mejor logging para debugging
- Scripts de validación de RLS

### 2. **Verificación Local** ✅
```
✅ Base de datos: 16 cursos publicados
✅ RLS policies: Correctamente configuradas
✅ Anon key: Puede leer cursos publicados
✅ Build: Compilado exitosamente
```

## 🔧 ACCIÓN REQUERIDA EN VERCEL

### Opción A: Agregar `SUPABASE_SERVICE_ROLE_KEY` (Recomendado)

1. **Ve a Vercel Dashboard**
   - https://vercel.com/dashboard
   - Selecciona el proyecto `ainews-platform`

2. **Settings → Environment Variables**

3. **Agregar nueva variable:**
   ```
   Name: SUPABASE_SERVICE_ROLE_KEY
   Value: [Tu service role key de Supabase]
   ```

4. **Para obtener el service role key:**
   - Ve a Supabase Console → Tu proyecto
   - Settings → API
   - Copia el valor de `service_role` key

5. **Aplica a todos los ambientes:**
   - ✅ Production
   - ✅ Preview
   - ✅ Development

### Opción B: Forzar Redeploy (Si la variable ya existe)

1. **En Vercel Dashboard**
2. **Deployments → Latest deployment**
3. **Click en los tres puntos → Redeploy**
4. Eso forzará que Next.js relea todas las variables de entorno

## 📊 Qué Cambió en el Código

### Antes (Fallaba sin service role key):
```typescript
const db = getSupabaseServerClient(); // ❌ Error si no hay SUPABASE_SERVICE_ROLE_KEY
```

### Ahora (Funciona con fallback):
```typescript
// Intenta usar service role key
const apiKey = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Si no existe, usa anon key (que sí puede leer cursos publicados con RLS correcto)
```

## 🧪 Cómo Verificar que Funcionó

### 1. **En el navegador (ya en Vercel)**
```
Abre: https://tu-dominio.vercel.app/en/courses
Deberías ver los 16 cursos cargando
```

### 2. **Via API directamente**
```
GET https://tu-dominio.vercel.app/api/courses?locale=en&limit=5
```
Debería devolver:
```json
{
  "success": true,
  "data": [...16 cursos...],
  "pagination": { "total": 16, ... }
}
```

### 3. **Endpoint de debug**
```
GET https://tu-dominio.vercel.app/api/debug/courses
```
Mostrará el estado completo de cursos en la BD

## 🔍 Debugging si Aún No Funciona

### 1. **Verifica Vercel Logs**
```
Vercel Dashboard → Deployments → Logs
Busca: [Courses API]
```

### 2. **Revisa Supabase Console**
```
SQL Editor → Ejecuta:
SELECT COUNT(*) FROM courses WHERE status = 'published';
```
Debería devolver: **16**

### 3. **Prueba la anon key localmente**
```bash
npx tsx scripts/check-rls-courses.ts
```

## 📝 Resumen de Commits

- `d87f519` - Fix: Mejorado error handling con fallback a anon key
- `1544312` - Chore: Health check endpoint agregado
- `43ba98c` - Fix: Logging mejorado en courses API

## ✨ Resultado Esperado

Después de completar estas acciones:
- ✅ Los cursos aparecerán en la página `/en/courses`
- ✅ El API `/api/courses` devolverá datos
- ✅ Los usuarios podrán ver y enrollarse en cursos
- ✅ Sin errores 404

## 💬 Notas Importantes

1. **Las RLS están correctamente configuradas** - Permiten lectura pública a cursos publicados
2. **Los datos están intactos** - Todos los 16 cursos siguen en la BD
3. **El código es robusto** - Funciona tanto con service role key como con anon key
4. **Sin downtime** - El redeploy es instantáneo

---

**Si después de agregar la variable de entorno los cursos siguen sin aparecer, revisa los logs de Vercel para más detalles.**
