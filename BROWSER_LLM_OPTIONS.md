# 🧠 LLM en el Navegador del Usuario - $0 API Costs

## 🎯 Filosofía

**NO tunneling, NO servidor propio** → El modelo corre **EN EL NAVEGADOR DEL USUARIO**

## 🚀 Opciones Disponibles

### ⭐ Opción 1: Transformers.js (RECOMENDADO)

**Qué es**: Ejecuta modelos Hugging Face directamente en el navegador con WebGPU/WASM

**Ventajas**:
- ✅ **100% gratis** (modelo descarga 1 vez, cache permanente)
- ✅ **CERO latencia** (todo local)
- ✅ **Privacidad total** (nada sale del navegador)
- ✅ **Funciona offline** después de primera descarga
- ✅ **WebGPU = ultra rápido** en RTX 3080, M1/M2, etc.

**Desventajas**:
- ⚠️ Primera carga: ~200MB-2GB (depende del modelo)
- ⚠️ Requiere navegador moderno (Chrome 113+, Edge 113+)

#### 📦 Implementación

```bash
npm install @xenova/transformers
```

```typescript
// lib/ai/browser-llm.ts
import { pipeline, env } from '@xenova/transformers';

// Configure cache
env.allowLocalModels = false;
env.useBrowserCache = true;

export class BrowserLLM {
  private generator: any = null;
  
  async initialize(
    modelId: string = 'Xenova/Phi-3.5-mini-instruct', // 3.8GB
    onProgress?: (progress: number) => void
  ) {
    this.generator = await pipeline(
      'text-generation',
      modelId,
      {
        progress_callback: (data: any) => {
          if (data.status === 'progress') {
            onProgress?.(data.progress);
          }
        }
      }
    );
  }
  
  async generate(prompt: string): Promise<string> {
    if (!this.generator) {
      throw new Error('Model not initialized. Call initialize() first.');
    }
    
    const result = await this.generator(prompt, {
      max_new_tokens: 2000,
      temperature: 0.7,
      do_sample: true,
    });
    
    return result[0].generated_text;
  }
}
```

**Uso en componente**:

```tsx
// app/[locale]/courses/generate/page.tsx
'use client';

import { useState } from 'react';
import { BrowserLLM } from '@/lib/ai/browser-llm';

export default function CourseGeneratePage() {
  const [llm] = useState(() => new BrowserLLM());
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  
  const handleInitialize = async () => {
    await llm.initialize(
      'Xenova/Phi-3.5-mini-instruct',
      (progress) => setDownloadProgress(progress)
    );
    setIsReady(true);
  };
  
  const handleGenerate = async () => {
    const course = await llm.generate(`
      Generate a course about Machine Learning.
      Output JSON with: { title, modules: [...] }
    `);
    console.log(JSON.parse(course));
  };
  
  return (
    <div>
      {!isReady ? (
        <button onClick={handleInitialize}>
          Download AI Model ({downloadProgress}%)
        </button>
      ) : (
        <button onClick={handleGenerate}>
          Generate Course (100% Free, Runs in Your Browser)
        </button>
      )}
    </div>
  );
}
```

#### 🎯 Modelos Recomendados

| Modelo | Tamaño | Calidad | Velocidad | Uso |
|--------|--------|---------|-----------|-----|
| **Phi-3.5-mini** | 3.8GB | ⭐⭐⭐⭐⭐ | 🚀🚀🚀 | Generación cursos |
| **TinyLlama** | 637MB | ⭐⭐⭐ | 🚀🚀🚀🚀🚀 | Resúmenes, clasificación |
| **Qwen2-1.5B** | 1.5GB | ⭐⭐⭐⭐ | 🚀🚀🚀🚀 | Balance perfecto |
| **SmolLM-360M** | 360MB | ⭐⭐ | 🚀🚀🚀🚀🚀 | Ultra ligero |

**Conversión de modelos**:
```bash
# Convertir cualquier modelo de Hugging Face a ONNX (Transformers.js compatible)
npx transformers-cli convert --model mistralai/Mistral-7B-v0.1
```

---

### ⭐ Opción 2: WebLLM (Chrome Built-in AI)

**Qué es**: Usa el modelo **Gemini Nano** que viene **preinstalado en Chrome**

**Ventajas**:
- ✅ **CERO descarga** (viene en Chrome 127+)
- ✅ **Ultra rápido** (optimizado por Google)
- ✅ **100% gratis**
- ✅ **Privacidad total**

**Desventajas**:
- ⚠️ Solo Chrome 127+ con flag activado
- ⚠️ Modelo pequeño (~1B parámetros)
- ⚠️ API experimental (puede cambiar)

#### 📦 Implementación

```typescript
// lib/ai/chrome-ai.ts
export class ChromeAI {
  private session: any = null;
  
  async initialize() {
    // @ts-expect-error - Experimental API
    if (!window.ai || !window.ai.languageModel) {
      throw new Error('Chrome AI not available. Enable chrome://flags/#optimization-guide-on-device-model');
    }
    
    // @ts-expect-error
    this.session = await window.ai.languageModel.create({
      temperature: 0.7,
      topK: 3,
    });
  }
  
  async generate(prompt: string): Promise<string> {
    if (!this.session) {
      throw new Error('Session not initialized');
    }
    
    return await this.session.prompt(prompt);
  }
  
  async generateStream(
    prompt: string,
    onChunk: (text: string) => void
  ): Promise<void> {
    const stream = this.session.promptStreaming(prompt);
    
    for await (const chunk of stream) {
      onChunk(chunk);
    }
  }
}
```

**Activar en Chrome**:
1. Ir a `chrome://flags/#optimization-guide-on-device-model`
2. Activar "Optimization Guide On Device Model"
3. Reiniciar Chrome

---

### ⭐ Opción 3: WebGPU + GGUF (Máximo Control)

**Qué es**: Ejecuta modelos GGUF (Llama.cpp format) directamente en WebGPU

**Ventajas**:
- ✅ **Modelos ultra comprimidos** (Q4_K_M = 4 bits)
- ✅ **WebGPU = velocidad nativa** en GPUs modernas
- ✅ **Compatible con ANY modelo** (Llama, Mistral, Gemma, etc.)

**Desventajas**:
- ⚠️ Más complejo de implementar
- ⚠️ Requiere WebGPU (Chrome 113+)

#### 📦 Implementación

```bash
npm install @mlc-ai/web-llm
```

```typescript
// lib/ai/webgpu-llm.ts
import * as webllm from '@mlc-ai/web-llm';

export class WebGPU_LLM {
  private engine: webllm.MLCEngine | null = null;
  
  async initialize(
    modelId: string = 'Llama-3.2-3B-Instruct-q4f32_1-MLC',
    onProgress?: (report: any) => void
  ) {
    this.engine = await webllm.CreateMLCEngine(
      modelId,
      {
        initProgressCallback: (report) => {
          onProgress?.(report);
          console.log(report.text);
        },
      }
    );
  }
  
  async generate(prompt: string): Promise<string> {
    if (!this.engine) throw new Error('Not initialized');
    
    const reply = await this.engine.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });
    
    return reply.choices[0].message.content || '';
  }
  
  async *generateStream(prompt: string) {
    if (!this.engine) throw new Error('Not initialized');
    
    const stream = await this.engine.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      temperature: 0.7,
    });
    
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
```

**Modelos disponibles**: https://mlc.ai/web-llm/#chat-demo

---

### ⭐ Opción 4: APIs Gratuitas (Sin Descarga)

**Si el usuario NO quiere descargar nada**, usar APIs gratuitas:

#### A. Hugging Face Inference API (GRATIS)

```typescript
// lib/ai/hf-api.ts
export async function generateWithHF(prompt: string): Promise<string> {
  const response = await fetch(
    'https://api-inference.huggingface.co/models/microsoft/Phi-3.5-mini-instruct',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_HF_TOKEN}`, // Token gratis
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 2000,
          temperature: 0.7,
        },
      }),
    }
  );
  
  const data = await response.json();
  return data[0].generated_text;
}
```

**Free tier**: 30,000 requests/month

#### B. Together.ai (GRATIS)

```typescript
// Ya lo tienes configurado!
// Free tier: $25 credits = ~500,000 tokens
```

#### C. Groq (ULTRA RÁPIDO + GRATIS)

```typescript
// Ya lo tienes configurado!
// Free tier: 14,400 requests/day (Llama 3.1 70B)
```

---

## 🎯 Arquitectura Híbrida Recomendada

**Combina lo mejor de ambos mundos**:

```typescript
// lib/ai/hybrid-llm.ts
export class HybridLLM {
  private browserLLM: BrowserLLM | null = null;
  private cloudAvailable = true;
  
  async generateCourse(topic: string): Promise<Course> {
    // 1. Intenta con modelo del navegador (si está descargado)
    if (this.browserLLM) {
      try {
        return await this.browserLLM.generate(topic);
      } catch (err) {
        console.log('Browser LLM failed, falling back to cloud');
      }
    }
    
    // 2. Fallback a cloud (Groq → Together → HF)
    return await this.generateWithCloud(topic);
  }
  
  async offerBrowserDownload(): Promise<boolean> {
    const userWants = await confirm(
      '¿Descargar modelo AI en tu navegador? (3.8GB, 100% privado, funciona offline)'
    );
    
    if (userWants) {
      this.browserLLM = new BrowserLLM();
      await this.browserLLM.initialize('Xenova/Phi-3.5-mini-instruct');
      return true;
    }
    
    return false;
  }
}
```

**UX Flow**:

```tsx
// Primera visita
┌─────────────────────────────────────┐
│ 🎯 Generar Curso de Machine Learning│
│                                     │
│ ⚡ Opción 1: Usar API Cloud         │
│    → Instantáneo, requiere internet │
│                                     │
│ 🧠 Opción 2: Descargar Modelo (3.8GB)│
│    → Primera vez tarda, luego GRATIS│
│    → Funciona offline después       │
│    → 100% privado                   │
│                                     │
│ [Usar Cloud] [Descargar Modelo]     │
└─────────────────────────────────────┘

// Si descarga modelo
┌─────────────────────────────────────┐
│ 📥 Descargando Phi-3.5-mini...      │
│ ████████░░░░░░ 67% (2.5GB / 3.8GB) │
│                                     │
│ Esto solo pasa 1 vez. Después es    │
│ instantáneo y 100% gratis.          │
└─────────────────────────────────────┘

// Visitas posteriores
┌─────────────────────────────────────┐
│ ✅ Modelo descargado                │
│ 🎯 Generar curso (100% gratis)      │
└─────────────────────────────────────┘
```

---

## 📊 Comparación de Opciones

| Método | Costo | Setup Usuario | Offline | Privacidad | Velocidad |
|--------|-------|---------------|---------|------------|-----------|
| **Transformers.js** | $0 | 3.8GB descarga | ✅ Sí | 🔒 Total | 🚀🚀🚀 |
| **Chrome AI** | $0 | 0 bytes (built-in) | ✅ Sí | 🔒 Total | 🚀🚀🚀🚀 |
| **WebLLM** | $0 | 2-4GB descarga | ✅ Sí | 🔒 Total | 🚀🚀🚀🚀🚀 |
| **Groq API** | $0 | 0 bytes | ❌ No | ⚠️ Cloud | 🚀🚀🚀🚀🚀 |
| **Together API** | $0 | 0 bytes | ❌ No | ⚠️ Cloud | 🚀🚀🚀 |
| **HF Inference** | $0 | 0 bytes | ❌ No | ⚠️ Cloud | 🚀🚀 |

---

## 🎯 Recomendación Final

### Para AINews Platform:

**Estrategia de 3 niveles**:

#### Nivel 1: Chrome AI (Si disponible)
- Cero setup, instantáneo
- Para: Resúmenes, clasificación, tags

#### Nivel 2: Transformers.js con opt-in
- Usuario elige descargar Phi-3.5-mini (3.8GB)
- Para: Generación de cursos, análisis profundo
- Se guarda en cache del navegador (permanente)

#### Nivel 3: APIs Cloud (Fallback)
- Groq (ultra rápido) → Together → HF
- Para: Usuarios que NO quieren descargar

**Código de implementación**:

```typescript
// lib/ai/smart-llm.ts
export class SmartLLM {
  async generate(prompt: string, task: 'summary' | 'course' | 'classify') {
    // 1. Try Chrome AI (if available)
    if (task === 'summary' || task === 'classify') {
      try {
        const chromeAI = new ChromeAI();
        await chromeAI.initialize();
        return await chromeAI.generate(prompt);
      } catch {
        // Chrome AI not available
      }
    }
    
    // 2. Try Browser LLM (if downloaded)
    const browserLLM = getBrowserLLMFromCache();
    if (browserLLM && task === 'course') {
      return await browserLLM.generate(prompt);
    }
    
    // 3. Fallback to Cloud APIs
    return await this.cloudFallback(prompt);
  }
  
  async offerDownload() {
    // Show modal offering Phi-3.5-mini download
    // Only for users who generate courses frequently
  }
}
```

---

## 🚀 Próximos Pasos

1. **Instalar Transformers.js**:
   ```bash
   npm install @xenova/transformers
   ```

2. **Crear componente de descarga**:
   ```tsx
   // components/ai/ModelDownloader.tsx
   ```

3. **Modificar generación de cursos**:
   ```tsx
   // app/[locale]/courses/generate/page.tsx
   ```

4. **Agregar fallback inteligente**:
   ```typescript
   // lib/ai/smart-llm.ts
   ```

¿Quieres que implemente la opción de Transformers.js con Phi-3.5-mini? Es la **más práctica** porque:

- ✅ Usuario decide si descargar (opt-in)
- ✅ Después funciona 100% offline
- ✅ Calidad similar a GPT-3.5
- ✅ Cache permanente (descarga 1 sola vez)
- ✅ Fallback automático a Groq/Together si no descarga
