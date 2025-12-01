import { describe, it, expect, beforeEach } from 'vitest';
import { log, getLogs, resetDeduplication } from '../../lib/utils/logger';

describe('Logger deduplication', () => {
  beforeEach(() => {
    // Provide a minimal window/sessionStorage polyfill for Node environment
    if (typeof globalThis.window === 'undefined') {
      (globalThis as any).window = { sessionStorage: {} } as any;
    }
    const storage = new Map<string, string>();
    (globalThis as any).window.sessionStorage = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    } as any;
    // Some browser APIs used by logger
    (globalThis as any).window.dispatchEvent = () => {};
    (globalThis as any).performance = { now: () => Date.now() } as any;
  });

  it('should dedupe repeated messages and include count', async () => {
    resetDeduplication();

    for (let i = 0; i < 7; i++) {
      log('test', 'info', 'duplicate message');
    }

    const logs = getLogs().filter(l => l.module === 'test' && l.message.includes('duplicate message'));
    // First 5 should be individual, then one suppression message
    expect(logs.length).toBeGreaterThan(0);
    // Last entry should be the suppression summary or include (suppressed)
    expect(logs[logs.length - 1].message.toLowerCase()).toContain('suppressed');
  });
});
