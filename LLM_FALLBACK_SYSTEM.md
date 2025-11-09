# 🔄 Sistema de Fallback Multi-Proveedor LLM

## 📋 Resumen

Se ha implementado un **sistema robusto de fallback** que intenta **TODOS los proveedores LLM disponibles** antes de fallar, con **mensajes de error detallados y accionables**.

## 🎯 Problema Resuelto

**ANTES:**
- ❌ Solo usaba un proveedor LLM a la vez
- ❌ Si ese proveedor tenía rate limit → error 500 genérico
- ❌ Mensaje de error poco útil: "Failed to generate course"
- ❌ No intentaba otros proveedores disponibles

**AHORA:**
- ✅ Intenta **TODOS** los proveedores configurados secuencialmente
- ✅ Cada proveedor tiene 2 intentos con backoff exponencial
- ✅ Errores **categorizados y detallados** (rate_limit, auth, timeout, network, etc.)
- ✅ Mensajes **accionables** que explican qué hacer
- ✅ Solo falla cuando **TODOS** los proveedores han sido agotados

---

## 🤖 Proveedores Disponibles (En Orden de Prioridad)

La plataforma ahora intenta estos proveedores en este orden:

1. **Anthropic Claude** (`ANTHROPIC_API_KEY`) - Mejor para respuestas JSON estructuradas
2. **DeepSeek** (`DEEPSEEK_API_KEY`) - Alta calidad, proveedor chino, económico
3. **Mistral AI** (`MISTRAL_API_KEY`) - Alta calidad, proveedor europeo
4. **Google Gemini** (`GEMINI_API_KEY`) - Gemini 2.0 Flash
5. **OpenRouter** (`OPENROUTER_API_KEY`) - Gateway multi-proveedor
6. **Groq** (`GROQ_API_KEY`) - Inferencia rápida
7. **Together AI** (`TOGETHER_API_KEY`) - Modelos Meta Llama

**💡 Recomendación:** Configura **al menos 2-3 proveedores** para máxima redundancia.

---

## 🔧 Nueva Arquitectura

### 1. Clasificación de Errores (`classifyLLMError`)

Cada error se clasifica en:

| Tipo | Descripción | Retryable | HTTP Status |
|------|-------------|-----------|-------------|
| `rate_limit` | Límite de uso excedido | ✅ Sí | 429 |
| `auth` | Error de autenticación/API key | ❌ No | 503 |
| `timeout` | Request tardó demasiado | ✅ Sí | 504 |
| `network` | No se puede alcanzar el proveedor | ✅ Sí | 503 |
| `validation` | Respuesta malformada | ✅ Sí | 500 |
| `config` | Proveedor no configurado | ❌ No | 503 |
| `unknown` | Error desconocido | ✅ Sí | 500 |

### 2. Sistema de Fallback (`classifyWithAllProviders`)

```typescript
// Intenta TODOS los proveedores disponibles
for (const provider of ['anthropic', 'deepseek', 'mistral', ...]) {
  try {
    // Crea cliente para este proveedor
    const client = createLLMClient(provider);
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        // Intenta la clasificación/generación
        const result = await client.classify(prompt, schema, systemPrompt);
        return { result, provider, attempts };
      } catch (error) {
        const errorInfo = classifyLLMError(error);
        
        // Si no es retryable (auth error), salta al siguiente proveedor
        if (!errorInfo.retryable) break;
        
        // Espera antes del retry (500ms * attempt)
        await sleep(500 * attempt);
      }
    }
  } catch (clientError) {
    // Proveedor no disponible, continúa con el siguiente
    continue;
  }
}

// Si todos fallan, genera reporte detallado
throw new DetailedError(...);
```

### 3. Mensajes de Error Mejorados

#### Ejemplo de Error de Rate Limit (Todos los Proveedores Agotados):

```
❌ Course generation failed - all 3 AI providers exhausted after 6 attempts.

📋 FAILURE DETAILS:
  • anthropic (attempt 1): RATE_LIMIT - Rate limit exceeded. 429 Too Many Requests
  • anthropic (attempt 2): RATE_LIMIT - Rate limit exceeded. 429 Too Many Requests
  • deepseek (attempt 1): RATE_LIMIT - Rate limit exceeded. quota exceeded
  • deepseek (attempt 2): RATE_LIMIT - Rate limit exceeded. quota exceeded
  • gemini (attempt 1): RATE_LIMIT - Rate limit exceeded. 429 Resource exhausted
  • gemini (attempt 2): RATE_LIMIT - Rate limit exceeded. 429 Resource exhausted

💡 RECOMMENDED ACTIONS:
  ⏰ RATE LIMIT: You've hit usage limits. Wait 5-10 minutes or add more API keys for redundancy.

🔧 TROUBLESHOOTING:
  1. Check your API keys are correctly configured in .env.local
  2. Verify you haven't exceeded free tier limits
  3. Try again in a few minutes (rate limits reset)
  4. Add more API keys for better redundancy

Available providers: anthropic, deepseek, gemini
```

#### Ejemplo de Error de Configuración:

```
❌ CRITICAL: No LLM providers configured!

Please add at least one API key to your .env.local file:
  • ANTHROPIC_API_KEY=sk-ant-... (Recommended - best for JSON)
  • DEEPSEEK_API_KEY=sk-... (High quality, affordable)
  • MISTRAL_API_KEY=... (European provider, high quality)
  • GEMINI_API_KEY=... (Google Gemini)
  • OPENROUTER_API_KEY=sk-or-... (Multi-provider gateway)
  • GROQ_API_KEY=... (Fast inference)
  • TOGETHER_API_KEY=... (Meta models)

Get free API keys from:
  • Anthropic: https://console.anthropic.com/
  • DeepSeek: https://platform.deepseek.com/
  • Mistral: https://console.mistral.ai/
  • Google AI Studio: https://aistudio.google.com/
  • OpenRouter: https://openrouter.ai/
  • Groq: https://console.groq.com/
  • Together AI: https://api.together.xyz/
```

---

## 📊 Respuestas HTTP Específicas

El endpoint `/api/courses/generate` ahora devuelve códigos HTTP apropiados:

| Error Type | HTTP Status | User Message |
|------------|-------------|--------------|
| Rate Limit | 429 | "⏰ Rate limit exceeded. All AI providers are currently at capacity. Please try again in 5-10 minutes." |
| Auth Error | 503 | "🔑 Authentication error. The AI service configuration is invalid. Please contact the administrator." |
| Timeout | 504 | "⏱️ Request timeout. The AI service took too long to respond. Try a simpler course topic or try again later." |
| Network Error | 503 | "🌐 Network error. Cannot reach AI services. Please check your connection and try again." |
| Config Error | 503 | "⚙️ Configuration error. AI services are not properly configured. Please contact the administrator." |
| Validation Error | 500 | "⚠️ AI response validation failed. The AI returned malformed data. This is usually temporary - please try again." |

---

## 🔬 Ejemplo de Logs en Consola

```
[Course Generator 2025-01-09T10:30:00.000Z] 🚀 NEW COURSE GENERATION REQUEST STARTED
[Course Generator 2025-01-09T10:30:00.000Z] ✅ Parameters validated
[Course Generator 2025-01-09T10:30:00.000Z] 📊 Available providers: ['anthropic', 'deepseek', 'mistral', 'gemini']
[Course Generator 2025-01-09T10:30:00.000Z] ✅ Step 5/8: Found 4 available providers: anthropic, deepseek, mistral, gemini
[Course Generator 2025-01-09T10:30:00.000Z] 🤖 Provider fallback order: anthropic → deepseek → mistral → gemini

[LLM Fallback] 🔄 Starting multi-provider fallback with 4 providers available
[LLM Fallback] 📋 Provider order: anthropic → deepseek → mistral → gemini

[LLM Fallback] 🤖 Trying provider: ANTHROPIC
[LLM Fallback] ✅ anthropic client initialized
[LLM Fallback] 🔄 anthropic attempt 1/2...
[LLM Fallback] ❌ anthropic attempt 1/2 failed:
[LLM Fallback]    Type: rate_limit
[LLM Fallback]    Message: Rate limit exceeded. 429 Too Many Requests
[LLM Fallback]    Retryable: true
[LLM Fallback] ⏳ Waiting 500ms before retry...
[LLM Fallback] 🔄 anthropic attempt 2/2...
[LLM Fallback] ❌ anthropic attempt 2/2 failed:
[LLM Fallback]    Type: rate_limit
[LLM Fallback]    Message: Rate limit exceeded. 429 Too Many Requests
[LLM Fallback]    Retryable: true
[LLM Fallback] ⚠️  anthropic exhausted all 2 attempts, trying next provider...

[LLM Fallback] 🤖 Trying provider: DEEPSEEK
[LLM Fallback] ✅ deepseek client initialized
[LLM Fallback] 🔄 deepseek attempt 1/2...
[LLM Fallback] ✅ SUCCESS with deepseek on attempt 1!
[LLM Fallback] 📊 Total attempts across all providers: 3

[Course Generator 2025-01-09T10:30:05.000Z] ✅ Course outline created successfully with deepseek!
```

---

## 🎓 Uso en el Código

### Generación de Outline:

```typescript
const { result: outline, provider: outlineProvider } = await classifyWithProviderFallback(
  outlinePrompt,
  CourseOutlineSchema,
  JSON_SYSTEM_PROMPT,
);

console.log(`✅ Course outline created successfully with ${outlineProvider}!`);
```

### Generación de Módulos:

```typescript
for (const moduleOutline of outline.modules) {
  const { result: moduleContent } = await classifyWithProviderFallback(
    modulePrompt,
    ModuleContentSchema,
    JSON_SYSTEM_PROMPT,
  );
  // moduleContent ahora tiene el contenido generado
}
```

### Traducción:

```typescript
async function translateCourse(
  sourceLocale: 'en' | 'es',
  targetLocale: 'en' | 'es',
  course: CourseContentBundle
): Promise<CourseTranslation> {
  const { result } = await classifyWithProviderFallback(
    prompt, 
    CourseTranslationSchema, 
    JSON_SYSTEM_PROMPT
  );
  return result;
}
```

---

## 📈 Ventajas del Nuevo Sistema

### 1. **Máxima Disponibilidad**
- Si un proveedor falla, automáticamente intenta el siguiente
- Múltiples proveedores = múltiples oportunidades de éxito
- Reduce drásticamente la tasa de error

### 2. **Errores Accionables**
- El usuario sabe **exactamente** qué pasó
- Sabe **cuándo** reintentar (rate limit) vs **cuándo** no tiene sentido (config error)
- Los administradores ven logs detallados con clasificación de errores

### 3. **Resiliencia Automática**
- No se necesita intervención manual
- El sistema se auto-recupera si un proveedor vuelve a estar disponible
- Backoff exponencial evita sobrecargar proveedores

### 4. **Observabilidad**
- Todos los intentos se loggean
- Se guarda en `ai_system_logs` con el proveedor usado
- Métricas: intentos totales, proveedor exitoso, tiempo de ejecución

### 5. **Escalabilidad**
- Fácil añadir nuevos proveedores
- Solo requiere agregar API key al `.env.local`
- El sistema los detecta y usa automáticamente

---

## 🔑 Configuración de API Keys

### Archivo `.env.local`:

```bash
# === LLM Providers (Configure at least 2-3 for redundancy) ===

# Anthropic Claude (Recommended - Best for JSON)
ANTHROPIC_API_KEY=sk-ant-api03-...

# DeepSeek (High quality, affordable)
DEEPSEEK_API_KEY=sk-...

# Mistral AI (European provider, high quality)
MISTRAL_API_KEY=...

# Google Gemini
GEMINI_API_KEY=...

# OpenRouter (Multi-provider gateway)
OPENROUTER_API_KEY=sk-or-v1-...

# Groq (Fast inference)
GROQ_API_KEY=gsk_...

# Together AI (Meta models)
TOGETHER_API_KEY=...
```

### Obtener API Keys Gratis:

| Proveedor | URL | Tier Gratuito |
|-----------|-----|---------------|
| Anthropic | https://console.anthropic.com/ | Créditos iniciales |
| DeepSeek | https://platform.deepseek.com/ | Rate limit generoso |
| Mistral | https://console.mistral.ai/ | Créditos de prueba |
| Google Gemini | https://aistudio.google.com/ | Tier gratuito permanente |
| OpenRouter | https://openrouter.ai/ | $1 de crédito gratis |
| Groq | https://console.groq.com/ | Rate limit gratuito |
| Together AI | https://api.together.xyz/ | Créditos de prueba |

---

## 🚀 Testing

### Probar Rate Limit Handling:

1. Configura solo 1 proveedor
2. Genera múltiples cursos seguidos hasta agotar el rate limit
3. Verifica que el error sea claro y accionable

### Probar Multi-Provider Fallback:

1. Configura 3+ proveedores
2. Genera un curso
3. Verifica en los logs qué proveedor fue usado
4. Si el primero falla, verifica que intente el siguiente

### Probar Error Messages:

1. Elimina todos los API keys → Error de configuración
2. Usa API key inválido → Error de autenticación
3. Desconecta internet → Error de red

---

## 📝 Archivo Modificados

### 1. `lib/ai/llm-client.ts`
- ✅ Añadido `classifyLLMError()` - Clasificación de errores
- ✅ Añadido `classifyWithAllProviders()` - Sistema de fallback
- ✅ Añadido `generateActionableAdvice()` - Consejos específicos por error

### 2. `app/api/courses/generate/route.ts`
- ✅ Eliminado uso de `createLLMClientWithFallback()` (cliente único)
- ✅ Reemplazado `classifyWithRetry()` con `classifyWithProviderFallback()`
- ✅ Añadida clasificación de errores en catch principal
- ✅ HTTP status codes específicos por tipo de error
- ✅ Mensajes de error user-friendly basados en error type
- ✅ Logging de proveedor usado en `ai_system_logs`

---

## 🎯 Próximos Pasos Sugeridos

1. **Monitoreo de Proveedores:**
   - Dashboard en `/admin` mostrando qué proveedores están activos
   - Tasa de éxito por proveedor
   - Tiempo promedio de respuesta

2. **Rate Limit Tracking:**
   - Guardar en DB cuándo se alcanzó rate limit
   - Estimar cuándo se resetea
   - Sugerir al usuario cuándo reintentar

3. **Provider Priority Tuning:**
   - Ordenar proveedores por tasa de éxito
   - Preferir proveedores más rápidos/baratos primero
   - Permitir configuración manual de prioridad

4. **Retry con Jitter:**
   - Añadir randomización al backoff para evitar thundering herd
   - Implementar circuit breaker por proveedor

---

## ✅ Checklist de Implementación

- [x] Clasificación de errores (`classifyLLMError`)
- [x] Sistema de fallback multi-proveedor (`classifyWithAllProviders`)
- [x] Mensajes de error detallados y accionables
- [x] HTTP status codes específicos
- [x] Logging del proveedor usado
- [x] Logging de errores en `ai_system_logs`
- [x] Reemplazo de `classifyWithRetry` en outline generation
- [x] Reemplazo de `classifyWithRetry` en module generation
- [x] Reemplazo de `classifyWithRetry` en translation
- [x] Testing de compilación
- [ ] Testing end-to-end en producción
- [ ] Documentación para usuarios finales

---

**¡El sistema ahora es MUCHO más robusto contra rate limits y fallos de proveedores!** 🎉
