# Bundle Analysis Report

## Current Status (After Optimizations)

### Route Sizes

| Route | Size | First Load JS | Status |
|-------|------|---------------|--------|
| / (home) | 52.6 kB | 213 kB | ⚠️ Large |
| /courses | 1.32 kB | **446 kB** | 🔴 CRITICAL |
| /kg/[id] | 253 B | **441 kB** | 🔴 CRITICAL |
| /analytics | 3.34 kB | 146 kB | ⚠️ OK |
| /dashboard | 3.38 kB | 151 kB | ⚠️ OK |
| /trending | 5.67 kB | 148 kB | ⚠️ OK |
| /kg | 6.59 kB | 149 kB | ⚠️ OK |
| /search | 3.9 kB | 147 kB | ⚠️ OK |
| /news | 1.66 kB | 98.6 kB | ✅ Good |

### Shared Bundle
- **Total**: 87.4 kB
- chunks/117: 31.6 kB
- chunks/fd9d1056: 53.6 kB
- Other: 2.12 kB

## Issues Identified

### 🔴 Critical: Courses Page (446 KB)
- CourseGenerator import is NOT being lazy-loaded properly
- Likely bundling Three.js or other heavy dependencies
- **Action Needed**: Verify dynamic import is working

### 🔴 Critical: KG Detail Page (441 KB)
- GraphVisualizer import is NOT being lazy-loaded properly
- Three.js getting bundled into route
- **Action Needed**: Verify dynamic import is working

## Optimization Actions

### Completed ✅
1. Fixed MALFORMED_ARGUMENT SSG error
2. Separated auth client/server code
3. Removed deprecated @tailwindcss/line-clamp
4. Created lazy-components.tsx with dynamic imports
5. Updated imports in courses page and kg/[id] page

### In Progress 🔄
1. Verify dynamic imports are actually working
2. Check if Three.js is being code-split correctly
3. Analyze bundle-analyzer HTML reports

### Next Steps 📋
1. Open `.next/analyze/client.html` to see what's in the bundles
2. Ensure `next/dynamic` is working with `ssr: false`
3. May need to restructure imports or use different lazy loading strategy
4. Consider moving CourseGenerator to a separate route
5. Add route-level code splitting hints

## Target Metrics

### Bundle Size Targets
- ❌ Initial JS Bundle: <150KB (current: varied)
- ❌ Route-specific: <100KB each (courses: 446KB, kg: 441KB)
- ✅ Shared bundle: 87.4 KB (good)

### Performance Targets
- LCP: <2.5s
- FID: <100ms
- CLS: <0.1
- Lighthouse Mobile: >90
- Lighthouse Desktop: >95

## Commands

```powershell
# View detailed bundle composition
start .\.next\analyze\client.html

# Re-run analysis
npm run bundle-analyze

# Run Lighthouse audit
npm run dev  # Terminal 1
$env:LIGHTHOUSE_URL='http://localhost:3000'; npm run test:lighthouse  # Terminal 2
```
