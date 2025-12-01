import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkOllamaRunning, warmOllamaModel, generateWithOllama, diagnostics as diag, DEFAULT_OLLAMA_CANDIDATES } from '../../lib/ai/ollama-client';

async function makeResponse(status = 200, body?: any) {
  // return a Response-like object for global fetch
  const text = typeof body === 'string' ? body : JSON.stringify(body || {});
  return new Response(text, { status, headers: { 'Content-Type': 'application/json' } });
}

describe('Ollama client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // clear diagnostics
    diag.hostChecks.length = 0;
    diag.warmups.length = 0;
    diag.generateAttempts.length = 0;
  });

  it('should detect an available Ollama host among candidates', async () => {
    const fetchStub = vi.stubGlobal('fetch', async (url: string) => {
      if (url.includes('127.0.0.1')) return await makeResponse(404, {});
      if (url.includes('host.docker')) return await makeResponse(200, { version: '0.1.0' });
      return await makeResponse(404, {});
    });

    const host = await checkOllamaRunning([ 'http://127.0.0.1:11434', 'http://host.docker.internal:11434' ]);
    expect(host).toBe('http://host.docker.internal:11434');
    expect(diag.hostChecks.length).toBeGreaterThanOrEqual(1);
    fetchStub.mockRestore();
  });

  it('should warm up an Ollama model (OK response)', async () => {
    vi.stubGlobal('fetch', async (url: string) => {
      return await makeResponse(200, { response: 'OK' });
    });

    const ok = await warmOllamaModel('qwen3:30b', 2);
    expect(ok).toBe(true);
    expect(diag.warmups.length).toBe(1);
  });

  it('should generate with streaming path', async () => {
    // Create a streaming ReadableStream that yields JSON response
    const rstream = new ReadableStream({
      start(controller) {
        const text1 = JSON.stringify({ response: 'Hello from stream part 1' });
        controller.enqueue(new TextEncoder().encode(text1));
        controller.close();
      }
    });
    const response = new Response(rstream as any, { status: 200, headers: { 'Content-Type': 'application/json' } });

    vi.stubGlobal('fetch', async (url: string) => response as any);

    const out = await generateWithOllama('http://localhost:11434', 'qwen3:30b', 'Hello');
    expect(out).toContain('Hello');
    expect(diag.generateAttempts.length).toBeGreaterThan(0);
  });
});