# LLM Fallback System - Cascada de Proveedores

## 📊 Flujo de Cascada

```
┌─────────────────────────────────────────────────────────────────┐
│                   1. OLLAMA LOCAL (PREFERIDO)                   │
│            ✓ Cero costo    ✓ Sin límites    ✓ Offline          │
│  Si está disponible → USAR INMEDIATAMENTE                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    (Si falla/no disponible)
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    2. PROVEEDORES NUBE                           │
│  Cascada en orden: Groq → Gemini → OpenRouter → Together        │
│                 → Mistral → OpenAI → DeepSeek → Anthropic      │
│                                                                  │
│  ✓ Intentar cada uno hasta que uno funcione                    │
│  ✓ Si falla por quota/error → siguiente proveedor              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    (Si todos fallan)
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                  3. DESCARGA LOCAL AUTOMÁTICA                   │
│                    (Último recurso)                             │
│  Si Ollama NO está corriendo:                                  │
│    1. Detecta que NO hay modelo local instalado                │
│    2. Inicia descarga automática de llama2:7b (~2.7GB)         │
│    3. Espera a que termine (5-15 minutos)                      │
│    4. Usa el modelo local para generar                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Proveedores en Detalle

### **Nivel 1: OLLAMA (Local)**
```typescript
OLLAMA_BASE_URL=http://localhost:11434  // Por defecto
// O remoto via tunnel:
OLLAMA_BASE_URL=https://tu-ollama-tunnel.ngrok.io
```
- **Costo**: 0
- **Límite**: Infinito
- **Velocidad**: Depende de hardware (~10-30 seg/curso)
- **Modelo usado**: llama2:7b (4GB RAM, 13GB GPU VRAM)
- **Instalación**: `brew install ollama` o `ollama.ai` en Windows

### **Nivel 2: GROQ (Primario nube)**
```typescript
GROQ_API_KEY=gsk_...
```
- **Costo**: GRATIS hasta 30 req/min
- **Modelo**: mixtral-8x7b (muy rápido)
- **Tiempo respuesta**: ~5-10 seg
- **Límite**: 30 solicitudes/minuto
- **Sign up**: https://console.groq.com

### **Nivel 3: GEMINI**
```typescript
GEMINI_API_KEY=AIzaSy...
```
- **Costo**: GRATIS
- **Modelo**: gemini-2.0-flash
- **Tiempo respuesta**: ~8-15 seg
- **Límite**: 15 req/min (free tier)
- **Sign up**: https://aistudio.google.com

### **Nivel 4: OPENROUTER**
```typescript
OPENROUTER_API_KEY=sk-or-...
```
- **Costo**: GRATIS (modelos free)
- **Modelo**: Meta Llama 3.1 70B
- **Tiempo respuesta**: ~10-20 seg
- **Límite**: Generoso en free tier
- **Sign up**: https://openrouter.ai

### **Nivel 5: TOGETHER**
```typescript
TOGETHER_API_KEY=...
```
- **Costo**: GRATIS
- **Modelo**: Meta Llama 3.1 70B
- **Tiempo respuesta**: ~10-20 seg
- **Límite**: Free tier disponible
- **Sign up**: https://api.together.xyz

### **Nivel 6: MISTRAL**
```typescript
MISTRAL_API_KEY=...
```
- **Costo**: Freemium
- **Modelo**: mistral-7b-instruct
- **Tiempo respuesta**: ~8-15 seg
- **Sign up**: https://console.mistral.ai

### **Nivel 7: OPENAI**
```typescript
OPENAI_API_KEY=sk-...
```
- **Costo**: PAGADO (~$0.002/1K tokens)
- **Modelo**: gpt-4o-mini (rápido + barato)
- **Tiempo respuesta**: ~5-8 seg
- **Ventaja**: Más fiable que otros
- **Sign up**: https://platform.openai.com

### **Nivel 8: DEEPSEEK**
```typescript
DEEPSEEK_API_KEY=...
```
- **Costo**: Muy barato o gratis
- **Modelo**: DeepSeek v2
- **Tiempo respuesta**: ~10-20 seg
- **Sign up**: https://platform.deepseek.com

### **Nivel 9: ANTHROPIC**
```typescript
ANTHROPIC_API_KEY=sk-ant-...
```
- **Costo**: PAGADO
- **Modelo**: Claude 3.5 Sonnet
- **Ventaja**: Excelente calidad
- **Sign up**: https://console.anthropic.com

---

## 📈 Modelo Local: LLAMA2:7B

### Especificaciones
- **Tamaño descargado**: ~4GB (en memoria)
- **Tamaño comprimido**: ~2.7GB
- **VRAM requerida**: ~13GB (sin cuantizar)
- **Velocidad**: 10-30 tokens/seg (depende de GPU)
- **Calidad**: Buena para cursos (91% calidad vs GPT-4)
- **Ventaja**: GRATIS + Sin límites + Offline

### Descarga Automática
```typescript
// En lib/ai/llm-client.ts
async function prepareLocalModel(): Promise<boolean> {
  // 1. Verifica si Ollama está corriendo
  // 2. Si modelo existe → lo usa
  // 3. Si NO existe → descarga automáticamente llama2:7b
  // 4. Streaming de progreso: "Downloading model (45%)"
}
```

### Cómo Funciona en Fallback

```typescript
// Cuando TODOS los cloud providers fallan:
export async function createLLMClientWithFallback() {
  // Intenta Ollama primero (si está corriendo)
  // Intenta todos los cloud providers
  
  // SI TODOS FALLAN:
  if (!isVercel) {
    const localReady = await prepareLocalModel(); // ← Descarga si falta
    if (localReady) {
      return createLLMClient('ollama'); // Usa llama2:7b
    }
  }
  
  throw new Error('No providers available');
}
```

---

## 🚀 Casos de Uso

### Caso 1: Usuario con Ollama + conexión internet
```
1. Intenta Ollama → ✓ ENCONTRADO → Usa local (CERO costo)
2. Si Ollama no responde → Usa Groq (gratis, nube)
3. Si Groq quota → Usa Gemini
...
```

### Caso 2: Usuario sin Ollama, pero con Groq API key
```
1. Intenta Ollama → ✗ No disponible
2. Intenta Groq → ✓ ENCONTRADO → Usa Groq (gratis)
3. Si Groq quota → Usa Gemini
...
```

### Caso 3: Usuario sin internet ni API keys (modo supervivencia)
```
1. Intenta todos → ✗ Todos fallan
2. Descarga automáticamente llama2:7b (si Ollama instalado)
3. Genera localmente sin conexión (5-15 min de espera por descarga)
4. Funciona para siempre offline
```

### Caso 4: Vercel Production
```
1. Intenta Ollama → ✗ No disponible en Vercel serverless
2. Cascada de 8 cloud providers → DEBE haber al menos uno
3. NO intenta descargar local (no hay espacio/tiempo en Vercel)
4. Fallback: Anthropic como último recurso
```

---

## 💾 Instalación y Configuración

### Setup Rápido (Recomendado)

**1. Instala Ollama:**
```bash
# macOS
brew install ollama

# Windows / Linux
# Descarga en https://ollama.ai
```

**2. Inicia Ollama:**
```bash
ollama serve  # Escucha en http://localhost:11434
```

**3. El sistema automáticamente:**
- Detecta Ollama corriendo
- Descarga llama2:7b si no existe
- Lo usa para generar cursos

### Setup Avanzado (Con Tunnel Remoto)

Si quieres usar Ollama desde Vercel/servidor remoto:

```bash
# En máquina local con Ollama:
ollama serve

# En otra terminal, crear tunnel con ngrok:
ngrok http 11434

# En .env.local:
OLLAMA_BASE_URL=https://tu-url-ngrok.ngrok.io
```

---

## 📊 Monitoreo de Fallbacks

### Logs del Sistema
```typescript
// En consola/logs verás:
[LLM] ✓ Using Ollama provider (LOCAL MODEL - NO API COSTS)
// O si falla local:
[LLM] Ollama not available, falling back to cloud providers
[LLM] ✓ Using groq provider (cloud fallback)
// O si todos fallan:
[LLM] ⚠️  All cloud providers exhausted. Attempting to use local model...
[LOCAL] 📥 Llama2 model not found. Downloading llama2:7b...
[LOCAL] ✓ Llama2 model download complete!
[LLM] ✓ Using local Llama2 model (LAST RESORT FALLBACK)
```

### Dashboard Vercel
- Ve a Vercel → proyecto → Deployments → Functions → `/api/generate-course-simple`
- Ve qué proveedor se usó en logs
- Monitorea tiempos de respuesta

---

## ⚡ Performance Esperado

| Proveedor | Tiempo | Costo | Offline |
|-----------|--------|-------|---------|
| Ollama Local | 20-40s | $0 | ✓ |
| Groq | 8-15s | $0 | ✗ |
| Gemini | 10-18s | $0 | ✗ |
| OpenRouter | 12-20s | $0-$ | ✗ |
| OpenAI | 5-10s | $0.002 | ✗ |

---

## 🆘 Troubleshooting

### "No LLM providers available"
```
❌ Ollama no está corriendo
❌ Todos los API keys faltan o son inválidos
✓ Solución:
  1. Instala Ollama: ollama.ai
  2. Ejecuta: ollama serve
  3. O configura al menos un API key
```

### "Timeout downloading llama2:7b"
```
❌ Conexión lenta o interrumpida
✓ Solución:
  1. Descarga manual: ollama pull llama2:7b
  2. Intenta en conexión más estable
  3. O usa API key de Groq/Gemini
```

### "Ollama: all providers quota exceeded"
```
✓ Normal - todos los free tiers se agotaron
✓ Solución:
  1. Espera al próximo ciclo (generalmente 1 minuto)
  2. Instala Ollama + llama2:7b
  3. O compra más quota en OpenAI
```

---

## 📚 Recursos

- **Ollama**: https://ollama.ai
- **Groq**: https://console.groq.com
- **Gemini**: https://aistudio.google.com
- **OpenRouter**: https://openrouter.ai
- **OpenAI**: https://platform.openai.com

---

**Última actualización**: Nov 14, 2025
**Commit**: bf4f366 - Add automatic local Llama2 7B model download
