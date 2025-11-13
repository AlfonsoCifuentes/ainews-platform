/**
 * Local AI Models Detection and Management
 * Autodetects locally available models from Ollama, LLaMA.cpp, and other providers
 */

export interface LocalModel {
  name: string;           // e.g., "llama3.2:3b", "neural-chat:latest"
  provider: 'ollama';     // Extensible for other local providers
  baseUrl: string;        // e.g., "http://localhost:11434"
  size: number;           // Model size in GB (approximate)
  quantization?: string;  // e.g., "q4_K_M", "fp16"
  contextLength?: number; // Max context tokens
  speedRating?: 'fast' | 'medium' | 'slow'; // Relative performance
  isBestForJSON?: boolean; // Good for structured output
  lastChecked?: Date;
  isAvailable?: boolean;  // Latest availability status
}

export interface LocalModelSetup {
  hasOllama: boolean;
  ollamaVersion?: string;
  ollamaUrl: string;
  availableModels: LocalModel[];
  recommendedModel?: LocalModel;
  instructions?: string; // Setup instructions if needed
}

const OLLAMA_DEFAULT_URL = 'http://localhost:11434';
const OLLAMA_TIMEOUT_MS = 5000;

/**
 * Check if Ollama is running and accessible
 */
export async function checkOllamaAvailability(
  baseUrl: string = OLLAMA_DEFAULT_URL
): Promise<{
  isRunning: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${baseUrl}/api/version`, {
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS)
    });

    if (response.ok) {
      const data = await response.json();
      return {
        isRunning: true,
        version: data.version || 'unknown'
      };
    }

    return {
      isRunning: false,
      error: `HTTP ${response.status}: ${response.statusText}`
    };
  } catch (error) {
    return {
      isRunning: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetch list of available models from Ollama
 */
export async function getOllamaModels(
  baseUrl: string = OLLAMA_DEFAULT_URL
): Promise<LocalModel[]> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS)
    });

    if (!response.ok) {
      console.warn(`[Local Models] Failed to fetch Ollama models: HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    const models: LocalModel[] = [];

    if (Array.isArray(data.models)) {
      for (const model of data.models) {
        const localModel: LocalModel = {
          name: model.name,
          provider: 'ollama',
          baseUrl,
          size: (model.size || 0) / (1024 ** 3), // Convert bytes to GB
          quantization: extractQuantization(model.name),
          lastChecked: new Date(),
          isAvailable: true
        };

        // Infer properties from model name
        assignModelProperties(localModel);
        models.push(localModel);
      }
    }

    return models;
  } catch (error) {
    console.warn('[Local Models] Error fetching Ollama models:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

/**
 * Extract quantization format from model name (e.g., "llama3.2:3b-instruct-q4_K_M")
 */
function extractQuantization(modelName: string): string | undefined {
  const quantMatch = modelName.match(/(q\d_[A-Z_]+|fp\d+)/i);
  return quantMatch ? quantMatch[1] : undefined;
}

/**
 * Assign properties based on model name
 */
function assignModelProperties(model: LocalModel): void {
  const nameLower = model.name.toLowerCase();

  // Estimate context length
  if (nameLower.includes('32k') || nameLower.includes('32768')) {
    model.contextLength = 32768;
  } else if (nameLower.includes('16k') || nameLower.includes('16384')) {
    model.contextLength = 16384;
  } else if (nameLower.includes('8k') || nameLower.includes('8192')) {
    model.contextLength = 8192;
  } else if (nameLower.includes('4k') || nameLower.includes('4096')) {
    model.contextLength = 4096;
  } else {
    // Default estimates
    if (nameLower.includes('70b')) model.contextLength = 4096;
    else if (nameLower.includes('13b')) model.contextLength = 2048;
    else if (nameLower.includes('7b')) model.contextLength = 2048;
    else if (nameLower.includes('3b') || nameLower.includes('2b')) model.contextLength = 2048;
  }

  // Speed rating based on size
  const sizeMatch = model.name.match(/(\d+)b/i);
  if (sizeMatch) {
    const paramCount = parseInt(sizeMatch[1]);
    if (paramCount <= 3) {
      model.speedRating = 'fast';
    } else if (paramCount <= 13) {
      model.speedRating = 'medium';
    } else {
      model.speedRating = 'slow';
    }
  }

  // Determine if good for JSON
  model.isBestForJSON = nameLower.includes('instruct') || 
                        nameLower.includes('chat') ||
                        nameLower.includes('neural-chat') ||
                        nameLower.includes('dolphin') ||
                        nameLower.includes('openhermes');
}

/**
 * Get recommended model for course generation
 * Priority: JSON-capable + fast + reasonable size
 */
export function getRecommendedModel(models: LocalModel[]): LocalModel | undefined {
  if (models.length === 0) return undefined;

  // Filter models suitable for JSON generation
  const jsonCapable = models.filter(m => m.isBestForJSON);
  const candidates = jsonCapable.length > 0 ? jsonCapable : models;

  // Sort by: JSON capability > speed > size
  return candidates.sort((a, b) => {
    // Prefer JSON-capable models
    if (a.isBestForJSON !== b.isBestForJSON) {
      return a.isBestForJSON ? -1 : 1;
    }

    // Prefer faster models
    const speedOrder = { fast: 0, medium: 1, slow: 2 };
    const speedDiff = (speedOrder[a.speedRating || 'medium'] || 1) - 
                      (speedOrder[b.speedRating || 'medium'] || 1);
    if (speedDiff !== 0) return speedDiff;

    // Prefer smaller models (for speed)
    return (a.size || 0) - (b.size || 0);
  })[0];
}

/**
 * Get complete local model setup information
 */
export async function detectLocalModels(
  baseUrl: string = OLLAMA_DEFAULT_URL
): Promise<LocalModelSetup> {
  console.log('[Local Models] 🔍 Detecting local AI models...');

  const availability = await checkOllamaAvailability(baseUrl);
  
  if (!availability.isRunning) {
    console.log('[Local Models] ⚠️  Ollama not running. Setup instructions:');
    return {
      hasOllama: false,
      ollamaUrl: baseUrl,
      availableModels: [],
      instructions: getOllamaSetupInstructions()
    };
  }

  console.log(`[Local Models] ✅ Ollama detected (v${availability.version})`);

  const models = await getOllamaModels(baseUrl);
  const recommended = getRecommendedModel(models);

  if (models.length === 0) {
    return {
      hasOllama: true,
      ollamaVersion: availability.version,
      ollamaUrl: baseUrl,
      availableModels: [],
      instructions: getFirstModelInstructions()
    };
  }

  console.log(`[Local Models] 📦 Found ${models.length} model(s):`);
  for (const model of models) {
    const badge = model.isBestForJSON ? '✨ JSON' : '  ';
    console.log(`  ${badge} ${model.name} (${model.size.toFixed(1)}GB, ${model.speedRating})`);
  }

  if (recommended) {
    console.log(`[Local Models] 🎯 Recommended for courses: ${recommended.name}`);
  }

  return {
    hasOllama: true,
    ollamaVersion: availability.version,
    ollamaUrl: baseUrl,
    availableModels: models,
    recommendedModel: recommended
  };
}

/**
 * Setup instructions for Ollama
 */
function getOllamaSetupInstructions(): string {
  return `
🚀 Ollama Setup Instructions:

1. Download Ollama from: https://ollama.ai
2. Install and run Ollama
3. Pull a recommended model:
   - For courses: ollama pull neural-chat:latest  (7B, fast, good for JSON)
   - Or: ollama pull llama3.2:latest              (lightweight)
   - Or: ollama pull dolphin-mixtral:latest       (good for complex tasks)

4. Verify installation: ollama list

5. The platform will automatically detect and use your local models!
  `.trim();
}

/**
 * Instructions for adding the first model
 */
function getFirstModelInstructions(): string {
  return `
🎯 Ollama is running but no models found!

Pull a model to get started:

1. Neural Chat (RECOMMENDED - best for courses):
   ollama pull neural-chat:latest

2. LLaMA 3.2 (lightweight, fast):
   ollama pull llama3.2:latest

3. Dolphin Mixtral (advanced, better reasoning):
   ollama pull dolphin-mixtral:latest

Then reload the platform to auto-detect your models!
  `.trim();
}

/**
 * Create LLM client for a specific local model
 */
export async function createLocalModelClient(model: LocalModel) {
  // Set up environment for Ollama
  process.env.OLLAMA_BASE_URL = model.baseUrl;
  
  // Dynamically import to avoid circular dependencies
  const { createLLMClient } = await import('./llm-client');
  
  return createLLMClient('ollama', model.name);
}

/**
 * Format model information for display
 */
export function formatModelInfo(model: LocalModel): string {
  const parts = [
    model.name,
    `${model.size.toFixed(1)}GB`,
    `${model.speedRating || 'unknown'} speed`
  ];

  if (model.isBestForJSON) {
    parts.push('✨ JSON-capable');
  }

  if (model.contextLength) {
    parts.push(`${model.contextLength} tokens`);
  }

  return parts.join(' • ');
}

/**
 * Check if a model is currently available (responsive)
 */
export async function checkModelAvailability(model: LocalModel): Promise<boolean> {
  try {
    const response = await fetch(`${model.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model.name,
        prompt: 'test',
        stream: false
      }),
      signal: AbortSignal.timeout(3000)
    });

    return response.ok;
  } catch {
    return false;
  }
}
