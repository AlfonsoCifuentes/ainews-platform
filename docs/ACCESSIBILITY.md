# ♿ Accessibility Audit & WCAG 2.1 Compliance Guide

## Overview

This document outlines accessibility requirements, audit procedures, and remediation strategies to achieve **WCAG 2.1 Level AA compliance** across the ThotNet Core platform.

---

## 🎯 Compliance Goals

- **WCAG 2.1 Level AA**: Minimum compliance target
- **Screen Reader Support**: NVDA, JAWS, VoiceOver compatibility
- **Keyboard Navigation**: 100% keyboard accessible
- **Color Contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Motion Preferences**: Respect `prefers-reduced-motion`
- **Focus Management**: Clear, visible focus indicators

---

## ✅ Accessibility Checklist

### 1. Perceivable

#### 1.1 Text Alternatives (A)
- [ ] All images have meaningful `alt` text
- [ ] Decorative images use `alt=""` or `role="presentation"`
- [ ] Icons have accessible labels (`aria-label` or sr-only text)
- [ ] Complex graphics have extended descriptions

#### 1.2 Time-based Media (A)
- [ ] Video content has captions
- [ ] Audio-only content has transcripts
- [ ] Media players have accessible controls

#### 1.3 Adaptable (A)
- [ ] Content structure uses semantic HTML
- [ ] Headings follow logical hierarchy (h1 → h2 → h3)
- [ ] Lists use `<ul>`, `<ol>`, `<dl>` appropriately
- [ ] Tables have `<th>` headers with proper scope
- [ ] Forms have associated labels

#### 1.4 Distinguishable (AA)
- [ ] Color contrast ≥4.5:1 for normal text
- [ ] Color contrast ≥3:1 for large text (18pt+)
- [ ] Color not sole indicator of meaning
- [ ] Text resizable up to 200% without loss of functionality
- [ ] No horizontal scrolling at 320px viewport width
- [ ] Focus indicators clearly visible
- [ ] `prefers-reduced-motion` respected

### 2. Operable

#### 2.1 Keyboard Accessible (A)
- [ ] All functionality available via keyboard
- [ ] No keyboard traps
- [ ] Logical tab order
- [ ] Skip navigation links present
- [ ] Keyboard shortcuts documented

#### 2.2 Enough Time (A)
- [ ] No time limits, or limits can be extended
- [ ] Auto-updating content can be paused
- [ ] Session timeouts have warnings

#### 2.3 Seizures and Physical Reactions (A)
- [ ] No flashing content >3 times per second
- [ ] Animations respect `prefers-reduced-motion`

#### 2.4 Navigable (AA)
- [ ] Multiple ways to find pages (nav, search, sitemap)
- [ ] Pages have descriptive titles
- [ ] Focus order is meaningful
- [ ] Link purpose clear from context
- [ ] Headings and labels descriptive
- [ ] Focus indicator visible

#### 2.5 Input Modalities (AA)
- [ ] Pointer gestures have alternatives
- [ ] Pointer cancellation supported
- [ ] Label in name matches visible text
- [ ] Motion actuation has alternatives

### 3. Understandable

#### 3.1 Readable (A)
- [ ] Language of page identified (`lang` attribute)
- [ ] Language changes marked up (`lang` on elements)
- [ ] Complex words/phrases explained

#### 3.2 Predictable (AA)
- [ ] Consistent navigation
- [ ] Consistent identification
- [ ] No unexpected context changes on focus
- [ ] No unexpected context changes on input

#### 3.3 Input Assistance (AA)
- [ ] Error messages identify errors clearly
- [ ] Labels and instructions provided
- [ ] Error suggestions offered
- [ ] Forms have validation with helpful messages
- [ ] Reversible, checked, or confirmed actions

### 4. Robust

#### 4.1 Compatible (A)
- [ ] Valid HTML (no parsing errors)
- [ ] Unique IDs
- [ ] Proper ARIA usage
- [ ] Status messages use appropriate ARIA roles

---

## 🛠️ Implementation Guidelines

### Semantic HTML Structure

```tsx
// ✅ Good - Semantic HTML
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><Link href="/">Home</Link></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <h1>Article Title</h1>
    <p>Content...</p>
  </article>
</main>

<footer>
  <p>© 2025 ThotNet Core</p>
</footer>

// ❌ Bad - Divs everywhere
<div className="header">
  <div className="nav">
    <div><a href="/">Home</a></div>
  </div>
</div>
```

### Skip Navigation Links

```tsx
// components/layout/Header.tsx
export function Header() {
  return (
    <>
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to main content
      </a>
      <header>
        {/* ... */}
      </header>
    </>
  );
}
```

### Focus Management

```tsx
// Custom focus styles in globals.css
@layer base {
  *:focus-visible {
    @apply outline-none ring-2 ring-primary ring-offset-2 ring-offset-background;
  }
  
  /* High contrast focus for links */
  a:focus-visible {
    @apply outline-2 outline-offset-4 outline-primary;
  }
}
```

### ARIA Labels for Icon Buttons

```tsx
// ✅ Good
<button aria-label="Close modal" onClick={onClose}>
  <X className="h-4 w-4" aria-hidden="true" />
</button>

// ✅ Good (alternative with sr-only text)
<button onClick={onClose}>
  <X className="h-4 w-4" aria-hidden="true" />
  <span className="sr-only">Close modal</span>
</button>

// ❌ Bad
<button onClick={onClose}>
  <X className="h-4 w-4" />
</button>
```

### Form Accessibility

```tsx
// ✅ Good - Proper labels and error handling
<form>
  <div>
    <label htmlFor="email" className="block text-sm font-medium">
      Email Address
    </label>
    <input
      id="email"
      type="email"
      aria-describedby="email-error"
      aria-invalid={!!errors.email}
      className="..."
    />
    {errors.email && (
      <p id="email-error" role="alert" className="text-sm text-destructive">
        {errors.email}
      </p>
    )}
  </div>
</form>

// ❌ Bad - No label association
<form>
  <span>Email</span>
  <input type="email" />
  {errors.email && <p>{errors.email}</p>}
</form>
```

### Motion Preferences

```tsx
// globals.css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

```tsx
// React hook for motion preferences
import { useReducedMotion } from 'framer-motion';

export function AnimatedComponent() {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
    >
      Content
    </motion.div>
  );
}
```

### Color Contrast

```tsx
// tailwind.config.ts - Ensure proper contrast ratios
const colors = {
  primary: {
    DEFAULT: 'hsl(221, 83%, 53%)', // #2563eb - 4.54:1 on white
    foreground: 'hsl(0, 0%, 100%)', // white - always passes
  },
  secondary: {
    DEFAULT: 'hsl(210, 40%, 96%)', // #f1f5f9
    foreground: 'hsl(222, 47%, 11%)', // #0f172a - 15.8:1
  },
  // ... rest of colors
};
```

### Screen Reader Only Content

```tsx
// Utility class in globals.css
@layer utilities {
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
  
  .not-sr-only {
    position: static;
    width: auto;
    height: auto;
    padding: 0;
    margin: 0;
    overflow: visible;
    clip: auto;
    white-space: normal;
  }
}
```

---

## 🧪 Testing Procedures

### Automated Testing

#### 1. axe DevTools
```bash
# Install browser extension
# Chrome: https://chrome.google.com/webstore (search "axe DevTools")
# Firefox: https://addons.mozilla.org/firefox/ (search "axe DevTools")

# Run audit on each page
# Fix all violations and warnings
```

#### 2. Lighthouse Accessibility Audit
```bash
npm run test:lighthouse

# Target: 100 Accessibility Score
```

#### 3. Pa11y CI (Automated)
```bash
# Install
npm install --save-dev pa11y-ci

# Run
npx pa11y-ci --sitemap https://thotnet-core.vercel.app/sitemap.xml
```

### Manual Testing

#### 1. Keyboard Navigation Test
1. Unplug/disable mouse
2. Navigate entire site using only:
   - `Tab` / `Shift+Tab` (focus movement)
   - `Enter` / `Space` (activation)
   - `Arrow keys` (menus, carousels)
   - `Esc` (close modals)
3. Verify:
   - All interactive elements reachable
   - Logical tab order
   - No keyboard traps
   - Skip links work
   - Focus always visible

#### 2. Screen Reader Testing

**NVDA (Windows - Free)**
```
1. Download: https://www.nvaccess.org/download/
2. Install and launch
3. Navigate site with:
   - H (headings)
   - K (links)
   - F (forms)
   - T (tables)
   - L (lists)
4. Verify all content announced correctly
```

**JAWS (Windows - Paid)**
```
1. Trial: https://www.freedomscientific.com/products/software/jaws/
2. Same navigation as NVDA
3. Test compatibility
```

**VoiceOver (macOS - Built-in)**
```
1. Enable: System Preferences > Accessibility > VoiceOver
2. Cmd+F5 to toggle
3. Navigate with VO keys
4. Test all interactive elements
```

#### 3. Visual Testing
- [ ] Test at 200% zoom - no horizontal scroll
- [ ] Test at 320px viewport width
- [ ] Test with high contrast mode
- [ ] Test with inverted colors
- [ ] Test focus indicators in all states

#### 4. Color Contrast Check
```bash
# Use browser extensions:
# - WAVE Evaluation Tool
# - Color Contrast Analyzer

# Or online tools:
# - https://webaim.org/resources/contrastchecker/
# - https://coolors.co/contrast-checker
```

---

## 🐛 Common Issues & Fixes

### Issue 1: Missing Alt Text
```tsx
// ❌ Problem
<Image src="/hero.jpg" width={800} height={600} />

// ✅ Solution
<Image 
  src="/hero.jpg" 
  alt="AI-powered news platform dashboard showing trending topics" 
  width={800} 
  height={600} 
/>

// ✅ For decorative images
<Image 
  src="/decoration.svg" 
  alt="" 
  role="presentation" 
  width={100} 
  height={100} 
/>
```

### Issue 2: Poor Focus Visibility
```tsx
// ❌ Problem
.button {
  outline: none;
}

// ✅ Solution
.button:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

### Issue 3: Non-Descriptive Link Text
```tsx
// ❌ Problem
<Link href="/article/123">Read more</Link>

// ✅ Solution
<Link href="/article/123">
  Read more about AI breakthroughs in 2025
</Link>

// ✅ Alternative with sr-only
<Link href="/article/123">
  Read more
  <span className="sr-only"> about AI breakthroughs in 2025</span>
</Link>
```

### Issue 4: Animations for Everyone
```tsx
// ❌ Problem
<motion.div animate={{ x: [0, 100, 0] }} transition={{ repeat: Infinity }}>
  Content
</motion.div>

// ✅ Solution
const shouldReduceMotion = useReducedMotion();

<motion.div 
  animate={shouldReduceMotion ? {} : { x: [0, 100, 0] }}
  transition={shouldReduceMotion ? {} : { repeat: Infinity }}
>
  Content
</motion.div>
```

### Issue 5: Form Without Labels
```tsx
// ❌ Problem
<input type="text" placeholder="Search..." />

// ✅ Solution
<label htmlFor="search" className="sr-only">Search articles</label>
<input 
  id="search" 
  type="text" 
  placeholder="Search..." 
  aria-label="Search articles"
/>
```

---

## 📚 Resources

### Standards & Guidelines
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Pa11y](https://pa11y.org/)

### Screen Readers
- [NVDA (Free)](https://www.nvaccess.org/)
- [JAWS](https://www.freedomscientific.com/products/software/jaws/)
- [VoiceOver](https://www.apple.com/accessibility/voiceover/)

### Learning
- [WebAIM](https://webaim.org/)
- [Inclusive Components](https://inclusive-components.design/)
- [A11ycasts (YouTube)](https://www.youtube.com/playlist?list=PLNYkxOF6rcICWx0C9LVWWVqvHlYJyqw7g)

---

## 🎯 Accessibility Audit Workflow

### Phase 1: Automated Scan (30 min)
1. Run axe DevTools on all major pages
2. Run Lighthouse accessibility audit
3. Document all violations
4. Prioritize: Critical > Serious > Moderate > Minor

### Phase 2: Manual Review (2-3 hours)
1. Keyboard navigation test (30 min)
2. Screen reader test with NVDA (1 hour)
3. Visual testing (zoom, contrast, etc.) (30 min)
4. Color contrast verification (30 min)

### Phase 3: Remediation (Variable)
1. Fix critical issues first
2. Address serious/moderate issues
3. Refactor patterns to prevent recurrence
4. Document fixes

### Phase 4: Regression Testing (1 hour)
1. Re-run automated scans
2. Verify fixes didn't break other areas
3. Test on real devices (mobile, tablet)
4. Get user feedback (if possible, from users with disabilities)

---

## ✅ Acceptance Criteria

Before marking accessibility complete:
- [ ] Zero critical violations in axe DevTools
- [ ] Lighthouse Accessibility score = 100
- [ ] All pages navigable by keyboard
- [ ] NVDA/JAWS compatibility verified
- [ ] Color contrast ratios meet WCAG AA
- [ ] `prefers-reduced-motion` respected
- [ ] Focus indicators always visible
- [ ] Skip links functional
- [ ] Forms have proper labels and error messages
- [ ] Documentation complete (this file)

---

**Last Updated**: 2025-10-22  
**Status**: 📋 Ready for Audit  
**Target Completion**: Sprint 6 (Week 11-12)  
**Owner**: Development Team  
**WCAG Target**: Level AA
