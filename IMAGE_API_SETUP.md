# Image API Setup Guide

## Overview

Para asegurar que cada noticia tenga una imagen de alta calidad, el sistema ahora usa múltiples APIs de imágenes con fallbacks automáticos.

## APIs Configuradas

### 1. Pexels API (Recomendado)
**Ventajas:**
- 200 requests/hora (free tier)
- Imágenes de alta calidad
- Licencia libre para uso comercial
- API muy confiable

**Pasos de Configuración:**

1. Ir a https://www.pexels.com/api/
2. Hacer clic en "Get Started"
3. Crear cuenta gratuita (o iniciar sesión)
4. Ir a "Your API" en el dashboard
5. Copiar tu API key
6. Agregar a `.env.local`:
   ```bash
   PEXELS_API_KEY=your_key_here
   ```

**Documentación:** https://www.pexels.com/api/documentation/

---

### 2. Pixabay API (Fallback)
**Ventajas:**
- 50 requests/hora (free tier)
- Imágenes de buena calidad
- Licencia libre
- Buen fallback si Pexels falla

**Pasos de Configuración:**

1. Ir a https://pixabay.com/api/
2. Hacer clic en "Sign up"
3. Crear cuenta gratuita
4. Ir a "API Documentation"
5. Copiar tu API key
6. Agregar a `.env.local`:
   ```bash
   PIXABAY_API_KEY=your_key_here
   ```

**Documentación:** https://pixabay.com/api/docs/

---

### 3. Unsplash Source API (Último Recurso)
**Ventajas:**
- No requiere API key
- Imágenes de muy alta calidad
- Fallback automático

**Desventajas:**
- Puede retornar 502 Bad Gateway ocasionalmente
- Por eso es el último fallback

---

## Configuración en GitHub Actions

Si usas GitHub Actions para ejecutar `npm run ai:curate`:

1. Ir a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Agregar nuevos secrets:
   - `PEXELS_API_KEY` = tu key de Pexels
   - `PIXABAY_API_KEY` = tu key de Pixabay

4. Estos secrets se cargarán automáticamente en `.env` durante CI/CD

---

## Configuración Local

Para desarrollo local:

1. Crear/editar `.env.local`:
   ```bash
   # Existing variables...
   NEXT_PUBLIC_SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   
   # Agregar:
   PEXELS_API_KEY=your_pexels_key
   PIXABAY_API_KEY=your_pixabay_key
   ```

2. Guardar el archivo
3. Reiniciar el servidor de desarrollo

---

## Cómo Funciona el Sistema de Fallbacks

Cuando se cura una noticia, el sistema intenta obtener imagen en este orden:

```
1. Scraping avanzado (DOM parsing)
   ↓ (si falla)
2. Ultra scraper (Playwright + AI Vision)
   ↓ (si falla)
3. Validación con AI Computer Vision
   ↓ (si falla)
4. Pexels API ← Recomendado
   ↓ (si falla)
5. Pixabay API ← Fallback
   ↓ (si falla)
6. Unsplash Source API ← Último recurso
```

Cada capa intenta obtener una imagen válida. Si una falla, automáticamente intenta la siguiente.

---

## Monitoreo

Para verificar que el sistema funciona:

1. Ejecutar curación de noticias:
   ```bash
   npm run ai:curate
   ```

2. Revisar logs para ver qué APIs se usaron:
   ```
   [ImageValidator] Layer 1 failed, trying ULTRA scraper...
   [ImageValidator] ✓ Got fallback from Pexels API
   ```

3. Verificar en la aplicación:
   - Ir a https://ainews-platform.vercel.app/en/news
   - Todas las noticias deben tener imagen

---

## Límites de Rate

| API | Free Tier | Límite |
|-----|-----------|--------|
| Pexels | 200 req/hora | Suficiente para ~20 artículos |
| Pixabay | 50 req/hora | Fallback si Pexels agotado |
| Unsplash Source | Ilimitado | Pero puede fallar (502) |

**Recomendación:** Ejecutar `npm run ai:curate` máximo 1-2 veces por hora para no agotar límites.

---

## Troubleshooting

### Las noticias no tienen imagen
1. Verificar que PEXELS_API_KEY está configurada
2. Revisar logs: `npm run ai:curate`
3. Verificar que la API key es válida
4. Esperar 1 hora si se agotó el rate limit

### Error: "Pexels API failed"
- Verificar que la API key es correcta
- Verificar conexión a internet
- Esperar si se agotó el rate limit (200 req/hora)

### Error: "All APIs failed"
- Verificar que al menos una API key está configurada
- Revisar logs para ver qué falló
- El sistema usará Unsplash Source como último recurso

---

## Costos

**Todas las APIs usadas son GRATUITAS:**
- Pexels: Gratis (200 req/hora)
- Pixabay: Gratis (50 req/hora)
- Unsplash Source: Gratis (sin límite)

**No hay costos adicionales** para usar este sistema.

---

## Alternativas (Opcional)

Si quieres usar otras APIs de imágenes:

1. **Unsplash API** (más confiable que Source)
   - https://unsplash.com/oauth/applications
   - 50 req/hora (free tier)

2. **Shutterstock** (premium)
   - https://www.shutterstock.com/developers

3. **Getty Images** (premium)
   - https://www.gettyimages.com/

Para agregar nuevas APIs, editar `scripts/curate-news.ts` en la sección LAYER 3.

---

## Preguntas Frecuentes

**P: ¿Necesito todas las APIs?**
R: No. Solo Pexels es suficiente. Las otras son fallbacks opcionales.

**P: ¿Qué pasa si no configuro ninguna API?**
R: El sistema usará Unsplash Source API, que puede fallar ocasionalmente (502).

**P: ¿Puedo usar solo Pixabay?**
R: Sí, pero Pexels es más confiable. Pixabay es mejor como fallback.

**P: ¿Los límites de rate se reinician?**
R: Sí, cada hora. Pexels: 200 req/hora, Pixabay: 50 req/hora.

**P: ¿Puedo aumentar los límites?**
R: Sí, con planes pagos. Pero los planes gratuitos son suficientes para la mayoría de casos.

---

## Soporte

Si tienes problemas:

1. Revisar logs: `npm run ai:curate`
2. Verificar que las API keys son válidas
3. Verificar conexión a internet
4. Esperar si se agotó el rate limit
5. Revisar documentación de las APIs

---

**Última actualización:** 2024
