# E2E Test Suite - AINews Platform

## 📋 Overview

Complete end-to-end test suite for the AINews platform using Playwright. Tests cover critical user flows, animations, navigation, internationalization, performance, and accessibility.

## 🎯 Test Coverage

### 1. Critical Paths (`critical-paths.spec.ts`)

**Homepage Tests:**
- ✅ Hero section loads and displays correctly
- ✅ Scroll animations trigger properly
- ✅ Navigation to news page works

**News Page Tests:**
- ✅ Articles display correctly
- ✅ Locale switching works
- ✅ Empty states handled gracefully

**Courses Page Tests:**
- ✅ Page loads with lazy-loaded components
- ✅ Course catalog displays
- ✅ CourseGenerator lazy loading works

**Performance Tests:**
- ✅ Page load time < 3 seconds
- ✅ Heavy components lazy load after initial render

**Accessibility Tests:**
- ✅ Keyboard navigation functional
- ✅ Proper heading hierarchy (h1 exists)

---

### 2. Animations (`animations.spec.ts`)

**Scroll Animations:**
- ✅ ScrollReveal triggers on scroll
- ✅ Respects `prefers-reduced-motion`

**Interactive Animations:**
- ✅ Hover effects on cards
- ✅ Button click animations (ripple effects)

**Page Transitions:**
- ✅ Smooth navigation between pages
- ✅ Scroll position maintenance on back navigation

**Loading States:**
- ✅ Loading skeletons display for lazy components
- ✅ Graceful handling of slow network (3G simulation)

**Three.js Components:**
- ✅ FloatingObjects lazy load without blocking
- ✅ GraphVisualizer lazy load in KG pages

**Animation Performance:**
- ✅ No frame drops during rapid scrolling
- ✅ Rapid interactions don't break UI

---

### 3. Navigation & i18n (`navigation.spec.ts`)

**Internationalization:**
- ✅ English locale as default
- ✅ Navigation between EN/ES locales
- ✅ Route persistence when switching locales
- ✅ Deep links with locale preserved

**Navigation:**
- ✅ All main routes accessible (/news, /courses, /kg, /trending, /dashboard, /analytics)
- ✅ Header navigation functional
- ✅ Footer navigation present

**SEO Meta Tags:**
- ✅ Proper `<title>` tags
- ✅ Meta descriptions present
- ✅ Open Graph tags configured
- ✅ Alternate language links (hreflang)

**Error Handling:**
- ✅ 404 pages handled gracefully
- ✅ Invalid locale redirects correctly

**Search:**
- ✅ Search functionality exists and is accessible

**Mobile Navigation:**
- ✅ Mobile menu displays on small screens (375px viewport)
- ✅ Scrolling works on mobile viewport

---

### 4. Knowledge Graph Explorer (`kg-explorer.spec.ts`)

- ✅ KG Explorer page lists entities
- ✅ Clicking entity navigates to detail page
- ✅ Entity detail page displays correctly

---

## 🚀 Running Tests

### Run All Tests
```bash
npm run test:e2e
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/critical-paths.spec.ts
```

### Run Single Test
```bash
npx playwright test tests/e2e/navigation.spec.ts --grep "should load English locale by default"
```

### Run with UI Mode (Interactive)
```bash
npm run test:e2e:ui
```

### Run Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project="Mobile Chrome"
```

### Show Test Report
```bash
npx playwright show-report
```

---

## 📊 Test Statistics

- **Total Test Files:** 4
- **Total Test Cases:** 41+
- **Browsers Tested:** 
  - Desktop Chrome (Chromium)
  - Mobile Chrome (Pixel 5 emulation)
- **Average Test Time:** ~1-2 seconds per test
- **Total Suite Time:** ~2-3 minutes (with dev server startup)

---

## 🔧 Configuration

**Playwright Config:** `playwright.config.ts`

Key settings:
- **Test Directory:** `./tests/e2e`
- **Base URL:** `http://localhost:3000` (auto-starts dev server)
- **Parallel Execution:** Enabled (except on CI)
- **Retries:** 2 on CI, 0 locally
- **Trace Collection:** On first retry
- **Screenshots:** Only on failure

---

## 📝 Test Patterns

### Page Load Pattern
```typescript
await page.goto('/en/news');
await expect(page.locator('h1')).toBeVisible();
```

### Locale Switching Pattern
```typescript
await page.goto('/en/news');
await page.goto('/es/news'); // Switch locale
await expect(page).toHaveURL(/\/es\/news/);
```

### Animation Testing Pattern
```typescript
await page.evaluate(() => window.scrollBy(0, 500));
await page.waitForTimeout(300); // Wait for animation
await expect(element).toBeVisible();
```

### Mobile Viewport Pattern
```typescript
await page.setViewportSize({ width: 375, height: 667 });
await page.goto('/en');
```

---

## 🐛 Known Test Behaviors

1. **Lazy Loading Tests:**
   - Tests verify components load without errors
   - Loading states may be too fast to capture on fast connections

2. **Animation Tests:**
   - Some animations may complete before test assertions
   - Tests focus on non-blocking behavior rather than exact timing

3. **Mobile Tests:**
   - Mobile menu may not always be visible (depends on design)
   - Tests gracefully handle conditional elements

4. **Performance Tests:**
   - Load time thresholds (< 3s) are generous
   - Actual performance depends on local machine

---

## 🎯 Next Steps

### Planned Test Additions:
1. **Form Submission Tests:**
   - Course generator form
   - Search form
   - Auth forms (login/register)

2. **API Integration Tests:**
   - News API responses
   - Course generation API
   - Knowledge Graph API

3. **Visual Regression Tests:**
   - Screenshot comparison for critical pages
   - Component visual snapshots

4. **Advanced Accessibility Tests:**
   - Screen reader compatibility (NVDA/JAWS)
   - Color contrast validation
   - ARIA attribute validation

---

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Selectors Guide](https://playwright.dev/docs/selectors)
- [Debugging Tests](https://playwright.dev/docs/debug)

---

**Last Updated:** January 2025  
**Test Framework:** Playwright v1.49+  
**Node Version:** 20.x
