# 🚀 Performance Optimization Guide

## Overview

This document outlines the performance optimizations implemented and recommended practices for maintaining high performance scores (>90 mobile, >95 desktop).

---

## ✅ Implemented Optimizations

### 1. Bundle Analysis Configuration

**File**: `next.config.js`

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
```

**Usage**: 
```bash
npm run analyze
```

This generates visual bundle composition reports to identify heavy dependencies.

### 2. Lazy Loading Strategy

**File**: `lib/lazy-components.tsx`

Heavy components are dynamically imported to reduce initial bundle size:

- **Three.js components** (~500KB): `AnimatedBackground`, `ZoomableGraph`
- **Course components** (~200KB): `CourseGenerator`, `AITutorChat`
- **Analytics components** (~150KB): `AnalyticsDashboard`
- **Editor components** (~300KB): `RichTextEditor`, `CodeEditor`

**Usage**:
```tsx
// Instead of direct import
import { CourseGenerator } from '@/components/courses/CourseGenerator';

// Use lazy version
import { CourseGenerator } from '@/lib/lazy-components';
```

### 3. Image Optimization

**Configured in**: `next.config.js`

```javascript
images: {
  formats: ['image/avif', 'image/webp'],
  remotePatterns: [{ protocol: 'https', hostname: '**' }],
},
```

**Best practices**:
- Use Next.js `<Image />` component with `priority` for above-the-fold images
- Provide `blurDataURL` for placeholder blur effect
- Use appropriate sizes: `width`, `height`, `sizes` props

### 4. Compiler Optimizations

```javascript
compiler: {
  removeConsole: process.env.NODE_ENV === 'production',
},
optimizeFonts: true,
swcMinify: true,
```

---

## 📊 Bundle Size Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Initial JS Bundle (gzip) | <150KB | TBD | 🔄 |
| First Load JS | <200KB | TBD | 🔄 |
| Route-specific chunks | <100KB each | TBD | 🔄 |
| CSS Bundle | <50KB | TBD | 🔄 |

**Check with**: `npm run analyze`

---

## ⚡ Core Web Vitals Targets

### Largest Contentful Paint (LCP)
- **Target**: <2.5s
- **Optimizations**:
  - Lazy load below-the-fold components
  - Use `priority` on hero images
  - Preload critical fonts
  - Optimize server response time

### First Input Delay (FID) / Interaction to Next Paint (INP)
- **Target**: <100ms / <200ms
- **Optimizations**:
  - Code split heavy JavaScript
  - Use Web Workers for expensive computations
  - Debounce/throttle event handlers
  - Avoid long tasks (>50ms)

### Cumulative Layout Shift (CLS)
- **Target**: <0.1
- **Optimizations**:
  - Always specify image dimensions
  - Reserve space for ads/embeds
  - Avoid inserting content above existing
  - Use CSS `aspect-ratio`

---

## 🎯 Route-Specific Optimizations

### Homepage (`/`)
- [x] Hero section with AnimatedBackground (lazy loaded)
- [x] TextAnimations on scroll (Intersection Observer)
- [x] Defer non-critical components
- [ ] Preload news feed data (ISR)

### News Page (`/news`)
- [x] Infinite scroll with virtual scrolling
- [x] Image lazy loading with blur placeholders
- [x] Pagination for SEO
- [ ] Prefetch next page on hover

### Courses Page (`/courses`)
- [x] CourseGenerator lazy loaded
- [x] CourseCatalog with animated cards
- [ ] Skeleton loaders for better perceived performance
- [ ] Cache course catalog (ISR 1 hour)

### Knowledge Graph (`/kg`)
- [x] ZoomableGraph lazy loaded (Three.js)
- [x] EntityGrid with staggered animations
- [ ] WebGL optimization for large graphs
- [ ] Canvas fallback for low-end devices

### Dashboard (`/dashboard`)
- [x] Auth-gated (no SEO concerns)
- [x] Lazy load heavy charts/visualizations
- [ ] Cache user data aggressively
- [ ] Real-time updates via WebSocket (future)

---

## 🔧 Recommended Tools

### Development
- **Bundle Analyzer**: `npm run analyze`
- **Lighthouse CI**: GitHub Actions integration (TODO)
- **React DevTools Profiler**: Identify slow renders
- **Chrome Performance Tab**: Record and analyze runtime performance

### Testing
- **Lighthouse**: Manual audits (`npm run test:lighthouse`)
- **WebPageTest**: Real-world performance from multiple locations
- **Playwright**: E2E tests with performance assertions
- **Vercel Analytics**: Real User Monitoring (RUM) in production

### Monitoring
- **Vercel Speed Insights**: Built-in Core Web Vitals tracking
- **Sentry Performance**: Error tracking + performance monitoring
- **Google Search Console**: Core Web Vitals report
- **Grafana/Prometheus**: Custom dashboards (future)

---

## 📝 Performance Checklist

### Pre-Deployment
- [ ] Run `npm run analyze` and review bundle composition
- [ ] Run `npm run test:lighthouse` on production build
- [ ] Test on real mobile devices (iOS/Android)
- [ ] Verify all images have `width`/`height`
- [ ] Check for console errors/warnings
- [ ] Validate Lighthouse score >90 mobile, >95 desktop

### Post-Deployment
- [ ] Monitor Vercel Analytics for 24h
- [ ] Check Core Web Vitals in Search Console
- [ ] Review Error Rate in Sentry
- [ ] Analyze user feedback for slowness complaints
- [ ] Compare performance vs. previous deploy

---

## 🚨 Common Performance Pitfalls

### 1. **Unoptimized Images**
```tsx
// ❌ Bad
<img src="/hero.jpg" />

// ✅ Good
<Image 
  src="/hero.jpg" 
  alt="Hero" 
  width={1920} 
  height={1080} 
  priority 
  placeholder="blur"
  blurDataURL={blurDataUrl}
/>
```

### 2. **Importing Heavy Libraries Directly**
```tsx
// ❌ Bad
import { CourseGenerator } from '@/components/courses/CourseGenerator';

// ✅ Good
import { CourseGenerator } from '@/lib/lazy-components';
```

### 3. **Blocking Third-Party Scripts**
```tsx
// ❌ Bad
<script src="https://cdn.example.com/analytics.js"></script>

// ✅ Good
<Script 
  src="https://cdn.example.com/analytics.js" 
  strategy="lazyOnload" 
/>
```

### 4. **No Loading States**
```tsx
// ❌ Bad
const Component = dynamic(() => import('./Heavy'));

// ✅ Good
const Component = dynamic(
  () => import('./Heavy'),
  { loading: () => <Skeleton /> }
);
```

### 5. **Inefficient Re-renders**
```tsx
// ❌ Bad (inline objects cause re-renders)
<Component style={{ color: 'red' }} />

// ✅ Good
const styles = { color: 'red' };
<Component style={styles} />

// ✅ Better (use memo for expensive components)
const MemoizedComponent = memo(Component);
```

---

## 📚 Resources

### Documentation
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Web.dev Performance](https://web.dev/performance/)
- [Core Web Vitals](https://web.dev/vitals/)
- [MDN Performance](https://developer.mozilla.org/en-US/docs/Web/Performance)

### Tools
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Web Vitals Library](https://github.com/GoogleChrome/web-vitals)
- [Webpack Bundle Analyzer](https://www.npmjs.com/package/webpack-bundle-analyzer)

### Learning
- [Web Performance Fundamentals](https://frontendmasters.com/courses/web-performance/)
- [High Performance Web Sites (Book)](https://www.oreilly.com/library/view/high-performance-web/9780596529307/)

---

## 🎯 Next Steps

1. **Run initial bundle analysis**: `npm run analyze`
2. **Implement lazy loading**: Apply to remaining heavy components
3. **Add loading skeletons**: Improve perceived performance
4. **Set up Playwright tests**: Automate performance testing
5. **Configure Lighthouse CI**: Automated audits on PR
6. **Monitor production**: Set up alerts for performance regressions

---

**Last Updated**: 2025-10-22  
**Status**: 🟡 In Progress  
**Target Completion**: Sprint 6 (Week 11-12)
