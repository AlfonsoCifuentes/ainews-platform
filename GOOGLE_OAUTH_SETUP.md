# Google OAuth Setup Guide 🔐

## ✅ Estado Actual

El código para Google OAuth **ya está implementado**:

- ✅ Botón "Continue with Google" en AuthModal
- ✅ Función `signInWithOAuth('google')` implementada
- ✅ Callback handler en `/app/auth/callback/route.ts`
- ✅ Soporte para redirect después de login

## 🚀 Configuración Requerida (Solo en Supabase)

### 1. Crear OAuth Credentials en Google Cloud

1. **Accede a Google Cloud Console:**
   - Ve a https://console.cloud.google.com
   - Crea un proyecto nuevo o selecciona uno existente
   - Nombre sugerido: "AINews Platform"

2. **Habilita Google+ API:**
   - Menú → "APIs & Services" → "Library"
   - Busca "Google+ API"
   - Click "Enable"

3. **Crea OAuth 2.0 Credentials:**
   - Menú → "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Si es la primera vez, configura "OAuth consent screen":
     - User Type: **External**
     - App name: **AINews**
     - User support email: tu-email@gmail.com
     - Developer contact: tu-email@gmail.com
     - Scopes: No agregar scopes adicionales (usa default)
     - Test users: Añade tu email (opcional para desarrollo)
   
4. **Configura Application Type:**
   - Application type: **Web application**
   - Name: "AINews Production"
   - **Authorized JavaScript origins:**
     ```
     http://localhost:3000
     https://tu-dominio.vercel.app
     ```
   - **Authorized redirect URIs:**
     ```
     https://[TU-PROYECTO].supabase.co/auth/v1/callback
     http://localhost:54321/auth/v1/callback
     ```
   
5. **Copia las credenciales:**
   - Client ID: `xxxxxxxx.apps.googleusercontent.com`
   - Client Secret: `xxxxxxxxxxxxxxxxxxxxxxxx`

### 2. Configurar en Supabase Dashboard

1. **Accede a tu proyecto Supabase:**
   - Ve a https://app.supabase.com
   - Selecciona tu proyecto AINews

2. **Habilita Google Provider:**
   - Sidebar → Authentication → Providers
   - Busca "Google"
   - Click en "Google" para expandir

3. **Pega las credenciales:**
   - **Enabled:** ✅ ON
   - **Client ID:** Pega el Client ID de Google
   - **Client Secret:** Pega el Client Secret de Google
   - Click **"Save"**

### 3. Testing

1. **Desarrollo Local:**
   ```bash
   npm run dev
   ```
   - Abre http://localhost:3000
   - Click "Sign In" → "Continue with Google"
   - Selecciona tu cuenta Google
   - Deberías redirigir a `/en` después del login

2. **Producción (Vercel):**
   - Asegúrate de que la URL de Vercel esté en "Authorized JavaScript origins"
   - Deploy y prueba en producción
   - Verifica que el redirect funcione

## 🔧 Troubleshooting

### Error: "redirect_uri_mismatch"

**Causa:** La URL de callback no coincide.

**Solución:**
1. Ve a Google Cloud Console → Credentials
2. Edita tu OAuth Client
3. Verifica que la redirect URI sea **EXACTAMENTE**:
   ```
   https://[TU-PROYECTO].supabase.co/auth/v1/callback
   ```
4. NO uses `http://` en producción
5. Espera 5 minutos para que los cambios se propaguen

### Error: "Access blocked: This app's request is invalid"

**Causa:** OAuth consent screen no configurado.

**Solución:**
1. Google Cloud Console → OAuth consent screen
2. Completa TODOS los campos requeridos
3. Añade tu email como test user si está en desarrollo
4. Publica la app si quieres que cualquiera pueda usarla

### Login funciona pero no guarda el usuario

**Causa:** Callback handler no procesa correctamente.

**Solución:**
1. Verifica que `/app/auth/callback/route.ts` exista
2. Check logs en Supabase Dashboard → Logs → Auth Logs
3. Asegúrate de que RLS policies permitan INSERT en users table

## 📊 User Data

Cuando un usuario hace login con Google, Supabase automáticamente crea:

```typescript
{
  id: "uuid",
  email: "user@gmail.com",
  user_metadata: {
    avatar_url: "https://lh3.googleusercontent.com/...",
    email: "user@gmail.com",
    email_verified: true,
    full_name: "John Doe",
    iss: "https://accounts.google.com",
    name: "John Doe",
    picture: "https://lh3.googleusercontent.com/...",
    provider_id: "1234567890",
    sub: "1234567890"
  }
}
```

Puedes acceder a estos datos en tu app:

```typescript
const { data: { user } } = await supabase.auth.getUser();
const name = user?.user_metadata?.full_name;
const avatar = user?.user_metadata?.avatar_url;
```

## 🎯 Next Steps

Una vez configurado Google OAuth:

1. ✅ **GitHub OAuth** - Mismo proceso, diferente provider
2. ✅ **Profile Setup** - Crear perfil automáticamente en first login
3. ✅ **Avatar Sync** - Usar avatar de Google por default
4. ✅ **Email Verification** - No necesario (Google ya verifica)

## 🔗 Referencias

- [Supabase Google OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Authentication](https://nextjs.org/docs/authentication)

---

**¡Listo!** 🎉 Tu plataforma ahora soporta login con Google.
