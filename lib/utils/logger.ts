/**
 * Browser Console Logger System
 * Comprehensive logging for debugging auth, user state, and app lifecycle
 * Includes network interception, error capture, and deduplication
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success' | 'network' | 'db';

export interface ClientLogEntry {
  id: string;
  timestamp: string;
  module: string;
  level: LogLevel;
  message: string;
  data?: string | null;
  count?: number; // For deduplication
}

export type ClientLogEventDetail = ClientLogEntry & { raw?: unknown };

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '#888888',
  info: '#0066CC',
  warn: '#FF9900',
  error: '#CC0000',
  success: '#00AA00',
  network: '#9933FF',
  db: '#00CCCC',
};

const LOG_PREFIXES: Record<LogLevel, string> = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  success: '✅',
  network: '🌐',
  db: '🗄️',
};

const STORAGE_KEY = 'ainews_logs';
const MAX_LOGS = 500;
const MAX_DUPLICATE_COUNT = 5; // Stop logging after 5 identical messages

// Deduplication tracking
const messageCountMap = new Map<string, number>();

/**
 * Generate a deduplication key for a log entry
 */
function getDedupeKey(module: string, level: LogLevel, message: string): string {
  return `${module}:${level}:${message}`;
}

/**
 * Check if we should log this message (deduplication)
 * Returns the current count, or -1 if we should skip
 */
function shouldLog(module: string, level: LogLevel, message: string): number {
  const key = getDedupeKey(module, level, message);
  const currentCount = messageCountMap.get(key) || 0;
  
  if (currentCount >= MAX_DUPLICATE_COUNT) {
    return -1; // Skip this log
  }
  
  messageCountMap.set(key, currentCount + 1);
  return currentCount + 1;
}

/**
 * Main logger instance
 * Usage: log('auth', 'info', 'User authenticated')
 */
export function log(
  module: string,
  level: LogLevel = 'info',
  message: string,
  data?: Record<string, unknown> | Error | unknown
) {
  // Check deduplication
  const count = shouldLog(module, level, message);
  if (count === -1) {
    return; // Skip duplicate log
  }

  const now = new Date();
  const readableTime = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });

  const prefix = LOG_PREFIXES[level] || '📝';
  const color = LOG_COLORS[level] || '#888888';
  const moduleName = `[${module.toUpperCase()}]`;
  const countSuffix = count > 1 ? ` (x${count})` : '';

  // Build log message
  const logMessage = `${prefix} ${readableTime} ${moduleName} ${message}${countSuffix}`;

  // Console logging with styling (suppress for network/db to reduce noise)
  const suppressConsole = level === 'network' || level === 'db';
  if (!suppressConsole) {
    if (data !== undefined) {
      console.log(
        `%c${logMessage}`,
        `color: ${color}; font-weight: bold;`,
        data
      );
    } else {
      console.log(
        `%c${logMessage}`,
        `color: ${color}; font-weight: bold;`
      );
    }
  }

  const entry: ClientLogEntry = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `log_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: now.toISOString(),
    module,
    level,
    message: count > 1 ? `${message} (x${count})` : message,
    data: data !== undefined ? safeSerialize(data) : null,
    count,
  };

  persistLog(entry);
}

function safeSerialize(payload: unknown): string {
  if (payload instanceof Error) {
    return JSON.stringify(
      {
        name: payload.name,
        message: payload.message,
        stack: payload.stack,
      },
      null,
      2
    );
  }

  if (typeof payload === 'string') {
    return payload;
  }

  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

function persistLog(entry: ClientLogEntry) {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY) || '[]';
    const parsed = JSON.parse(raw) as ClientLogEntry[];
    parsed.push(entry);
    if (parsed.length > MAX_LOGS) {
      parsed.splice(0, parsed.length - MAX_LOGS);
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));

    window.dispatchEvent(
      new CustomEvent<ClientLogEventDetail>('ainews-log', {
        detail: { ...entry },
      })
    );
  } catch (error) {
    console.warn('[AINLog] Failed to persist log entry', error);
  }
}

/**
 * Shorthand loggers for common modules
 */
export const loggers = {
  auth: (message: string, data?: Record<string, unknown> | Error | unknown) => log('auth', 'info', message, data),
  user: (message: string, data?: Record<string, unknown> | Error | unknown) => log('user', 'info', message, data),
  course: (message: string, data?: Record<string, unknown> | Error | unknown) => log('course', 'info', message, data),
  nav: (message: string, data?: Record<string, unknown> | Error | unknown) => log('nav', 'info', message, data),
  modal: (message: string, data?: Record<string, unknown> | Error | unknown) => log('modal', 'info', message, data),
  oauth: (message: string, data?: Record<string, unknown> | Error | unknown) => log('oauth', 'info', message, data),
  event: (message: string, data?: Record<string, unknown> | Error | unknown) => log('event', 'info', message, data),
  error: (module: string, message: string, error?: Record<string, unknown> | Error | unknown) =>
    log(module, 'error', message, error),
  warn: (module: string, message: string, data?: Record<string, unknown> | Error | unknown) =>
    log(module, 'warn', message, data),
  success: (module: string, message: string, data?: Record<string, unknown> | Error | unknown) =>
    log(module, 'success', message, data),
  network: (message: string, data?: Record<string, unknown> | Error | unknown) =>
    log('network', 'network', message, data),
  db: (message: string, data?: Record<string, unknown> | Error | unknown) =>
    log('database', 'db', message, data),
};

/**
 * Reset deduplication counters (useful for testing or after long periods)
 */
export function resetDeduplication() {
  messageCountMap.clear();
}

/**
 * Get all logs from session
 */
export function getLogs(): ClientLogEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const logs = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '[]') as ClientLogEntry[];
    return logs;
  } catch {
    return [];
  }
}

/**
 * Clear logs
 */
export function clearLogs() {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.removeItem(STORAGE_KEY);
  messageCountMap.clear();
}

/**
 * Export logs as JSON for debugging
 */
export function exportLogs() {
  const logs = getLogs();
  const text = JSON.stringify(logs, null, 2);
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ainews-logs-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Export all logs helper
export function getLogsForDebug() {
  return {
    logs: getLogs(),
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : 'N/A',
  };
}

// Track if we've already initialized interceptors
let interceptorsInitialized = false;

/**
 * Initialize global interceptors for automatic logging
 */
function initializeInterceptors() {
  if (typeof window === 'undefined' || interceptorsInitialized) {
    return;
  }
  
  interceptorsInitialized = true;
  
  // Store original functions
  const originalFetch = window.fetch;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  // Intercept fetch for network logging
  window.fetch = async function(...args: Parameters<typeof fetch>) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
    const method = (args[1]?.method || 'GET').toUpperCase();
    const startTime = performance.now();
    
    // Skip logging for certain URLs to reduce noise
    const skipPatterns = [
      '/api/health', 
      '/_next/', 
      '/favicon', 
      '.js', 
      '.css', 
      '.woff', 
      '.woff2',
      '.png', 
      '.jpg', 
      '.jpeg',
      '.svg',
      '.ico',
      'supabase.co/storage',
      'googleapis.com/storage',
    ];
    const shouldSkip = skipPatterns.some(pattern => url.includes(pattern));
    
    try {
      const response = await originalFetch.apply(window, args);
      const duration = Math.round(performance.now() - startTime);
      
      if (!shouldSkip) {
        const isError = response.status >= 400;
        const level: LogLevel = isError ? 'error' : 'network';
        const shortUrl = url.replace(window.location.origin, '');
        
        log('network', level, `${method} ${shortUrl} → ${response.status}`, {
          status: response.status,
          statusText: response.statusText,
          duration: `${duration}ms`,
        });
      }
      
      return response;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);
      const shortUrl = url.replace(window.location.origin, '');
      
      if (!shouldSkip) {
        log('network', 'error', `${method} ${shortUrl} → FAILED`, {
          error: error instanceof Error ? error.message : String(error),
          duration: `${duration}ms`,
        });
      }
      
      throw error;
    }
  };
  
  // Helper function to stringify safely
  function tryStringify(value: unknown): string {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  
  // Intercept console.error for automatic error capture
  console.error = function(...args: unknown[]) {
    originalConsoleError.apply(console, args);
    
    // Build message from args
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : 
      arg instanceof Error ? arg.message : 
      tryStringify(arg)
    ).join(' ').substring(0, 500);
    
    // Don't log our own errors or React internal errors to avoid noise
    const skipPatterns = ['[AINLOG]', '[network]', 'Warning:', 'React does not recognize'];
    if (!skipPatterns.some(p => message.includes(p))) {
      log('console', 'error', message);
    }
  };
  
  // Intercept console.warn for automatic warning capture
  console.warn = function(...args: unknown[]) {
    originalConsoleWarn.apply(console, args);
    
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : 
      arg instanceof Error ? arg.message : 
      tryStringify(arg)
    ).join(' ').substring(0, 500);
    
    // Skip React warnings and our own logs
    const skipPatterns = ['[AINLOG]', '[network]', 'Warning: React', 'Warning: Each child', 'Warning: Failed prop'];
    if (!skipPatterns.some(p => message.includes(p))) {
      log('console', 'warn', message);
    }
  };
  
  // Global error handler
  window.addEventListener('error', (event) => {
    log('global', 'error', `Uncaught: ${event.message}`, {
      filename: event.filename?.replace(window.location.origin, ''),
      line: event.lineno,
      col: event.colno,
    });
  });
  
  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error 
      ? event.reason.message 
      : String(event.reason);
    log('global', 'error', `Unhandled Promise: ${reason.substring(0, 300)}`);
  });
}

// Make logger available globally for console debugging
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).AINLog = {
    log,
    loggers,
    getLogs,
    clearLogs,
    exportLogs,
    getLogsForDebug,
    resetDeduplication,
  };
  
  // Initialize interceptors for automatic capture
  initializeInterceptors();
}
