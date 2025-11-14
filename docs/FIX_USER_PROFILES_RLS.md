# 🔧 Solución: Error 500 en user_profiles

## Problema
El cliente recibe errores 500 al intentar acceder a `user_profiles`:
```
yabsciwdpblqzskfupnj.supabase.co/rest/v1/user_profiles? → 500 Error
```

## Causa Raíz
Las políticas RLS (Row Level Security) en la tabla `user_profiles` son **demasiado restrictivas** y previenen que:
- Clientes autenticados lean sus propios perfiles
- Clientes autenticados actualicen sus propios perfiles
- El sistema cree perfiles automáticamente en signup

## Solución

### Opción A: Aplicar SQL en Supabase Dashboard (RECOMENDADO - 2 minutos)

1. Ve a: **Supabase Dashboard** → Tu Proyecto → **SQL Editor**
2. Crea una **New Query**
3. Copia y pega TODO esto:

```sql
-- ============================================================================
-- FIX: user_profiles RLS policies
-- ============================================================================

-- Drop all conflicting policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Public can view leaderboard" ON user_profiles;

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Public can view all profiles"
  ON user_profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can select own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can manage all profiles"
  ON user_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure all users have profiles
DROP FUNCTION IF EXISTS public.handle_new_user();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id, 
    display_name, 
    full_name, 
    avatar_url,
    preferred_locale,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'user_' || substring(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', COALESCE(NEW.email, '')),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    COALESCE((NEW.raw_user_meta_data->>'locale')::TEXT, 'en'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create profiles for existing users
INSERT INTO public.user_profiles (id, display_name, full_name, created_at, updated_at)
SELECT 
  id,
  'user_' || substring(id::text, 1, 8),
  COALESCE(email, 'User'),
  created_at,
  created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO NOTHING;
```

4. Click **RUN** (triángulo verde)
5. Espera a que aparezca ✅ "Success"
6. **Listo!** Ahora intenta hacer login nuevamente

### Opción B: Aplicar desde terminal (Alternativa)

```bash
# Ir al directorio del proyecto
cd h:\Proyectos\AINews

# Ejecutar el script
npx ts-node scripts/fix-user-profiles-rls.ts
```

## Qué Hace la Migración

| Antes | Después |
|-------|---------|
| ❌ Usuarios no pueden leer su perfil | ✅ Usuarios autenticados leen su perfil |
| ❌ Usuarios no pueden actualizar su perfil | ✅ Usuarios autenticados actualizan su perfil |
| ❌ Error 500 en signup | ✅ Perfil creado automáticamente |
| ❌ Políticas conflictivas | ✅ RLS correctamente configurado |

## Verificar que Funcionó

Después de aplicar la migración:

1. Cierra sesión en la app (si tenías abierta)
2. Limpia el localStorage/cookies del navegador
3. Intenta hacer login nuevamente
4. Abre la consola del navegador (F12) y busca errores 500
5. Si NO hay errores 500 en `user_profiles` → ✅ Funcionó!

## Si Aún No Funciona

Si seguís viendo errores 500:

1. Ve a **Supabase Dashboard** → **Inspect** → Expande `user_profiles`
2. Verifica que las políticas creadas aparezcan listadas:
   - "Public can view all profiles"
   - "Users can select own profile"
   - "Users can insert own profile"
   - "Users can update own profile"
   - "Service role can manage all profiles"

3. Si faltan políticas, vuelve a copiar y pegar el SQL arriba

## Tickets Relacionados

- Issue: user_profiles returning 500 errors
- Migration: 20251114_fix_user_profiles_rls.sql
- Commit: (pendiente de aplicar)

---

**Actualizado**: Nov 14, 2025
