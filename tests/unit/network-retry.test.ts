import { describe, expect, it, vi } from 'vitest';
import { isRetryableNetworkFailure, withNetworkRetry } from '@/lib/utils/network-retry';

describe('isRetryableNetworkFailure', () => {
  it('detects fetch and transient network failures', () => {
    expect(isRetryableNetworkFailure(new Error('TypeError: fetch failed'))).toBe(true);
    expect(isRetryableNetworkFailure({ message: 'getaddrinfo ENOTFOUND example.com' })).toBe(true);
    expect(isRetryableNetworkFailure('socket hang up')).toBe(true);
  });

  it('does not treat non-network errors as retryable', () => {
    expect(isRetryableNetworkFailure(new Error('Invalid API key'))).toBe(false);
  });
});

describe('withNetworkRetry', () => {
  it('retries transient failures and eventually succeeds', async () => {
    vi.useFakeTimers();
    const task = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
      .mockResolvedValue('ok');

    const pending = withNetworkRetry('restore', task, { baseDelayMs: 10 });
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toBe('ok');
    expect(task).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('does not retry non-network failures', async () => {
    const task = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('permission denied'));

    await expect(withNetworkRetry('restore', task)).rejects.toThrow('permission denied');
    expect(task).toHaveBeenCalledTimes(1);
  });
});
