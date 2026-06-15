# OAuth Debug Guide - Paso a Paso

## 🎯 El Problema

El `OAuthCallbackHandler` se carga pero **nunca ejecuta `handleOAuthCallback()`**. Esto significa que el evento `auth-state-changed` nunca se dispara, así que el perfil nunca se actualiza en el cliente.

## 🔍 Cómo Debuggear

### PASO 1: Limpia toda la data
```javascript
// En consola
sessionStorage.clear()
localStorage.clear()
window.AINLog.clearLogs()
```

### PASO 2: Abre la consola en una pestaña nueva
- Abre https://ainews-platform.vercel.app/en/news
- Abre Developer Tools (F12)
- Vete a la pestaña **Console**
- Ejecuta esto:
```javascript
window.AINLog.clearLogs()
```

### PASO 3: Haz Login con Google
- Haz clic en "Sign In" button en la esquina superior derecha
- Abre el modal
- Haz clic en "Sign in with Google"
- Completa el login

### PASO 4: Espera a que regrese a la página

### PASO 5: Ejecuta esto en la consola
```javascript
window.AINLog.getLogs()
```

## 📊 Qué Deberías Ver

### Escenario CORRECTO (si todo funciona)
```
✅ [OAUTH] Mounted, checking for OAuth session...
✅ [OAUTH] Starting handleOAuthCallback execution
✅ [OAUTH] handleOAuthCallback started
✅ [OAUTH] Waiting 100ms for Supabase session cookie...
✅ [USER] Supabase client initialized
✅ [USER] getUser result { userId: "xxx-xxx", hasError: false, errorMessage: null }
✅ [USER] User session detected { userId: "xxx", email: "tu@email.com" }
✅ [OAUTH] Fetching profile from API...
✅ [USER] Profile API response { status: 200, ok: true }
✅ [USER] Profile loaded from API { displayName: "Tu Nombre" }
✅ [EVENT] Dispatched auth-state-changed event with API profile
(O fallback si la API falla)
```

### Escenario PROBLEMÁTICO (lo que probablemente ves)
```
✅ [OAUTH] Mounted, checking for OAuth session...
✅ [OAUTH] Starting handleOAuthCallback execution
❌ NO HAY LOG DE: handleOAuthCallback started
❌ NO HAY LOG DE: getUser result
```

**Si ves esto = `handleOAuthCallback()` NO SE EJECUTA**

## 🔧 Posibles Problemas y Soluciones

### Problema A: React Strict Mode
Si en desarrollo ves los logs duplicados pero NO se ejecuta `handleOAuthCallback`, el problema es **React.StrictMode** corre el effect 2 veces pero solo se ejecuta la primera.

**Solución**: Verifica que NO hay errores en los logs anteriores que detengan la ejecución.

### Problema B: Error en `getClientAuthClient()`
Si NO ves logs después de `Mounted` pero antes de `Starting`, el error está en:
```javascript
const supabase = getClientAuthClient();
```

**Solución**: Abre el archivo `lib/auth/auth-client.ts` y verifica que:
1. El archivo existe
2. La función exporta correctamente
3. No hay errores de inicialización

### Problema C: `await new Promise(resolve => setTimeout(resolve, 100))`
Si ves el log `Starting handleOAuthCallback execution` pero NO `handleOAuthCallback started`, el Promise nunca resuelve (muy raro pero posible).

**Solución**: Cambia el await por algo más explícito.

### Problema D: Error silencioso en `try/catch`
Si hay un error dentro del try que es capturado, solo verías el `error` log.

**Solución**: Busca en los logs un error.

## 📋 Logs Esperados por Fase

### Fase 1: Montaje del Componente
```
[OAUTH] Mounted, checking for OAuth session...
[OAUTH] Starting handleOAuthCallback execution
```

### Fase 2: Inicialización de Supabase
```
[OAUTH] handleOAuthCallback started
[OAUTH] Waiting 100ms for Supabase session cookie...
✅ [OAUTH] Supabase client initialized
```

### Fase 3: Detección de Sesión
```
[USER] getUser result { userId: "...", hasError: false }
✅ [USER] User session detected { userId: "..." }
```

### Fase 4: Fetch del Perfil
```
[OAUTH] Fetching profile from API...
[USER] Profile API response { status: ..., ok: ... }
```

**Si status es 200 y ok es true:**
```
✅ [USER] Profile loaded from API
✅ [EVENT] Dispatched auth-state-changed event with API profile
```

**Si status NO es 200:**
```
⚠️ [OAUTH] Profile fetch failed { status: 401 }
[USER] Building fallback profile from OAuth metadata
✅ [USER] Using fallback profile
✅ [EVENT] Dispatched auth-state-changed event with fallback profile
```

## 🧪 Test Alternativo

Si el login no funciona, abre la consola y ejecuta esto manualmente:

```javascript
// Simula lo que debería pasar
const supabase = window.__supabaseClient; // O cómo accedas al cliente

const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);

// Si user no es null, tenemos sesión
if (user) {
  // Dispara el evento manualmente
  const event = new CustomEvent('auth-state-changed', {
    detail: {
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      },
      profile: null // O con datos del API
    }
  });
  window.dispatchEvent(event);
  console.log('Event dispatched manually');
}
```

## 🎬 Pasos Finales para el Debug

1. **Pega el FULL log aquí** - Copia TODO el resultado de `window.AINLog.getLogs()`
2. **Dime dónde se detiene** - ¿En qué punto dejan de aparecer logs?
3. **Abre Network tab** - Verifica si la llamada a `/api/user/profile` se hace y qué status devuelve

Con eso podré identificar exactamente dónde está el problema.
