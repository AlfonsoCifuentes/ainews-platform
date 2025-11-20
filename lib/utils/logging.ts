import { useMemo } from 'react';

/**
 * Client-side logging system for debugging production issues
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: unknown;
  stack?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 500;
  private readonly isDev = process.env.NODE_ENV === 'development';

  log(level: LogLevel, component: string, message: string, data?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      data,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Always log to console in development
    if (this.isDev) {
      this.logToConsole(entry);
    }

    // Store in localStorage for production debugging
    this.storeInLocalStorage();
  }

  debug(component: string, message: string, data?: unknown) {
    this.log('debug', component, message, data);
  }

  info(component: string, message: string, data?: unknown) {
    this.log('info', component, message, data);
    if (!this.isDev) console.log(`[${component}] ${message}`, data);
  }

  warn(component: string, message: string, data?: unknown) {
    this.log('warn', component, message, data);
    console.warn(`[${component}] ${message}`, data);
  }

  error(component: string, message: string, error?: unknown) {
    const _stack = error instanceof Error ? error.stack : String(error);
    this.log('error', component, message, error);
    console.error(`[${component}] ${message}`, error);
    
    // Send critical errors to Sentry-like service if needed
    this.sendToMonitoring(component, message, error);
  }

  private logToConsole(entry: LogEntry) {
    const prefix = `[${entry.component}] ${entry.timestamp}`;
    const style = this.getLevelStyle(entry.level);
    
    if (entry.data !== undefined) {
      console.log(`%c${prefix} ${entry.message}`, style, entry.data);
    } else {
      console.log(`%c${prefix} ${entry.message}`, style);
    }
  }

  private getLevelStyle(level: LogLevel): string {
    const styles = {
      debug: 'color: #999; font-weight: bold;',
      info: 'color: #00f; font-weight: bold;',
      warn: 'color: #f90; font-weight: bold;',
      error: 'color: #f00; font-weight: bold;',
    };
    return styles[level];
  }

  private storeInLocalStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const logsJson = JSON.stringify(this.logs.slice(-100)); // Keep last 100 logs
        localStorage.setItem('ai-news-logs', logsJson);
        localStorage.setItem('ai-news-logs-timestamp', new Date().toISOString());
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Silently fail if localStorage is full or unavailable
    }
  }

  private sendToMonitoring(_component: string, _message: string, _error?: unknown) {
    // Implement Sentry or similar monitoring here
    // For now, just log critical errors
    if (typeof window !== 'undefined' && window.navigator) {
      try {
        // Example: Send to monitoring service
        // fetch('/api/monitoring/log', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ _component, _message, _error }),
        // }).catch(() => {});
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_unusedError) {
        // Silently fail
      }
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByComponent(component: string): LogEntry[] {
    return this.logs.filter(log => log.component === component);
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs() {
    this.logs = [];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('ai-news-logs');
        localStorage.removeItem('ai-news-logs-timestamp');
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Silently fail
    }
  }
}

export const logger = new Logger();

// Global error handler for uncaught errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error('Global-Error', `Uncaught error: ${event.message}`, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Global-Promise', `Unhandled promise rejection`, {
      reason: event.reason,
    });
  });
}

/**
 * React hook for using logger in components
 * Usage: const logger = useLogger('ComponentName');
 * logger.info('message', { data });
 */
export function useLogger(componentName: string) {

  // Memoize the returned logger functions so the object identity remains stable
  return useMemo(() => ({
    debug: (message: string, data?: unknown): void => logger.debug(componentName, message, data),
    info: (message: string, data?: unknown): void => logger.info(componentName, message, data),
    warn: (message: string, data?: unknown): void => logger.warn(componentName, message, data),
    error: (message: string, error?: unknown): void => logger.error(componentName, message, error),
  }), [componentName]);
}
