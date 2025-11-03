# ⚡ QUICK FIX - GitHub Actions Error

## 🔴 El Error Que Tienes

```
curate-news
Process completed with exit code 1.
```

**Causa**: GitHub Actions no tiene las API keys configuradas.

## ✅ Solución Rápida (5 minutos)

### PASO 1: Ir a GitHub Secrets

**👉 [CLICK AQUÍ PARA CONFIGURAR](https://github.com/AlfonsoCifuentes/ainews-platform/settings/secrets/actions)**

### PASO 2: Agregar Estos 5 Secrets

Para cada uno, click **"New repository secret"** y copia los valores de tu archivo `.env`:

| Secret Name | Valor (copia de .env) |
|-------------|----------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | El valor de `NEXT_PUBLIC_SUPABASE_URL=` en tu .env |
| `SUPABASE_SERVICE_ROLE_KEY` | El valor de `SUPABASE_SERVICE_ROLE_KEY=` en tu .env |
| `GEMINI_API_KEY` | El valor de `GEMINI_API_KEY=` en tu .env |
| `OPENROUTER_API_KEY` | El valor de `OPENROUTER_API_KEY=` en tu .env |
| `GROQ_API_KEY` | El valor de `GROQ_API_KEY=` en tu .env |

**⚠️ Importante**: 
- Los nombres deben ser EXACTOS (mayúsculas y minúsculas)
- Copia todo el valor (incluyendo prefijos como `sk-`, `gsk_`, `AIzaSy`, etc.)
- NO copies el `VARIABLE_NAME=`, solo el valor

### PASO 3: Probar de Nuevo

1. Ve a: https://github.com/AlfonsoCifuentes/ainews-platform/actions
2. Click **"AI News Curation"**
3. Click **"Run workflow"** → **"Run workflow"**
4. Espera 2-3 minutos

### ✅ Si Funciona, Verás Esto en los Logs:

```
[News Curator] Environment check:
  - GEMINI_API_KEY: ✓ Set
  - OPENROUTER_API_KEY: ✓ Set
  - GROQ_API_KEY: ✓ Set
  - SUPABASE_SERVICE_ROLE_KEY: ✓ Set
  - NEXT_PUBLIC_SUPABASE_URL: ✓ Set
[News Curator] ✓ Gemini client initialized
[News Curator] ✓ OpenRouter client initialized
[News Curator] ✓ Groq client initialized
[News Curator] Initialized 3 LLM provider(s) with automatic fallback
```

### ❌ Si Sigue Fallando:

Revisa que:
- [ ] Los 5 secrets estén agregados en GitHub
- [ ] Los nombres sean EXACTOS (sin espacios, mayúsculas correctas)
- [ ] Los valores estén completos (sin line breaks)
- [ ] Esperaste 30 segundos antes de ejecutar de nuevo

---

## 📖 Documentación Detallada

Si necesitas más ayuda, revisa:
- `GITHUB_SECRETS_SETUP.md` - Guía completa paso a paso
- `DEPLOYMENT_CHECKLIST.md` - Checklist de deployment

---

**Tiempo estimado**: 5 minutos  
**Dificultad**: Fácil (solo copy-paste de tu .env)
