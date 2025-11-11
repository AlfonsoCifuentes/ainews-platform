# 🔧 Solución de Error de Generación de Cursos

## ❌ Error Reportado

```
Generation failed
Failed to read response: Invalid JSON response: Unexpected token 'A', "An error o"... is not valid JSON
```

## 🔍 Causa Raíz

El LLM está devolviendo un **mensaje de error en texto plano** en lugar de JSON válido. Esto sucede cuando:

1. **Límite de Rate**: El proveedor está limitando las peticiones (error 429)
2. **API Key Inválida**: La clave de API no es válida o ha expirado
3. **Timeout**: El modelo tarda demasiado en responder
4. **Error del Modelo**: El modelo genera texto en lugar de JSON

## ✅ Solución Implementada

### 1. Detección Temprana de Errores de Texto

Ahora el sistema detecta inmediatamente si el LLM devuelve texto de error:

```typescript
// Detecta respuestas que empiezan con "Error", "An error", "Sorry", etc.
const firstChars = jsonContent.trim().substring(0, 50).toLowerCase();
if (!firstChars.startsWith('{') && !firstChars.startsWith('[')) {
  if (firstChars.startsWith('error') || firstChars.startsWith('an error')) {
    throw new Error(`LLM returned error text instead of JSON: "${jsonContent}..."`);
  }
}
```

### 2. Clasificación Mejorada de Errores

El clasificador de errores ahora detecta errores de parseo JSON:

```typescript
// Detecta errores de JSON parsing
if (errorLower.includes('json') ||
    errorLower.includes('parse') ||
    errorLower.includes('unexpected token') ||
    errorLower.includes('returned error text')) {
  return {
    type: 'validation',
    message: 'Response validation failed. The AI returned malformed or invalid data.',
    retryable: true
  };
}
```

### 3. Fallback Multi-Proveedor Mejorado

El sistema intenta **TODOS** los proveedores disponibles:

1. **Ollama** (local, gratis) - si está corriendo
2. **Groq** (generoso free tier - 30 req/min)
3. **Gemini** (Google)
4. **OpenRouter** (gateway multi-modelo)
5. **Together** (Meta models)
6. **Mistral** (proveedor europeo)
7. **DeepSeek** (alta calidad)
8. **Anthropic** (Claude - mejor para JSON)

## 🚀 Cómo Verificar API Keys

### Ver API Keys Configuradas

```bash
# En PowerShell
Get-Content .env.local | Select-String "API_KEY"
```

### Verificar Qué Providers Están Disponibles

Accede a: `http://localhost:3000/api/courses/diagnose`

Respuesta esperada:
```json
{
  "availableProviders": ["groq", "gemini", "openrouter"],
  "configuredKeys": {
    "hasGroq": true,
    "hasGemini": true,
    "hasOpenRouter": true,
    "hasAnthropic": false,
    "hasMistral": false,
    "hasDeepSeek": false,
    "hasTogether": false
  }
}
```

## 🔑 Configurar API Keys (Gratis)

### 1. Groq (Recomendado - Fast & Free)
```bash
# Obtén tu key en: https://console.groq.com/
GROQ_API_KEY=gsk_...
```

### 2. Google Gemini (Gratis)
```bash
# Obtén tu key en: https://aistudio.google.com/
GEMINI_API_KEY=AIza...
```

### 3. Anthropic Claude (Mejor para JSON)
```bash
# Obtén tu key en: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. OpenRouter (Múltiples Modelos)
```bash
# Obtén tu key en: https://openrouter.ai/
OPENROUTER_API_KEY=sk-or-...
```

### 5. DeepSeek (Alta Calidad)
```bash
# Obtén tu key en: https://platform.deepseek.com/
DEEPSEEK_API_KEY=sk-...
```

## 🧪 Probar la Generación de Cursos

### 1. Opción Simple (UI)
1. Ve a `http://localhost:3000/en/courses`
2. Click en "Generate Course"
3. Llena el formulario:
   - **Topic**: "Introduction to Neural Networks"
   - **Difficulty**: Beginner
   - **Duration**: Short
4. Click "Generate"

### 2. Opción Manual (API)

```bash
# En PowerShell
$body = @{
  topic = "Introduction to Neural Networks"
  difficulty = "beginner"
  duration = "short"
  locale = "en"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/courses/generate" -Method POST -Body $body -ContentType "application/json"
```

## 📊 Logs Detallados

El sistema ahora genera logs muy detallados:

```
[LLM Fallback] 🔄 Starting multi-provider fallback with 3 providers available
[LLM Fallback] 📋 Provider order: groq → gemini → openrouter

[LLM Fallback] 🤖 Trying provider: GROQ
[LLM Fallback] ✅ groq client initialized
[LLM Fallback] 🔄 groq attempt 1/2...
[LLM Fallback] ❌ groq attempt 1/2 failed:
[LLM Fallback]    Type: validation
[LLM Fallback]    Message: Response validation failed...
[LLM Fallback]    Retryable: true

[LLM Fallback] 🤖 Trying provider: GEMINI
[LLM Fallback] ✅ SUCCESS with gemini on attempt 1!
```

## ⚡ Mejoras Implementadas

1. **✅ Detección temprana de errores de texto**
   - Falla rápido si el LLM devuelve error en lugar de JSON
   - Evita intentar parsear texto como JSON

2. **✅ Clasificación mejorada de errores**
   - Detecta errores de JSON parsing
   - Marca como "validation error" (retryable)

3. **✅ Mensajes de error más claros**
   - "LLM returned error text instead of JSON" en lugar de "Unexpected token"
   - Muestra los primeros 200 caracteres de la respuesta

4. **✅ Logs más detallados**
   - Tipo de error claramente identificado
   - Provider que falló
   - Razón del fallo
   - Si es retryable o no

## 🎯 Próximos Pasos

1. **Verifica tus API keys**: `http://localhost:3000/api/courses/diagnose`
2. **Agrega más providers**: Cuantos más API keys, más redundancia
3. **Prueba generación de curso**: Debería funcionar con los cambios

## 💡 Recomendaciones

### Para Máxima Fiabilidad
Configura **al menos 3 proveedores**:
1. **Groq** - Fast, gratis
2. **Gemini** - Gratis, confiable
3. **Anthropic** - Mejor calidad de JSON

### Para Desarrollo Local (Gratis)
Si tienes una GPU, instala Ollama:

```bash
# Instalar Ollama
winget install Ollama.Ollama

# Descargar modelo
ollama pull llama3.2:3b

# Verificar
ollama list
```

El sistema automáticamente usará Ollama PRIMERO (0 costo API).

## 📝 Commit

```bash
git add -A
git commit -m "fix: improve JSON parsing error detection in course generation"
git push origin master
```

## 🆘 Si el Problema Persiste

1. **Revisa los logs del servidor** - Busca exactamente qué provider falló y por qué
2. **Verifica tus API keys** - Usa `/api/courses/diagnose`
3. **Prueba con un tema más simple** - "Machine Learning Basics" en lugar de algo complejo
4. **Reduce la duración** - "short" en lugar de "long"
5. **Reporta el error completo** - Copia los logs de la consola del servidor
