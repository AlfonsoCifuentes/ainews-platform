/**
 * Structured Logging System
 * Phase 5.1 - Category I: Observability
 * 
 * Features:
 * - Leveled logging (debug, info, warn, error)
 * - Structured JSON output
 * - Context enrichment
 * - Performance tracking
 */

// ============================================================================
// TYPES
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  operation?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// ============================================================================
// LOGGER CLASS
// ============================================================================

class Logger {
  private minLevel: LogLevel;
  private context: LogContext;

  constructor(minLevel: LogLevel = 'info', context: LogContext = {}) {
    this.minLevel = minLevel;
    this.context = context;
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel) {
    this.minLevel = level;
  }

  /**
   * Add persistent context to all logs
   */
  setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
  }

  /**
   * Check if level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.minLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  /**
   * Format log entry as JSON
   */
  private format(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // In development, pretty print
    if (process.env.NODE_ENV === 'development') {
      return JSON.stringify(entry, null, 2);
    }

    // In production, single line JSON
    return JSON.stringify(entry);
  }

  /**
   * Write log to console
   */
  private write(level: LogLevel, formatted: string) {
    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext) {
    if (!this.shouldLog('debug')) return;
    this.write('debug', this.format('debug', message, context));
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext) {
    if (!this.shouldLog('info')) return;
    this.write('info', this.format('info', message, context));
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext) {
    if (!this.shouldLog('warn')) return;
    this.write('warn', this.format('warn', message, context));
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext) {
    if (!this.shouldLog('error')) return;
    this.write('error', this.format('error', message, context, error));
  }

  /**
   * Create child logger with additional context
   */
  child(context: LogContext): Logger {
    return new Logger(this.minLevel, { ...this.context, ...context });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || 
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

export const logger = new Logger(LOG_LEVEL);

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: string;
  success: boolean;
  metadata?: Record<string, unknown>;
}

const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 1000; // Keep last 1000 metrics in memory

/**
 * Track operation performance
 */
export async function trackPerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const start = performance.now();
  let success = true;

  try {
    const result = await fn();
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const duration = performance.now() - start;

    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date().toISOString(),
      success,
      metadata,
    };

    // Add to metrics array
    metrics.push(metric);
    if (metrics.length > MAX_METRICS) {
      metrics.shift(); // Remove oldest
    }

    // Log slow operations (>1s)
    if (duration > 1000) {
      logger.warn(`Slow operation detected: ${operation}`, {
        operation,
        duration,
        success,
        ...metadata,
      });
    }

    // Log all operations in debug mode
    logger.debug(`Operation completed: ${operation}`, {
      operation,
      duration,
      success,
      ...metadata,
    });
  }
}

/**
 * Get performance metrics
 */
export function getMetrics(filter?: {
  operation?: string;
  minDuration?: number;
  since?: Date;
}): PerformanceMetric[] {
  let filtered = [...metrics];

  if (filter?.operation) {
    filtered = filtered.filter(m => m.operation === filter.operation);
  }

  if (filter?.minDuration) {
    filtered = filtered.filter(m => m.duration >= filter.minDuration!);
  }

  if (filter?.since) {
    const sinceTime = filter.since.getTime();
    filtered = filtered.filter(m => new Date(m.timestamp).getTime() >= sinceTime);
  }

  return filtered;
}

/**
 * Get average duration for operation
 */
export function getAverageDuration(operation: string): number {
  const operationMetrics = metrics.filter(m => m.operation === operation);
  if (operationMetrics.length === 0) return 0;

  const total = operationMetrics.reduce((sum, m) => sum + m.duration, 0);
  return total / operationMetrics.length;
}

/**
 * Clear metrics (for testing)
 */
export function clearMetrics() {
  metrics.length = 0;
}

// ============================================================================
// HTTP REQUEST LOGGING
// ============================================================================

export interface RequestLog {
  method: string;
  url: string;
  statusCode?: number;
  duration: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
  timestamp: string;
}

const requestLogs: RequestLog[] = [];
const MAX_REQUEST_LOGS = 500;

/**
 * Log HTTP request
 */
export function logRequest(log: RequestLog) {
  requestLogs.push(log);
  if (requestLogs.length > MAX_REQUEST_LOGS) {
    requestLogs.shift();
  }

  logger.info(`HTTP ${log.method} ${log.url}`, {
    method: log.method,
    url: log.url,
    statusCode: log.statusCode,
    duration: log.duration,
    userId: log.userId,
  });
}

/**
 * Get recent request logs
 */
export function getRequestLogs(limit: number = 100): RequestLog[] {
  return requestLogs.slice(-limit);
}

// ============================================================================
// ERROR AGGREGATION
// ============================================================================

interface ErrorCount {
  message: string;
  count: number;
  lastOccurrence: string;
  stack?: string;
}

const errorCounts = new Map<string, ErrorCount>();

/**
 * Track error occurrence
 */
export function trackError(error: Error) {
  const key = `${error.name}:${error.message}`;
  const existing = errorCounts.get(key);

  if (existing) {
    existing.count++;
    existing.lastOccurrence = new Date().toISOString();
  } else {
    errorCounts.set(key, {
      message: error.message,
      count: 1,
      lastOccurrence: new Date().toISOString(),
      stack: error.stack,
    });
  }

  logger.error(error.message, error, {
    errorName: error.name,
    occurrences: errorCounts.get(key)?.count,
  });
}

/**
 * Get error statistics
 */
export function getErrorStats(): ErrorCount[] {
  return Array.from(errorCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 50); // Top 50 errors
}

/**
 * Clear error stats (for testing)
 */
export function clearErrorStats() {
  errorCounts.clear();
}
