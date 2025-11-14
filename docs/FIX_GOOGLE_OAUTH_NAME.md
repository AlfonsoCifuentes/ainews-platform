# 🔧 Arreglar Nombre de Usuario de Google OAuth

## ⚠️ Problema
Cuando haces login con Google, tu nombre de usuario muestra un UUID aleatorio como `user_46254c1f` en lugar de tu nombre real ("Alfonso Cifuentes").

## 🎯 Causa
Hay **dos problemas**:

1. **El trigger SQL en Supabase** - No está actualizado para capturar el campo `name` que Google envía
2. **Perfiles existentes** - Los perfiles creados antes del fix aún tienen UUIDs en place del nombre

## ✅ Solución (3 pasos)

### Paso 1: Aplicar migración v2 (si aún no lo hiciste)

Ve a **Supabase Dashboard → SQL Editor → New Query** y copia el contenido de:
- `supabase/migrations/20251114_fix_user_profiles_rls_v2.sql`

Esto actualiza el trigger para capturar correctamente los nombres de Google OAuth.

### Paso 2: Sincronizar nombres existentes

Ve a **Supabase Dashboard → SQL Editor → New Query** y copia:

```sql
-- Update all user profiles with Google OAuth data
UPDATE public.user_profiles
SET 
  display_name = COALESCE(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'user_name',
    display_name
  ),
  full_name = COALESCE(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    full_name
  ),
  avatar_url = COALESCE(
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture',
    avatar_url
  ),
  updated_at = NOW()
FROM auth.users au
WHERE 
  user_profiles.id = au.id
  AND (
    display_name LIKE 'user_%'
    OR display_name IS NULL
  );
```

Esto actualiza tus datos existentes con tu nombre real de Google.

### Paso 3: Verificar

1. **En Supabase:**
   - Ve a **Database → Tables → user_profiles**
   - Busca tu usuario y verifica que `display_name` ahora es "Alfonso Cifuentes"

2. **En el navegador:**
   - Borra caché: **F12 → Botón reload → Empty cache and hard reload**
   - O usa incógnito/privado
   - Haz login nuevamente con Google
   - Tu nombre debería ser correcto ahora

3. **Intenta inscribirte en un curso:**
   - El nombre debe estar correcto
   - No debería pedir login repetidamente

## 📋 Resumen técnico

**Antes:**
```json
{
  "display_name": "user_46254c1f",
  "full_name": "User"
}
```

**Después:**
```json
{
  "display_name": "Alfonso Cifuentes",
  "full_name": "Alfonso Cifuentes",
  "avatar_url": "https://lh3.googleusercontent.com/..."
}
```

## 🚀 Si todo funciona

Felicidades! Ya puedes:
- ✅ Ver tu nombre real en el perfil
- ✅ Inscribirte en cursos sin problemas
- ✅ No habrá redireccionamientos al login
- ✅ Tu sesión persiste correctamente

## ❓ Preguntas frecuentes

**P: ¿Por qué no se capturó mi nombre inicialmente?**
R: Google envía `name` en los metadatos, pero el código original buscaba `display_name` que Google no envía.

**P: ¿Por qué necesito ejecutar dos migraciones?**
R: La v2 actualiza el trigger para el futuro. La segunda sincroniza tus datos históricos existentes.

**P: ¿Qué pasa con mi progreso de cursos?**
R: Tu progreso sigue igual. Solo se actualiza tu nombre de usuario.

**P: ¿Y mi avatar?**
R: También se actualiza automáticamente desde Google.
