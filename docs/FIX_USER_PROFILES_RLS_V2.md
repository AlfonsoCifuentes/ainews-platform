# 🔧 Fix user_profiles RLS Errors - Actualizado

## ⚠️ Error
```
ERROR: 42710: policy "Public can view all profiles" for table "user_profiles" already exists
```

**Causa**: La migración anterior fue parcialmente aplicada. Las políticas antiguas todavía existen.

**Solución**: Usar la nueva migración v2 que elimina todas las políticas antiguas primero.

---

## ✅ Solución (2 minutos)

### Opción A: Aplicar SQL en Supabase Dashboard (RECOMENDADO)

1. Ve a **Supabase Dashboard** → **Project** → **SQL Editor**
2. Haz clic en **New Query**
3. Copia TODO el contenido de este archivo: `supabase/migrations/20251114_fix_user_profiles_rls_v2.sql`
4. Haz clic en **RUN** (triángulo verde, arriba a la derecha)
5. Espera a que aparezca ✅ **Success**
6. **¡Listo!** Ahora intenta hacer login nuevamente

### Opción B: Script automatizado (Si tienes ts-node)

```bash
# Asegúrate de que tus variables de entorno están seteadas
export NEXT_PUBLIC_SUPABASE_URL="tu_url_aqui"
export SUPABASE_SERVICE_ROLE_KEY="tu_key_aqui"

# Ejecuta el script
npx ts-node scripts/fix-user-profiles-rls-v2.ts
```

---

## 🔍 Verificación

Después de aplicar la migración:

1. **En Supabase Dashboard:**
   - Ve a **Database** → **Tables** → **user_profiles**
   - Haz clic en **Policies**
   - Deberías ver 5 políticas nuevas:
     - ✅ `Public can view all profiles v2`
     - ✅ `Users can select own profile v2`
     - ✅ `Users can insert own profile v2`
     - ✅ `Users can update own profile v2`
     - ✅ `Service role can manage all profiles v2`

2. **En el navegador:**
   - Borra cookies/localStorage o usa una ventana de incógnito
   - Intenta hacer login con Google
   - El nombre de usuario debería ser tu nombre real (ej: "Alfonso Cifuentes"), no "user_46254c1f"
   - Intenta inscribirte en un curso
   - **No debería** decirte que hagas login nuevamente

---

## 🐛 Si sigue sin funcionar

Si aún ves errores:

1. **Verifica que la migración se ejecutó correctamente:**
   - En Supabase Dashboard → SQL Editor → Query History
   - Busca tu query ejecutada hace poco
   - Verifica que el Status sea "Success"

2. **Borra el caché del navegador:**
   - Abre Developer Tools (F12)
   - Haz clic derecho en el botón de reload → "Empty cache and hard reload"
   - O simplemente usa Ctrl+Shift+Delete para borrar cookies

3. **Verifica los metadatos de Google:**
   - En Supabase Dashboard → Authentication → Users
   - Haz clic en tu usuario
   - En la sección "User Metadata" debería haber un objeto con:
     ```json
     {
       "avatar_url": "...",
       "email_verified": true,
       "email_verified_at": "...",
       "name": "Alfonso Cifuentes",  // ← Esto es lo importante
       "picture": "...",
       "provider_id": "...",
       "providers": ["google"]
     }
     ```
   - Si `"name"` está vacío, Google no está enviando correctamente el nombre

---

## 📋 SQL que se ejecutará

```sql
-- Drop all existing conflicting policies (safe for partial migrations)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Public can view leaderboard" ON user_profiles;
DROP POLICY IF EXISTS "Public can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can select own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON user_profiles;

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create 5 new clean policies
CREATE POLICY "Public can view all profiles v2" ...
CREATE POLICY "Users can select own profile v2" ...
CREATE POLICY "Users can insert own profile v2" ...
CREATE POLICY "Users can update own profile v2" ...
CREATE POLICY "Service role can manage all profiles v2" ...

-- Fix trigger to capture Google OAuth name correctly
CREATE OR REPLACE FUNCTION public.handle_new_user() ...

-- Sync existing users
INSERT INTO public.user_profiles ...
```

---

## 💡 ¿Qué cambió?

**Problema anterior:**
- El código buscaba `display_name` en los metadatos de OAuth
- Google envía `name`, no `display_name`
- Por eso asignaba un UUID aleatorio

**Solución implementada:**
- Ahora busca en orden: `name` → `full_name` → `user_name` → UUID fallback
- Google OAuth ahora se captura correctamente
- Los usuarios viejos fueron sincronizados con el fix

---

## 🚀 Próximos pasos después del fix

1. ✅ Aplicar la migración SQL en Supabase
2. ✅ Borrar caché del navegador
3. ✅ Hacer login con Google nuevamente
4. ✅ Verificar que el nombre es correcto
5. ✅ Intentar inscribirse en un curso
6. ✅ Navegar sin que te pida login repetidamente

Si todo funciona, **¡el problema está resuelto!**

---

**¿Preguntas?** Revisa:
- `docs/FIX_USER_PROFILES_RLS.md` - Versión anterior
- `supabase/migrations/20251114_fix_user_profiles_rls_v2.sql` - SQL completo
- `scripts/fix-user-profiles-rls-v2.ts` - Script automatizado
