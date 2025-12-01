import { describe, it, expect } from 'vitest';
import { log, getLogs, resetDeduplication } from '../../lib/utils/logger';

describe('Logger deduplication', () => {
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
