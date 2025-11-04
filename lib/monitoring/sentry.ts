/**
 * Sentry Configuration
 * Phase 5.1 - Category H: Security
 * 
 * Error tracking and monitoring setup
 * 
 * INSTALLATION:
 * npm install @sentry/nextjs
 * 
 * SETUP:
 * 1. Create Sentry project at https://sentry.io
 * 2. Add NEXT_PUBLIC_SENTRY_DSN to .env.local
 * 3. Uncomment imports and initialization below
 */

// import * as Sentry from '@sentry/nextjs';

type SeverityLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const _SENTRY_ENV = process.env.NODE_ENV || 'development';
const _SENTRY_RELEASE = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev';

/**
 * Initialize Sentry (call in _app.tsx or layout.tsx)
 * UNCOMMENT WHEN @sentry/nextjs IS INSTALLED
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  // Sentry.init({
  //   dsn: SENTRY_DSN,
  //   environment: SENTRY_ENV,
  //   release: SENTRY_RELEASE,
  //   tracesSampleRate: SENTRY_ENV === 'production' ? 0.1 : 1.0,
  //   sampleRate: 1.0,
  //   integrations: [
  //     new Sentry.BrowserTracing(),
  //     new Sentry.Replay({
  //       maskAllText: true,
  //       blockAllMedia: true,
  //     }),
  //   ],
  //   replaysSessionSampleRate: 0.1,
  //   replaysOnErrorSampleRate: 1.0,
  //   ignoreErrors: [
  //     'top.GEODATA',
  //     'chrome-extension://',
  //     'moz-extension://',
  //     'NetworkError',
  //     'Failed to fetch',
  //     'AbortError',
  //     'The user aborted a request',
  //   ],
  //   beforeSend(event: any) {
  //     if (event.request?.headers) {
  //       delete event.request.headers['Authorization'];
  //       delete event.request.headers['Cookie'];
  //     }
  //     if (event.request?.url) {
  //       try {
  //         const url = new URL(event.request.url);
  //         const sensitiveParams = ['token', 'key', 'password', 'secret'];
  //         for (const param of sensitiveParams) {
  //           if (url.searchParams.has(param)) {
  //             url.searchParams.set(param, '[REDACTED]');
  //           }
  //         }
  //         event.request.url = url.toString();
  //       } catch {
  //         // Invalid URL, skip
  //       }
  //     }
  //     return event;
  //   },
  // });
}

/**
 * Capture exception with context
 */
export function captureException(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    level?: SeverityLevel;
  }
) {
  if (!SENTRY_DSN) {
    console.error('Exception (Sentry disabled):', error, context);
    return;
  }

  // Sentry.withScope((scope: any) => {
  //   if (context?.tags) {
  //     Object.entries(context.tags).forEach(([key, value]) => {
  //       scope.setTag(key, value);
  //     });
  //   }
  //   if (context?.extra) {
  //     Object.entries(context.extra).forEach(([key, value]) => {
  //       scope.setExtra(key, value);
  //     });
  //   }
  //   if (context?.level) {
  //     scope.setLevel(context.level);
  //   }
  //   Sentry.captureException(error);
  // });
}

/**
 * Capture message (for logging)
 */
export function captureMessage(
  message: string,
  level: SeverityLevel = 'info'
) {
  if (!SENTRY_DSN) {
    console.log(`[${level.toUpperCase()}]`, message);
    return;
  }
  // Sentry.captureMessage(message, level);
}

/**
 * Set user context
 */
export function setUser(_user: { id: string; email?: string; username?: string } | null) {
  if (!SENTRY_DSN) return;
  // Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  _level: SeverityLevel = 'info'
) {
  if (!SENTRY_DSN) return;

  // Sentry.addBreadcrumb({
  //   message,
  //   data,
  //   level,
  //   timestamp: Date.now() / 1000,
  // });
}
