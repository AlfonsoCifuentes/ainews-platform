// Local definition for OllamaModel (declared locally in the script but not exported)
export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
  details?: {
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface OllamaDiagnostics {
  hostChecks: Array<{ host: string; ok: boolean; status?: number; error?: string; durationMs?: number }>;
  warmups: Array<{ model: string; ok: boolean; attempts: number; lastError?: string; durationMs?: number }>;
  generateAttempts: Array<{ model: string; promptLen: number; ok: boolean; attempt: number; durationMs?: number; error?: string }>;
}

export const diagnostics: OllamaDiagnostics = {
  hostChecks: [],
  warmups: [],
  generateAttempts: [],
};

export const DEFAULT_OLLAMA_CANDIDATES = [
  process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  'http://127.0.0.1:11434',
  'http://localhost:11434',
  'http://host.docker.internal:11434',
];

export async function checkOllamaRunning(candidates = DEFAULT_OLLAMA_CANDIDATES, timeout = 15000): Promise<string | null> {
  for (const host of candidates) {
    const url = `${host}/api/version`;
    const start = Date.now();
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
      const duration = Date.now() - start;
      if (response.ok) {
        diagnostics.hostChecks.push({ host, ok: true, status: response.status, durationMs: duration });
        return host;
      } else {
        diagnostics.hostChecks.push({ host, ok: false, status: response.status, durationMs: duration });
      }
    } catch (err) {
      const duration = Date.now() - start;
      diagnostics.hostChecks.push({ host, ok: false, error: err instanceof Error ? err.message : String(err), durationMs: duration });
    }
  }
  return null;
}

export async function getOllamaModels(baseUrl: string, timeout = 20000): Promise<OllamaModel[]> {
  const url = `${baseUrl}/api/tags`;
  const start = Date.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    const duration = Date.now() - start;
    if (!response.ok) return [];
    const data = await response.json();
    // Ollama returns a `models` array
    const models = data.models || [];
    diagnostics.hostChecks.push({ host: baseUrl, ok: true, status: response.status, durationMs: duration });
    return models;
  } catch (err) {
    diagnostics.hostChecks.push({ host: baseUrl, ok: false, error: err instanceof Error ? err.message : String(err), durationMs: Date.now() - start });
    return [];
  }
}

export async function warmOllamaModel(baseUrl: string, model: string, maxAttempts: number = 3, timeout = 30000): Promise<boolean> {
  const url = `${baseUrl}/api/generate`;
  const pingPrompt = 'Please respond with OK once model is ready.';
  let lastError: string | undefined;
  const start = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: pingPrompt, stream: false }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        // We don't use the response body here, we just need a successful response
        await response.json().catch(() => null);
        const elapsed = Date.now() - start;
        diagnostics.warmups.push({ model, ok: true, attempts: attempt, durationMs: elapsed });
        return true;
      }
      lastError = `HTTP ${response.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await new Promise(resolve => setTimeout(resolve, attempt * 1000));
  }

  diagnostics.warmups.push({ model, ok: false, attempts: maxAttempts, lastError, durationMs: Date.now() - start });
  return false;
}

export async function generateWithOllama(baseUrl: string, model: string, prompt: string, options?: Record<string, unknown>, timeout = 600_000): Promise<string> {
  const url = `${baseUrl}/api/generate`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const start = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, ...options }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const elapsed = Date.now() - start;
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      diagnostics.generateAttempts.push({ model, promptLen: prompt.length, ok: false, attempt: 1, durationMs: elapsed, error: `HTTP ${response.status}: ${text.substring(0, 200)}` });
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    // stream or non-stream
    let responseText = '';
    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: rd } = await reader.read();
        done = !!rd;
        if (value) responseText += decoder.decode(value, { stream: !done });
      }
      try { const json = JSON.parse(responseText); responseText = json.response ?? responseText; } catch {}
    } else {
      const json = await response.json().catch(() => null);
      responseText = json?.response ?? '';
      if (!responseText) responseText = await response.text().catch(() => '');
    }

    diagnostics.generateAttempts.push({ model, promptLen: prompt.length, ok: true, attempt: 1, durationMs: elapsed });
    return responseText;
  } catch (err) {
    clearTimeout(timeoutId);
    const elapsed = Date.now() - start;
    diagnostics.generateAttempts.push({ model, promptLen: prompt.length, ok: false, attempt: 1, durationMs: elapsed, error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
