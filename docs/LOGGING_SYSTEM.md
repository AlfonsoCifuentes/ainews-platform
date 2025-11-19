# Debug Logging System

## Overview

Se implementó un sistema completo de logging para debugguear problemas en producción, incluyendo el React error #418 que estaba causando que la pantalla parpadeara cargando el leaderboard.

## Características

### 1. **Logger Class** (`lib/utils/logging.ts`)
- Captura todos los logs con timestamp y componente
- Almacena en `localStorage` (últimos 100 logs)
- Diferencia entre dev y producción
- Métodos: `debug()`, `info()`, `warn()`, `error()`

```typescript
import { logger } from '@/lib/utils/logging';

// Usar en cualquier lugar
logger.info('MyComponent', 'Component mounted', { data: 'value' });
logger.error('MyComponent', 'Error occurred', error);
```

### 2. **LogDashboard Component**
Flotante en esquina inferior derecha con:
- **Visualización en tiempo real** de logs conforme se generan
- **Filtrado** por nivel (all, error, warn, info, debug)
- **Búsqueda y expansión** de detalles de cada log
- **Copiar logs** al clipboard
- **Exportar logs** como JSON
- **Auto-scroll** toggle
- **Indicador visual** de errores (badge rojo si hay errores)

### 3. **ErrorBoundary con Logging**
Captura errores React y los registra automáticamente:

```typescript
<ErrorBoundary componentName="AILeaderboardPodium">
  <AILeaderboardPodium locale={locale} />
</ErrorBoundary>
```

### 4. **AILeaderboardPodium Logging**
Logging detallado en cada etapa:
- Cuando comienza la fetch
- Estado de la respuesta API
- Datos parseados exitosamente
- Fallback a datos por defecto si falla
- Cada modelo que se renderiza

## Cómo Acceder a los Logs

### En el Navegador
1. Abre cualquier página de la aplicación
2. Mira esquina inferior derecha → botón gris "Logs"
3. Haz click para abrir el panel flotante
4. Verás todos los logs en tiempo real

### En localStorage
Los logs se guardan automáticamente:
```javascript
// En la consola del navegador:
console.log(JSON.parse(localStorage.getItem('ai-news-logs')))
```

### Exportar Logs
1. Abre el LogDashboard
2. Haz click en el botón 📥 para descargar JSON
3. O haz click en icono de copiar para copiar al clipboard

## Debugging del Error #418

El error "Minified React error #418" significa que se intentó renderizar algo que no es un componente React válido (como `null`, `undefined`, o un string cuando se espera un componente).

**Cómo investigar:**
1. Abre LogDashboard
2. Filtra por "ERROR" para ver qué falló
3. Expande el error para ver el stack trace
4. Busca "AILeaderboard" en los logs para ver qué etapa falló

## Problemas Solucionados

### ✅ HTTP 400 en Logos SVG
- **Problema**: Next.js Image Optimizer no soporta SVG
- **Solución**: Data URIs SVG inlined (`data:image/svg+xml,...`)

### ✅ Infinite Loop en useNotifications
- **Problema**: Hook refetch infinito por dependency issue
- **Solución**: Proper dependency array + AbortSignal timeout

### ✅ React error #418
- **Investigación en progreso**: LogDashboard capturará logs cuando ocurra

## Próximos Pasos

1. Abre la aplicación en producción
2. Navega a `/en/news` o `/es/news`
3. Abre LogDashboard (esquina inferior derecha)
4. Si aparece error, haz click en él para expandir detalles
5. Exporta los logs para compartir conmigo

## Archivos Creados/Modificados

```
✅ lib/utils/logging.ts                    - Logger class
✅ components/shared/LogDashboard.tsx      - UI para visualizar logs
✅ hooks/use-leaderboard-diagnostics.ts    - Hooks opcionales para diagnóstico
✅ components/shared/ErrorBoundary.tsx     - Mejorado con logging
✅ components/trending/AILeaderboardPodium.tsx - Logging agregado
✅ app/[locale]/news/page.tsx              - Wrapped con ErrorBoundary
✅ app/[locale]/layout.tsx                 - LogDashboard agregado
```

## Notas Técnicas

- Los logs se limpian automáticamente cuando llegan a 500 (se mantienen últimos 100 en localStorage)
- Funciona en dev y production
- No afecta performance (logs se actualizan cada 1 segundo)
- Los error handlers globales capturan errores no manejados
- Compatible con todos los navegadores (usa localStorage)
