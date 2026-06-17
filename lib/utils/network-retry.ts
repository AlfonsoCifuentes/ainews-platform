function errorToString(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function isRetryableNetworkFailure(error: unknown): boolean {
  const text = errorToString(error).toLowerCase();

  return (
    text.includes('fetch failed') ||
    text.includes('network') ||
    text.includes('enotfound') ||
    text.includes('econnreset') ||
    text.includes('etimedout') ||
    text.includes('socket') ||
    text.includes('temporarily unavailable') ||
    text.includes('502') ||
    text.includes('503') ||
    text.includes('504')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withNetworkRetry<T>(
  label: string,
  task: () => Promise<T>,
  options?: {
    maxRetries?: number;
    baseDelayMs?: number;
  },
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (!isRetryableNetworkFailure(error) || attempt === maxRetries) {
        throw error;
      }

      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), 12000);
      console.warn(
        `[Retry] ${label} failed (attempt ${attempt}/${maxRetries}): ${errorToString(error)}. Retrying in ${delay}ms`,
      );
      await sleep(delay);
    }
  }

  throw lastError ?? new Error(`${label} failed after retries`);
}
