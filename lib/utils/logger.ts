/**
 * Browser Console Logger System
 * Comprehensive logging for debugging auth, user state, and app lifecycle
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

const LOG_COLORS = {
  debug: '#888888',
  info: '#0066CC',
  warn: '#FF9900',
  error: '#CC0000',
  success: '#00AA00',
};

const LOG_PREFIXES = {
  debug: '🔍',
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  success: '✅',
};

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
  const timestamp = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });

  const prefix = LOG_PREFIXES[level];
  const color = LOG_COLORS[level];
  const moduleName = `[${module.toUpperCase()}]`;

  // Build log message
  const logMessage = `${prefix} ${timestamp} ${moduleName} ${message}`;

  // Console logging with styling
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

  // Store in session for debugging
  try {
    const logs = JSON.parse(sessionStorage.getItem('ainews_logs') || '[]') as Array<{
      timestamp: string;
      module: string;
      level: LogLevel;
      message: string;
      data: string | null;
    }>;
    logs.push({
      timestamp,
      module,
      level,
      message,
      data: data ? JSON.stringify(data) : null,
    });
    // Keep only last 100 logs
    if (logs.length > 100) logs.shift();
    sessionStorage.setItem('ainews_logs', JSON.stringify(logs));
  } catch {
    // Ignore storage errors
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
};

/**
 * Get all logs from session
 */
export function getLogs() {
  try {
    const logs = JSON.parse(sessionStorage.getItem('ainews_logs') || '[]');
    return logs;
  } catch {
    return [];
  }
}

/**
 * Clear logs
 */
export function clearLogs() {
  sessionStorage.removeItem('ainews_logs');
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
    url: window.location.href,
  };
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
  };
  console.log(
    '%c🔍 AINLog API Available - Use window.AINLog.getLogs() to debug',
    'color: #00AA00; font-weight: bold; font-size: 12px;'
  );
}
