/**
 * Course Learning Logging System
 * Comprehensive logging for course progression, module navigation, and API calls
 * All logs are accessible via window.CourseLogger in the browser
 */

type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  action: string;
  data?: Record<string, unknown> | string | boolean | number | null;
  stack?: string;
}

class CourseLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 500;

  log(component: string, action: string, level: LogLevel = 'info', data?: Record<string, unknown> | string | boolean | number | null) {
    const timestamp = new Date().toLocaleTimeString('es-ES', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });

    const entry: LogEntry = {
      timestamp,
      level,
      component,
      action,
      data,
    };

    this.logs.push(entry);
    
    // Keep memory manageable
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with color
    const colorMap: Record<LogLevel, string> = {
      info: '\x1b[36m',      // Cyan
      warn: '\x1b[33m',      // Yellow
      error: '\x1b[31m',     // Red
      success: '\x1b[32m',   // Green
      debug: '\x1b[35m'      // Magenta
    };
    const color = colorMap[level];
    const reset = '\x1b[0m';

    const message = `[${timestamp}] [${component}] ${action}`;
    // eslint-disable-next-line no-console
    console.log(`${color}${message}${reset}`, data ? data : '');
  }

  info(component: string, action: string, data?: Record<string, unknown> | string | boolean | number | null) {
    this.log(component, action, 'info', data);
  }

  success(component: string, action: string, data?: Record<string, unknown> | string | boolean | number | null) {
    this.log(component, action, 'success', data);
  }

  warn(component: string, action: string, data?: Record<string, unknown> | string | boolean | number | null) {
    this.log(component, action, 'warn', data);
  }

  error(component: string, action: string, data?: Record<string, unknown> | string | boolean | number | null) {
    this.log(component, action, 'error', data);
  }

  debug(component: string, action: string, data?: Record<string, unknown> | string | boolean | number | null) {
    this.log(component, action, 'debug', data);
  }

  getLogs() {
    return this.logs;
  }

  getLogsByComponent(component: string) {
    return this.logs.filter(l => l.component === component);
  }

  getLogsByLevel(level: LogLevel) {
    return this.logs.filter(l => l.level === level);
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create singleton instance
const courseLogger = new CourseLogger();

// Make available globally in browser
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, CourseLogger>).CourseLogger = courseLogger;
}

export default courseLogger;
