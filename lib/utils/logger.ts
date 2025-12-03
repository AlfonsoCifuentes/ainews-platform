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

const STORAGE_KEY = 'thotnet_logs';
const MAX_LOGS = 500;
const MAX_DUPLICATE_COUNT = 5; // Stop logging after 5 identical messages

// Deduplication tracking
const messageCountMap = new Map<string, number>();
// Tracks whether we've already emitted a summary suppression log for a key
const suppressionEmitted = new Set<string>();
// Track how many messages were suppressed after the limit
const suppressedCounts = new Map<string, number>();

/**
 * Generate a deduplication key for a log entry
 */
function getDedupeKey(module: string, level: LogLevel, message: string): string {
  // Normalize message to remove uuid/timestamps and other volatile parts
  const normalized = normalizeMessageForDedupe(message);
  return `${module}:${level}:${normalized}`;
}

/**
 * Normalize volatile parts of messages so they dedupe correctly.
 * This reduces log noise when IDs, timestamps or long stacks differ.
 */
function normalizeMessageForDedupe(input: string): string {
  if (!input) return '';
  let s = input;
  // Replace UUIDs
  s = s.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>');
  // Replace ISO timestamps
  s = s.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z/g, '<TS>');
  // Replace hex addresses (e.g. 0x...)
  s = s.replace(/0x[0-9a-f]{6,}/gi, '<HEX>');
  // Replace long numbers (IDs / auto-incremented IDs)
  s = s.replace(/\b\d{4,}\b/g, '<NUM>');
  // Strip stack noise like file paths (only keep file name)
  s = s.replace(/([\\/][\w-_.]+\.[tj]s[x]?)(:\d+:\d+)?/g, '/<FILE>');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// Detect compact console mode (use localStorage 'thotnet_log_mode' === 'compact')
function isCompactConsole(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage?.getItem('thotnet_log_mode') === 'compact';
  } catch {
    return false;
  }
}

// Set compact console mode helper
export function setLogMode(mode: 'compact' | 'pretty' | 'auto') {
  if (typeof window === 'undefined') return;
  if (mode === 'auto') {
    try {
      window.localStorage.removeItem('thotnet_log_mode');
    } catch {}
  } else {
    try { window.localStorage.setItem('thotnet_log_mode', mode); } catch {}
  }
}

/**
 * Check if we should log this message (deduplication)
 * Returns the current count, or -1 if we should skip
 */
function shouldLog(module: string, level: LogLevel, message: string): number {
  const key = getDedupeKey(module, level, message);
  const currentCount = messageCountMap.get(key) || 0;
  
  if (currentCount < MAX_DUPLICATE_COUNT) {
    // We are still within allowed repetitions
    messageCountMap.set(key, currentCount + 1);
    return currentCount + 1;
  }

  // Already exceeded the threshold
  if (!suppressionEmitted.has(key)) {
    // Emit a single suppression summary once
    suppressionEmitted.add(key);
    // We use a special code (MAX_DUPLICATE_COUNT + 1) to indicate 'emitted summary'
    return MAX_DUPLICATE_COUNT + 1;
  }

  // Count suppressed messages for diagnostics (not printed)
  suppressedCounts.set(key, (suppressedCounts.get(key) || 0) + 1);
  return -1; // Skip
}

/**
 * Main logger instance
 * Usage: log('auth', 'info', 'User authenticated')
 */
function logInternal(
  moduleName: string,
  level: LogLevel,
  message: string,
  data: Record<string, unknown> | Error | unknown | undefined,
  count: number
) {
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
  const moduleNamePrefixed = `[${moduleName.toUpperCase()}]`;
  const countSuffix = count > 1 ? ` (x${count})` : '';

  // Build log message
  const logMessage = `${prefix} ${readableTime} ${moduleNamePrefixed} ${message}${countSuffix}`;

  // Console logging with styling (suppress for network/db to reduce noise)
  const suppressConsole = level === 'network' || level === 'db';
  if (!suppressConsole) {
    if (isCompactConsole()) {
      // Compact JSON mode for machine consumption
      try {
        const compactEntry = {
          t: now.toISOString(),
          m: moduleName,
          l: level,
          msg: message,
          cnt: count,
          data: data !== undefined ? safeSerialize(data) : undefined,
        };
        // Use console.log without color to be machine-parseable
        console.log(JSON.stringify(compactEntry));
      } catch {
        console.log(logMessage, data);
      }
    } else {
      if (data !== undefined) {
        console.log(`%c${logMessage}`, `color: ${color}; font-weight: bold;`, data);
      } else {
        console.log(`%c${logMessage}`, `color: ${color}; font-weight: bold;`);
      }
    }
  }

  const entry: ClientLogEntry = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `log_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: now.toISOString(),
    module: moduleName,
    level,
    message: count > 1 ? `${message} (x${count})` : message,
    data: data !== undefined ? safeSerialize(data) : null,
    count,
  };

  persistLog(entry);
}

export function log(
  moduleName: string,
  level: LogLevel = 'info',
  message: string,
  data?: Record<string, unknown> | Error | unknown
) {
  // Check deduplication and increment
  const count = shouldLog(moduleName, level, message);
  if (count === -1) {
    return; // Skip duplicate log
  }
  // If it's the suppression summary code, then build a suppression message
  if (count === MAX_DUPLICATE_COUNT + 1) {
    const key = getDedupeKey(moduleName, level, message);
    const suppressed = suppressedCounts.get(key) || 0;
    logInternal(moduleName, level, `${message} (suppressed ${suppressed} more times)`, data, count);
    // Reset suppressed counts for that key
    suppressedCounts.set(key, 0);
    return;
  }

  // Use internal logger to persist / console the message
  logInternal(moduleName, level, message, data, count);
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
      new CustomEvent<ClientLogEventDetail>('thotnet-log', {
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
  suppressionEmitted.clear();
  suppressedCounts.clear();
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
  suppressionEmitted.clear();
  suppressedCounts.clear();
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
  a.download = `thotnet-logs-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export logs in compact machine-friendly format (one-line JSON per entry)
 */
export function exportLogsCompact(): string {
  const logs = getLogs();
  const minified = logs.map(l => ({ t: l.timestamp, m: l.module, l: l.level, msg: l.message, cnt: l.count, data: l.data }));
  return JSON.stringify(minified);
}

/**
 * Copy compact logs to clipboard for quick sharing
 */
export async function copyLogsCompact() {
  if (typeof navigator === 'undefined' || typeof navigator.clipboard === 'undefined') {
    return false;
  }
  try {
    const compact = exportLogsCompact();
    await navigator.clipboard.writeText(compact);
    return true;
  } catch {
    return false;
  }
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
  const originalConsoleInfo = console.info;
  const originalConsoleLog = console.log;
  
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
    // Build message from args
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : 
      arg instanceof Error ? arg.message : 
      tryStringify(arg)
    ).join(' ').substring(0, 500);
    
    // Check dedupe and decide whether to print to original console
    const count = shouldLog('console', 'error', message);
    if (count === -1) {
      // Too many duplicates; don't flood original console
      return;
    }
    if (count === MAX_DUPLICATE_COUNT + 1) {
      // Emit a single suppression summary to avoid flood
      originalConsoleError(`[AINLOG] Further duplicate console.error suppressed for: ${message}`);
      // Persist a suppression log
      logInternal('console', 'error', `${message} (further duplicates suppressed)`, undefined, count);
      return;
    }
    // Print actual message
    originalConsoleError(...args);
    
    // Don't log our own errors or React internal errors to avoid noise
    const skipPatterns = ['[AINLOG]', '[network]', 'Warning:', 'React does not recognize'];
    if (!skipPatterns.some(p => message.includes(p))) {
      logInternal('console', 'error', message, undefined, count);
    }
  };
  
  // Intercept console.warn for automatic warning capture
  console.warn = function(...args: unknown[]) {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : 
      arg instanceof Error ? arg.message : 
      tryStringify(arg)
    ).join(' ').substring(0, 500);
    const count = shouldLog('console', 'warn', message);
    if (count === -1) {
      return;
    }
    if (count === MAX_DUPLICATE_COUNT + 1) {
      originalConsoleWarn(`[AINLOG] Further duplicate console.warn suppressed for: ${message}`);
      logInternal('console', 'warn', `${message} (further duplicates suppressed)`, undefined, count);
      return;
    }
    originalConsoleWarn(...args);
    
    const skipPatterns = ['[AINLOG]', '[network]', 'Warning: React', 'Warning: Each child', 'Warning: Failed prop'];
    if (!skipPatterns.some(p => message.includes(p))) {
      logInternal('console', 'warn', message, undefined, count);
    }
  };

  // Intercept console.info for automatic info capture
  console.info = function(...args: unknown[]) {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : 
      arg instanceof Error ? arg.message : 
      tryStringify(arg)
    ).join(' ').substring(0, 500);
    const count = shouldLog('console', 'info', message);
    if (count === -1) return;
    if (count === MAX_DUPLICATE_COUNT + 1) {
      originalConsoleInfo(`[AINLOG] Further duplicate console.info suppressed for: ${message}`);
      logInternal('console', 'info', `${message} (further duplicates suppressed)`, undefined, count);
      return;
    }
    originalConsoleInfo(...args);
    const skipPatterns = ['[AINLOG]'];
    if (!skipPatterns.some(p => message.includes(p))) {
      logInternal('console', 'info', message, undefined, count);
    }
  };

  // Intercept console.log for automatic info capture (less noisy than warn/error)
  console.log = function(...args: unknown[]) {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : 
      arg instanceof Error ? arg.message : 
      tryStringify(arg)
    ).join(' ').substring(0, 500);
    const count = shouldLog('console', 'info', message);
    if (count === -1) return;
    if (count === MAX_DUPLICATE_COUNT + 1) {
      originalConsoleLog(`[AINLOG] Further duplicate console.log suppressed for: ${message}`);
      logInternal('console', 'info', `${message} (further duplicates suppressed)`, undefined, count);
      return;
    }
    originalConsoleLog(...args);
    const skipPatterns = ['[AINLOG]'];
    if (!skipPatterns.some(p => message.includes(p))) {
      logInternal('console', 'info', message, undefined, count);
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
    setLogMode,
    exportLogsCompact,
    copyLogsCompact,
  };
  
  // Initialize interceptors for automatic capture
  initializeInterceptors();
}
