/**
 * Performance Optimization Configuration
 * 
 * This file contains lazy loading configurations for heavy components
 * to reduce initial bundle size and improve Time to Interactive (TTI).
 */

import dynamic from 'next/dynamic';

// ========================================
// THREE.JS COMPONENTS (Heavy - ~500KB)
// ========================================

export const BackgroundGeometry = dynamic(
  () => import('@/components/shared/BackgroundGeometry').then(mod => ({ default: mod.BackgroundGeometry })),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5" />
    ),
  }
);

export const GraphVisualizer = dynamic(
  () => import('@/components/kg/GraphVisualizer').then(mod => ({ default: mod.GraphVisualizer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-3xl bg-muted">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    ),
  }
);

// ========================================
// COURSE COMPONENTS (Medium - ~200KB)
// ========================================

export const CourseGenerator = dynamic(
  () => import('@/components/courses/CourseGenerator').then(mod => ({ default: mod.CourseGenerator })),
  {
    loading: () => (
      <div className="glass rounded-3xl border border-white/10 p-8">
        <div className="h-64 animate-pulse space-y-4">
          <div className="h-8 w-3/4 rounded bg-muted"></div>
          <div className="h-4 w-1/2 rounded bg-muted"></div>
          <div className="h-32 rounded bg-muted"></div>
        </div>
      </div>
    ),
  }
);

// ========================================
// ANALYTICS COMPONENTS (Medium - ~150KB)
// ========================================

export const AnalyticsDashboard = dynamic(
  () => import('@/components/analytics/AnalyticsDashboard'),
  {
    loading: () => (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="glass h-32 animate-pulse rounded-3xl border border-white/10 p-6">
            <div className="h-4 w-1/2 rounded bg-muted"></div>
            <div className="mt-4 h-8 w-3/4 rounded bg-muted"></div>
          </div>
        ))}
      </div>
    ),
  }
);

// ========================================
// INTERACTIVE COMPONENTS (Light but on-demand)
// ========================================

export const AuthModal = dynamic(
  () => import('@/components/auth/AuthModal').then(mod => ({ default: mod.AuthModal })),
  {
    ssr: false,
  }
);

export const GlobalSearch = dynamic(
  () => import('@/components/shared/GlobalSearch').then(mod => ({ default: mod.GlobalSearch })),
  {
    ssr: false,
  }
);

// ========================================
// USAGE NOTES
// ========================================

/**
 * USAGE EXAMPLES:
 * 
 * Instead of:
 *   import { CourseGenerator } from '@/components/courses/CourseGenerator';
 * 
 * Use:
 *   import { CourseGenerator } from '@/lib/lazy-components';
 * 
 * This ensures the component is code-split and only loaded when needed.
 * 
 * BUNDLE SIZE TARGETS:
 * - Initial JS Bundle: <150KB (compressed)
 * - Route-specific chunks: <100KB each
 * - Lazy-loaded chunks: Loaded on interaction
 * 
 * MONITORING:
 * - Run `npm run analyze` to see bundle composition
 * - Check Vercel Analytics for real-world performance
 * - Monitor Core Web Vitals in production
 */
