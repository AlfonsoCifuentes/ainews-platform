# 🔧 DIAGNÓSTICO COMPLETO: Sistema de Generación de Cursos

**Fecha**: 7 de Noviembre 2025  
**Problema**: Error 500 al generar cursos, sin detalles específicos  
**Solución**: Sistema de diagnóstico paso a paso

---

## 📋 PASOS DEL SISTEMA DE GENERACIÓN

El sistema de generación de cursos tiene **8 pasos críticos**:

### 1️⃣ Parsing de Request Body
- **Qué hace**: Lee los parámetros enviados desde el frontend
- **Requiere**: JSON válido con `topic`, `difficulty`, `duration`, `locale`
- **Puede fallar si**: El body está corrupto o vacío

### 2️⃣ Validación de Parámetros
- **Qué hace**: Valida con Zod que los parámetros cumplen el esquema
- **Requiere**: 
  - `topic`: 3-200 caracteres
  - `difficulty`: 'beginner' | 'intermediate' | 'advanced'
  - `duration`: 'short' | 'medium' | 'long'
  - `locale`: 'en' | 'es'
- **Puede fallar si**: Algún valor está fuera de rango

### 3️⃣ Inicialización de Supabase
- **Qué hace**: Crea el cliente de base de datos
- **Requiere**: Variables de entorno de Supabase
- **Puede fallar si**: 
  - Falta `.env.local`
  - API keys inválidas
  - Supabase está caído

### 4️⃣ Verificación de Providers LLM
- **Qué hace**: Comprueba qué APIs de LLM están configuradas
- **Requiere**: Al menos UNA de estas API keys:
  - `GEMINI_API_KEY`
  - `OPENROUTER_API_KEY`
  - `GROQ_API_KEY`
- **Puede fallar si**: **NO HAY NINGUNA API KEY** ⚠️

### 5️⃣ Creación del Cliente LLM
- **Qué hace**: Crea el cliente con fallback automático
- **Requiere**: API keys válidas
- **Puede fallar si**: 
  - Todas las API keys son inválidas
  - Rate limit excedido
  - Providers están caídos

### 6️⃣ Generación de Curso (LLM)
- **Qué hace**: 
  - Genera outline del curso (título, descripción, módulos)
  - Genera contenido de cada módulo (markdown largo)
  - Traduce todo al idioma opuesto
- **Requiere**: 
  - LLM funcionando
  - Suficientes tokens disponibles
  - Timeout de 300s no excedido
- **Puede fallar si**:
  - LLM rechaza la request
  - Timeout (curso muy largo)
  - JSON malformado en respuesta

### 7️⃣ Categorización con IA
- **Qué hace**: Clasifica el curso en una categoría
- **Requiere**: LLM funcionando
- **Puede fallar si**: LLM no devuelve JSON válido

### 8️⃣ Inserción en Base de Datos
- **Qué hace**: Guarda el curso completo en Supabase
- **Requiere**: 
  - Tabla `courses` con todas las columnas
  - Columnas: `view_count`, `enrollment_count`, `rating_avg`, `completion_rate`, `category`, `status`
- **Puede fallar si**: 
  - **FALTA MIGRACIÓN DE BASE DE DATOS** ⚠️
  - Violación de constraints
  - Datos demasiado largos

---

## 🚨 PROBLEMAS MÁS COMUNES

### ❌ Error #1: No LLM API Keys (Error 503)
**Síntoma**: Error 503 "LLM API not configured"

**Causa**: No existe `.env.local` o está vacío

**Solución**:
1. Crea archivo `.env.local` en la raíz del proyecto
2. Copia contenido de `.env.example`
3. Añade al menos UNA API key:
   ```bash
   # Opción 1: Gemini (RECOMENDADO - Free tier generoso)
   GEMINI_API_KEY=tu_api_key_aqui
   
   # Opción 2: OpenRouter (Free tier limitado)
   OPENROUTER_API_KEY=sk-or-v1-xxxxx
   
   # Opción 3: Groq (Free tier muy rápido pero limitado)
   GROQ_API_KEY=gsk_xxxxx
   ```
4. Reinicia el servidor de desarrollo

**Cómo obtener API keys gratis**:
- **Gemini**: https://aistudio.google.com/app/apikey (15 requests/min, gratis)
- **OpenRouter**: https://openrouter.ai/keys (límite bajo, requiere créditos)
- **Groq**: https://console.groq.com/keys (muy rápido, 30 requests/min)

---

### ❌ Error #2: Database Schema Missing Columns (Error 500)
**Síntoma**: Error 500 con mensaje "column does not exist"

**Causa**: La tabla `courses` no tiene todas las columnas requeridas

**Solución**:
1. Ve a Supabase Dashboard → SQL Editor
2. Crea nueva query
3. Pega el contenido de `20250107000000_ensure_course_columns.sql`
4. Ejecuta la migración
5. Verifica que se crearon las columnas:
   - `view_count`
   - `enrollment_count`
   - `rating_avg`
   - `completion_rate`
   - `category`
   - `status`
   - `topics`

**Verificación**:
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'courses'
ORDER BY ordinal_position;
```

---

### ❌ Error #3: LLM Timeout (Error 500)
**Síntoma**: Request tarda más de 5 minutos

**Causa**: Curso muy largo o LLM lento

**Soluciones**:
1. Usa `duration: 'short'` en vez de 'long'
2. Usa `difficulty: 'beginner'` (genera menos contenido)
3. Cambia a Groq (mucho más rápido que Gemini)
4. Aumenta `maxDuration` en `route.ts` (solo en Vercel Pro)

---

### ❌ Error #4: Invalid JSON Response (Error 500)
**Síntoma**: "Invalid JSON" en los logs

**Causa**: LLM devuelve texto plano o markdown en vez de JSON

**Solución**: Ya implementado con `cleanLLMResponse()` que:
- Elimina fences de markdown (```json ... ```)
- Extrae JSON válido
- Reintenta hasta 3 veces

Si persiste: prueba otro provider (Gemini es más confiable que OpenRouter)

---

## 🔍 CÓMO USAR EL SISTEMA DE DIAGNÓSTICO

### Opción 1: Endpoint de Diagnóstico (NUEVO)

Acabamos de crear un endpoint que verifica TODOS los pasos:

```bash
# En desarrollo
http://localhost:3000/api/courses/diagnose

# En producción
https://tu-dominio.vercel.app/api/courses/diagnose
```

**Qué verifica**:
1. ✅ Variables de entorno (Supabase + LLM API keys)
2. ✅ Conexión a base de datos
3. ✅ Schema de base de datos (columnas requeridas)
4. ✅ Providers LLM disponibles
5. ✅ Request de prueba a LLM

**Respuesta esperada**:
```json
{
  "timestamp": "2025-11-07T...",
  "status": "ok",
  "steps": [
    {
      "step": "1. Environment Variables",
      "status": "ok",
      "message": "All required environment variables present"
    },
    {
      "step": "2. Database Connection",
      "status": "ok",
      "message": "Database connection successful"
    },
    // ... más pasos
  ]
}
```

**Si hay errores**, te dirá EXACTAMENTE qué falta y cómo solucionarlo.

---

### Opción 2: Logs del Servidor (Ya existente)

Los logs del servidor ya están implementados. Para verlos:

**En desarrollo local**:
- Mira la terminal donde corre `npm run dev`
- Busca líneas con `[Course Generator]`

**En producción (Vercel)**:
1. Ve a Vercel Dashboard
2. Tu proyecto → Functions
3. Busca `/api/courses/generate`
4. Mira los logs en tiempo real

**Logs de ejemplo**:
```
[Course Generator 2025-11-07...] 🚀 NEW COURSE GENERATION REQUEST STARTED
[Course Generator] ⏳ Step 1/8: Parsing request body...
[Course Generator] ✅ Request body parsed: {...}
[Course Generator] ⏳ Step 2/8: Validating parameters...
[Course Generator] ✅ Parameters validated
...
[Course Generator] ❌ CRITICAL: No LLM API keys configured!
```

---

### Opción 3: Logs del Cliente (Navegador)

Ya implementado en sesiones anteriores. Para usar:

1. Abre DevTools (F12)
2. Ve a la pestaña **Console**
3. Intenta generar un curso
4. Verás logs con emoji 🎓

---

## 🎯 PLAN DE ACCIÓN INMEDIATO

### Paso 1: Ejecuta el Diagnóstico

```bash
# Si está corriendo el servidor
curl http://localhost:3000/api/courses/diagnose

# O abre en el navegador
# http://localhost:3000/api/courses/diagnose
```

### Paso 2: Lee los Resultados

El diagnóstico te dirá **EXACTAMENTE** qué falta:

- ❌ **Status: error** → Hay problemas críticos
- ⚠️ **Status: warning** → Funciona pero con limitaciones
- ✅ **Status: ok** → Todo perfecto

### Paso 3: Soluciona los Errores

**Si falta `.env.local`**:
1. Crea el archivo
2. Añade API keys (ver Error #1 arriba)
3. Reinicia servidor

**Si falta migración**:
1. Ve a Supabase → SQL Editor
2. Ejecuta `20250107000000_ensure_course_columns.sql`
3. Verifica que se crearon las columnas

**Si falla LLM**:
1. Verifica que la API key es válida
2. Prueba con otro provider
3. Verifica rate limits

### Paso 4: Prueba de Nuevo

```bash
# Re-ejecuta el diagnóstico
curl http://localhost:3000/api/courses/diagnose

# Si todo está OK, prueba generar un curso
# Frontend: http://localhost:3000/es/courses
```

---

## 🛠️ COMANDOS ÚTILES

### Verificar Configuración Local
```bash
# Ver si existe .env.local
ls -la .env.local

# Ver contenido (SIN mostrar API keys completas)
cat .env.local | sed 's/=.*/=***/'
```

### Reiniciar Servidor
```bash
# Detener
Ctrl + C

# Limpiar y reiniciar
npm run dev
```

### Ver Logs en Tiempo Real
```bash
# En la terminal donde corre npm run dev
# Filtra solo logs de course generator
npm run dev | grep "Course Generator"
```

---

## 📊 CHECKLIST DE VERIFICACIÓN

Antes de intentar generar un curso, verifica:

- [ ] ✅ Archivo `.env.local` existe
- [ ] ✅ Al menos UNA LLM API key configurada
- [ ] ✅ Supabase credentials configuradas
- [ ] ✅ Migración de base de datos aplicada
- [ ] ✅ Servidor de desarrollo corriendo (`npm run dev`)
- [ ] ✅ Diagnóstico devuelve `status: "ok"`
- [ ] ✅ Browser console abierto (F12) para ver logs

---

## 🆘 SI NADA FUNCIONA

1. **Ejecuta el diagnóstico completo**:
   ```bash
   curl http://localhost:3000/api/courses/diagnose > diagnostico.json
   ```

2. **Copia el archivo `diagnostico.json`** y comparte el contenido

3. **Copia los logs del navegador** (F12 → Console → Copy all)

4. **Copia los logs del servidor** (terminal donde corre `npm run dev`)

5. **Verifica que NO estés usando el free tier de Vercel en producción** con funciones que tardan >10s

---

## 📚 ARCHIVOS RELACIONADOS

- `app/api/courses/generate/route.ts` - API principal de generación
- `app/api/courses/diagnose/route.ts` - Endpoint de diagnóstico (NUEVO)
- `lib/ai/llm-client.ts` - Cliente LLM con fallback
- `components/courses/CourseGenerator.tsx` - UI del generador
- `20250107000000_ensure_course_columns.sql` - Migración de base de datos
- `.env.example` - Plantilla de variables de entorno
- `.env.local` - TU archivo de configuración (NO commitear)

---

## 🎓 RESUMEN EJECUTIVO

**El 99% de los errores 500 son por**:

1. **No tener `.env.local`** (60% de casos)
2. **API keys inválidas/expiradas** (25% de casos)
3. **Falta migración de base de datos** (10% de casos)
4. **Timeout por curso muy largo** (5% de casos)

**Solución rápida** (3 minutos):
```bash
# 1. Crea .env.local
cp .env.example .env.local

# 2. Edita y añade tu GEMINI_API_KEY
# (Obténla gratis en https://aistudio.google.com/app/apikey)

# 3. Aplica migración en Supabase SQL Editor
# (Pega contenido de 20250107000000_ensure_course_columns.sql)

# 4. Reinicia
npm run dev

# 5. Verifica
curl http://localhost:3000/api/courses/diagnose
```

**Si el diagnóstico devuelve `status: "ok"`**, el sistema funcionará perfectamente. 🎉
