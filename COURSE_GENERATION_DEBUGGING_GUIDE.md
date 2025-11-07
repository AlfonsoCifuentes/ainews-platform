# 🔍 Guía de Debugging para Generación de Cursos

## Sistema de Logs Implementado

Se ha implementado un **sistema de logging exhaustivo** en la API de generación de cursos (`/api/courses/generate`) que registra cada paso del proceso con timestamps, emojis visuales y detalles completos.

---

## 📋 Pasos del Proceso (8 Fases)

El proceso de generación de cursos se divide en 8 pasos principales, cada uno con logging detallado:

### **Paso 1/8: Parsing Request Body**
```
[Course Generator 2025-01-07T...] ⏳ Step 1/8: Parsing request body...
[Course Generator 2025-01-07T...] ✅ Request body parsed: { topic, difficulty, duration, locale }
```

### **Paso 2/8: Validating Parameters**
```
[Course Generator 2025-01-07T...] ⏳ Step 2/8: Validating parameters...
[Course Generator 2025-01-07T...] ✅ Parameters validated: { ... }
```

### **Paso 3/8: Initializing Supabase**
```
[Course Generator 2025-01-07T...] ⏳ Step 3/8: Initializing Supabase client...
[Course Generator 2025-01-07T...] ✅ Supabase client initialized
```

### **Paso 4/8: Checking LLM Providers**
```
[Course Generator 2025-01-07T...] ⏳ Step 4/8: Checking LLM providers...
[Course Generator 2025-01-07T...] 📊 Available providers: ['gemini', 'openrouter', 'groq']
[Course Generator 2025-01-07T...] 🔑 API Keys status: {
  hasGemini: true,
  hasOpenRouter: true,
  hasGroq: true,
  geminiKeyLength: 39,
  openRouterKeyLength: 48,
  groqKeyLength: 56
}
```

### **Paso 5/8: Creating LLM Client**
```
[Course Generator 2025-01-07T...] ⏳ Step 5/8: Creating LLM client with fallback...
[Course Generator 2025-01-07T...] ✅ LLM client created successfully
[Course Generator 2025-01-07T...] 🤖 Active providers: gemini → openrouter → groq
```

### **Paso 6/8: Generating Course**
```
[Course Generator 2025-01-07T...] ⏳ Step 6/8: Generating course "Advanced RAG Systems" (advanced, medium)...
[Course Generator 2025-01-07T...] 🔍 Building RAG context for topic: "Advanced RAG Systems"...
[Course Generator 2025-01-07T...] ✅ Context built successfully, length: 2847 chars
[Course Generator 2025-01-07T...] 📝 Context preview: Recent developments in AI...
[Course Generator 2025-01-07T...] 🌐 Target language: English
[Course Generator 2025-01-07T...] 📋 Creating course outline...
[Course Generator 2025-01-07T...] Prompt length: 1523 chars

[LLM Retry] Starting classification with max 3 attempts...
[LLM Retry] Attempt 1/3 - Sending request to LLM...
[LLM Retry] ✅ Attempt 1 succeeded!

[Course Generator 2025-01-07T...] ✅ Course outline created successfully!
[Course Generator 2025-01-07T...] 📚 Title: "Advanced RAG Systems"
[Course Generator 2025-01-07T...] 📝 Description: "Master retrieval-augmented generation..."
[Course Generator 2025-01-07T...] 📦 Modules count: 5
[Course Generator 2025-01-07T...] Module 1: "Introduction to RAG" (15 min, 3 topics)
[Course Generator 2025-01-07T...] Module 2: "Vector Databases" (20 min, 4 topics)
...

[Course Generator 2025-01-07T...] ⏳ Generating detailed content for 5 modules...
[Course Generator 2025-01-07T...] 📝 Module 1/5: "Introduction to RAG"...
[Course Generator 2025-01-07T...] Generating content (this may take 10-30 seconds)...
[LLM Retry] Starting classification with max 3 attempts...
[LLM Retry] Attempt 1/3 - Sending request to LLM...
[LLM Retry] ✅ Attempt 1 succeeded!
[Course Generator 2025-01-07T...] ✅ Content generated: 3452 chars, 4 resources
[Course Generator 2025-01-07T...] ✅ Module 1/5 completed successfully
...

[Course Generator 2025-01-07T...] ✅ All 5 modules generated successfully!
[Course Generator 2025-01-07T...] ⏳ Building course bundle...
[Course Generator 2025-01-07T...] ✅ Course bundle built
[Course Generator 2025-01-07T...] 🌍 Translating to Spanish...
[Course Generator 2025-01-07T...] ✅ Translation completed successfully
```

### **Paso 7/8: Preparing Database Records**
```
[Course Generator 2025-01-07T...] ⏳ Step 7/8: Preparing database records...
[Course Generator 2025-01-07T...] 🏷️  Auto-categorized as: "machine-learning"
[Course Generator 2025-01-07T...] 🏷️  Topics: [RAG, Vector Search, Embeddings, LLMs]
[Course Generator 2025-01-07T...] ⏱️  Total duration: 95 minutes
[Course Generator 2025-01-07T...] 💾 Inserting course into database...
[Course Generator 2025-01-07T...] 📊 Course data: { title_en, title_es, ... }
[Course Generator 2025-01-07T...] ✅ Course inserted successfully! ID: 12345
```

### **Paso 8/8: Inserting Modules**
```
[Course Generator 2025-01-07T...] ⏳ Step 8/8: Inserting 5 modules...
[Course Generator 2025-01-07T...] 💾 Module 1/5: "Introduction to RAG"...
[Course Generator 2025-01-07T...] Content lengths: EN=3452, ES=3621
[Course Generator 2025-01-07T...] Resources: 4, Estimated time: 15 min
[Course Generator 2025-01-07T...] ✅ Module 1/5 inserted successfully
...
[Course Generator 2025-01-07T...] ✅ All modules inserted successfully!
```

### **Final Success**
```
================================================================================
[Course Generator 2025-01-07T...] 🎉 SUCCESS! Course "Advanced RAG Systems" generated in 127.45s
[Course Generator 2025-01-07T...] 📦 Course ID: 12345
[Course Generator 2025-01-07T...] 📚 Modules: 5
[Course Generator 2025-01-07T...] ⏱️  Duration: 95 minutes
================================================================================
```

---

## ❌ Errores Comunes y sus Logs

### **Error 1: No LLM API Keys Configured**
```
[Course Generator 2025-01-07T...] ❌ CRITICAL: No LLM API keys configured!
[Course Generator 2025-01-07T...] 💡 Add at least one API key to .env.local:
[Course Generator 2025-01-07T...] - GEMINI_API_KEY=your_key_here
[Course Generator 2025-01-07T...] - OPENROUTER_API_KEY=your_key_here
[Course Generator 2025-01-07T...] - GROQ_API_KEY=your_key_here

Response: 503 Service Unavailable
```

**Solución**: Agregar al menos una API key en `.env.local`

---

### **Error 2: LLM Generation Failed (All Retries Exhausted)**
```
[LLM Retry] Starting classification with max 3 attempts...
[LLM Retry] Attempt 1/3 - Sending request to LLM...
[LLM Retry] ❌ Attempt 1/3 failed: Rate limit exceeded
[LLM Retry] ⏳ Waiting 500ms before retry...
[LLM Retry] Attempt 2/3 - Sending request to LLM...
[LLM Retry] ❌ Attempt 2/3 failed: Rate limit exceeded
[LLM Retry] ⏳ Waiting 1000ms before retry...
[LLM Retry] Attempt 3/3 - Sending request to LLM...
[LLM Retry] ❌ Attempt 3/3 failed: Rate limit exceeded
[LLM Retry] ❌ All 3 attempts failed!

[Course Generator 2025-01-07T...] ❌ COURSE GENERATION FAILED after 5.23s
Error: Rate limit exceeded
```

**Solución**: 
- Esperar unos minutos y reintentar
- Usar un provider diferente (Groq tiene rate limits más altos)
- Actualizar a un plan de pago del LLM provider

---

### **Error 3: Database Insert Failed**
```
[Course Generator 2025-01-07T...] 💾 Inserting course into database...
[Course Generator 2025-01-07T...] ❌ DATABASE ERROR inserting course: {
  code: '23502',
  message: 'null value in column "status" violates not-null constraint',
  details: 'Failing row contains (12345, ..., null, ...)',
  hint: 'Check the table schema'
}

Response: 500 Internal Server Error
```

**Solución**: 
- Aplicar la migración de base de datos pendiente:
  ```sql
  -- supabase/migrations/20250107000000_ensure_course_columns.sql
  ```
- Verificar que todas las columnas requeridas existan con defaults correctos

---

### **Error 4: Zod Validation Error**
```
[Course Generator 2025-01-07T...] 🔍 Zod validation error: [
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": ["topic"],
    "message": "Required"
  }
]
[Course Generator 2025-01-07T...] Error 1: topic - Required

Response: 400 Bad Request
```

**Solución**: Verificar que el request body incluya todos los campos requeridos:
```json
{
  "topic": "Advanced RAG Systems",
  "difficulty": "advanced",
  "duration": "medium",
  "locale": "en"
}
```

---

## 🛠️ Cómo Usar los Logs para Debugging

### 1. **Abrir la Consola del Navegador**
   - Chrome/Edge: `F12` → pestaña "Console"
   - Firefox: `F12` → pestaña "Consola"

### 2. **Filtrar Logs del Course Generator**
   - En el campo de filtro, escribe: `Course Generator`
   - Esto mostrará solo los logs relacionados con generación de cursos

### 3. **Identificar el Paso que Falla**
   - Busca el último `✅` (paso exitoso)
   - El siguiente log después será el error
   - Ejemplo:
     ```
     ✅ Step 5/8: Creating LLM client...
     ❌ COURSE GENERATION FAILED after 2.34s
     ```
     → El error ocurrió en el Paso 6 (generación de curso)

### 4. **Revisar Detalles del Error**
   - Los errores incluyen:
     - `Error type`: Tipo de error (ZodError, DatabaseError, etc.)
     - `Error message`: Mensaje descriptivo
     - `Error stack`: Stack trace completo
     - Detalles específicos (code, hint, details para DB errors)

### 5. **Verificar Estado de LLM Providers**
   - Busca: `🔑 API Keys status`
   - Verifica que al menos un provider esté configurado
   - Verifica la longitud de las keys (deben ser > 0)

### 6. **Verificar Context Building**
   - Busca: `🔍 Building RAG context`
   - Si dice `Context built successfully`, el RAG funciona
   - Si falla, continuará sin contexto (no es crítico)

### 7. **Monitorear Reintentos de LLM**
   - Busca: `[LLM Retry] Attempt X/3`
   - Si todos fallan, hay un problema con el LLM provider
   - Si alguno tiene éxito, todo bien

---

## 📊 Ejemplo de Log Completo Exitoso

```
================================================================================
[Course Generator 2025-01-07T12:34:56.789Z] 🚀 NEW COURSE GENERATION REQUEST STARTED
================================================================================
[Course Generator 2025-01-07T12:34:56.790Z] ⏳ Step 1/8: Parsing request body...
[Course Generator 2025-01-07T12:34:56.791Z] ✅ Request body parsed: {
  "topic": "Advanced RAG Systems",
  "difficulty": "advanced",
  "duration": "medium",
  "locale": "en"
}
[Course Generator 2025-01-07T12:34:56.792Z] ⏳ Step 2/8: Validating parameters...
[Course Generator 2025-01-07T12:34:56.793Z] ✅ Parameters validated
[Course Generator 2025-01-07T12:34:56.794Z] ⏳ Step 3/8: Initializing Supabase client...
[Course Generator 2025-01-07T12:34:56.795Z] ✅ Supabase client initialized
[Course Generator 2025-01-07T12:34:56.796Z] ⏳ Step 4/8: Checking LLM providers...
[Course Generator 2025-01-07T12:34:56.797Z] 📊 Available providers: ["groq"]
[Course Generator 2025-01-07T12:34:56.798Z] 🔑 API Keys status: {
  hasGemini: false,
  hasOpenRouter: false,
  hasGroq: true,
  geminiKeyLength: 0,
  openRouterKeyLength: 0,
  groqKeyLength: 56
}
[Course Generator 2025-01-07T12:34:56.799Z] ⏳ Step 5/8: Creating LLM client with fallback...
[Course Generator 2025-01-07T12:34:56.850Z] ✅ LLM client created successfully
[Course Generator 2025-01-07T12:34:56.851Z] 🤖 Active providers: groq
[Course Generator 2025-01-07T12:34:56.852Z] ⏳ Step 6/8: Generating course "Advanced RAG Systems" (advanced, medium)...
[Course Generator 2025-01-07T12:34:56.853Z] 🔍 Building RAG context for topic: "Advanced RAG Systems"...
[Course Generator 2025-01-07T12:34:57.234Z] ✅ Context built successfully, length: 2847 chars
[Course Generator 2025-01-07T12:34:57.235Z] 📝 Context preview: Recent developments in AI include...
[Course Generator 2025-01-07T12:34:57.236Z] 🌐 Target language: English
[Course Generator 2025-01-07T12:34:57.237Z] 📋 Creating course outline...
[Course Generator 2025-01-07T12:34:57.238Z] Prompt length: 1523 chars
[LLM Retry] Starting classification with max 3 attempts...
[LLM Retry] Attempt 1/3 - Sending request to LLM...
[LLM Retry] ✅ Attempt 1 succeeded!
[Course Generator 2025-01-07T12:35:02.456Z] ✅ Course outline created successfully!
[Course Generator 2025-01-07T12:35:02.457Z] 📚 Title: "Advanced RAG Systems: From Theory to Production"
[Course Generator 2025-01-07T12:35:02.458Z] 📝 Description: "Master retrieval-augmented generation..."
[Course Generator 2025-01-07T12:35:02.459Z] 📦 Modules count: 5
[Course Generator 2025-01-07T12:35:02.460Z] Module 1: "Introduction to RAG" (15 min, 3 topics)
[Course Generator 2025-01-07T12:35:02.461Z] Module 2: "Vector Databases" (20 min, 4 topics)
[Course Generator 2025-01-07T12:35:02.462Z] Module 3: "Advanced Retrieval Strategies" (25 min, 5 topics)
[Course Generator 2025-01-07T12:35:02.463Z] Module 4: "Production RAG Systems" (20 min, 4 topics)
[Course Generator 2025-01-07T12:35:02.464Z] Module 5: "Evaluation & Optimization" (15 min, 3 topics)
[Course Generator 2025-01-07T12:35:02.465Z] ⏳ Generating detailed content for 5 modules...
[Course Generator 2025-01-07T12:35:02.466Z] 📝 Module 1/5: "Introduction to RAG"...
[Course Generator 2025-01-07T12:35:02.467Z] Generating content (this may take 10-30 seconds)...
[LLM Retry] Starting classification with max 3 attempts...
[LLM Retry] Attempt 1/3 - Sending request to LLM...
[LLM Retry] ✅ Attempt 1 succeeded!
[Course Generator 2025-01-07T12:35:18.234Z] ✅ Content generated: 3452 chars, 4 resources
[Course Generator 2025-01-07T12:35:18.235Z] ✅ Module 1/5 completed successfully
... (módulos 2-5) ...
[Course Generator 2025-01-07T12:36:45.123Z] ✅ All 5 modules generated successfully!
[Course Generator 2025-01-07T12:36:45.124Z] ⏳ Building course bundle...
[Course Generator 2025-01-07T12:36:45.125Z] ✅ Course bundle built
[Course Generator 2025-01-07T12:36:45.126Z] 🌍 Translating to Spanish...
[LLM Retry] Starting classification with max 3 attempts...
[LLM Retry] Attempt 1/3 - Sending request to LLM...
[LLM Retry] ✅ Attempt 1 succeeded!
[Course Generator 2025-01-07T12:37:02.456Z] ✅ Translation completed successfully
[Course Generator 2025-01-07T12:37:02.457Z] ⏳ Step 7/8: Preparing database records...
[Course Generator 2025-01-07T12:37:02.458Z] 🏷️  Auto-categorized as: "machine-learning"
[Course Generator 2025-01-07T12:37:02.459Z] 🏷️  Topics: [RAG, Vector Search, Embeddings, LLMs, Production]
[Course Generator 2025-01-07T12:37:02.460Z] ⏱️  Total duration: 95 minutes
[Course Generator 2025-01-07T12:37:02.461Z] 💾 Inserting course into database...
[Course Generator 2025-01-07T12:37:02.462Z] 📊 Course data: { title_en: "Advanced RAG...", ... }
[Course Generator 2025-01-07T12:37:03.234Z] ✅ Course inserted successfully! ID: 42
[Course Generator 2025-01-07T12:37:03.235Z] ⏳ Step 8/8: Inserting 5 modules...
[Course Generator 2025-01-07T12:37:03.236Z] 💾 Module 1/5: "Introduction to RAG"...
[Course Generator 2025-01-07T12:37:03.237Z] Content lengths: EN=3452, ES=3621
[Course Generator 2025-01-07T12:37:03.238Z] Resources: 4, Estimated time: 15 min
[Course Generator 2025-01-07T12:37:03.456Z] ✅ Module 1/5 inserted successfully
... (módulos 2-5) ...
[Course Generator 2025-01-07T12:37:04.789Z] ✅ All modules inserted successfully!
[Course Generator 2025-01-07T12:37:04.790Z] 📊 Logging AI system activity...
================================================================================
[Course Generator 2025-01-07T12:37:04.891Z] 🎉 SUCCESS! Course "Advanced RAG Systems: From Theory to Production" generated in 128.10s
[Course Generator 2025-01-07T12:37:04.892Z] 📦 Course ID: 42
[Course Generator 2025-01-07T12:37:04.893Z] 📚 Modules: 5
[Course Generator 2025-01-07T12:37:04.894Z] ⏱️  Duration: 95 minutes
================================================================================
```

---

## 🔧 Troubleshooting Rápido

| Síntoma | Buscar en Logs | Solución |
|---------|---------------|----------|
| Error 500 genérico | `❌ COURSE GENERATION FAILED` | Ver el error específico en los logs siguientes |
| No genera contenido | `[LLM Retry] ❌ All attempts failed` | Verificar API keys y rate limits |
| Curso sin módulos | `❌ ERROR inserting module` | Ver error de base de datos, aplicar migración |
| Traducción falla | `⚠️ Translation failed` | No crítico, se usa solo idioma primario |
| API keys no detectadas | `🔑 API Keys status: { hasGroq: false }` | Agregar keys a `.env.local` y reiniciar |

---

## ✅ Verificación Post-Deployment

Después de deployment, verificar:

1. ✅ Logs visibles en consola del navegador
2. ✅ Timestamps presentes en cada log
3. ✅ Emojis visuales renderizados correctamente
4. ✅ Stack traces completos en errores
5. ✅ Tiempo total de ejecución mostrado en success/failure

---

## 📝 Notas Importantes

- **Los logs están en inglés** para mantener consistencia con el código
- **Timestamps incluyen milisegundos** para debugging preciso
- **Emojis ayudan a identificar visualmente** estados (✅ success, ❌ error, ⏳ loading, etc.)
- **Todos los errores incluyen sugerencias** de solución cuando es posible
- **No se exponen API keys completas**, solo longitudes para verificación
- **Los logs persisten en consola** incluso después de errores 500

---

## 🚀 Próximos Pasos

Una vez que identifiques el error específico con los logs:

1. Reporta el mensaje de error exacto
2. Incluye el timestamp del error
3. Copia el stack trace completo si está disponible
4. Indica en qué paso falló (Step X/8)
5. Comparte el estado de los API keys (sin exponer las keys)

Con esta información será mucho más fácil diagnosticar y resolver el problema! 🎯
