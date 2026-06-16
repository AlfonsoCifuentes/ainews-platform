# Design System · ThotNet Core

## Color Palette · Black / Warm Amber / Electric Blue

### Core Tokens (HSL)
```css
--background: 235 64% 2%;            /* #020309 – nearly black */
--foreground: 210 20% 98%;           /* #f5f7fb – off white */
--muted: 220 15% 18%;                /* Charcoal for body blocks */
--muted-foreground: 215 12% 72%;     /* Soft gray text */
--border: 220 18% 22%;               /* Graphite blue border */
--card: 230 40% 6%;                  /* Deep slate for glass panels */
```

### Accent Bands
```css
--accent-warm: 35 92% 60%;           /* #F5A623 / #FFB347 – warm amber */
--accent-warm-foreground: 235 64% 2%;
--accent-blue: 217 91% 60%;          /* #3B82F6 – electric blue */
--accent-blue-foreground: 235 64% 2%;
--accent-ice: 198 92% 72%;           /* #38BDF8 glow details */
```

### Functional Surfaces
```css
--surface-glass: hsla(220, 35%, 12%, 0.65);
--surface-contrast: 0 0% 0% / 0.75;   /* Overlays */
--success: 166 72% 42%;
--danger: 7 86% 54%;
```

## Background Gradients

```css
background-image:
  radial-gradient(circle at 15% 20%, hsla(217, 91%, 60%, 0.18), transparent 55%),
  radial-gradient(circle at 82% 12%, hsla(35, 92%, 60%, 0.16), transparent 40%),
  radial-gradient(circle at 50% 88%, hsla(198, 92%, 72%, 0.12), transparent 45%),
  radial-gradient(120% 120% at 80% 0%, hsla(222, 60%, 8%, 0.9), transparent 65%);
background-color: hsl(235 64% 2%);
background-blend-mode: screen, normal;
filter: contrast(105%) saturate(110%);
```

## Typography

- **Headlines**: Brutalist sans, tracking-tight, 5xl+ on hero; prefer `font-black` with slight skew.
- **Body**: `text-foreground/90`, `leading-relaxed`, max-width 68ch for long-form reading.
- **Labels / Stats**: Uppercase `text-xs` with `tracking-[0.2em]` using `accent-warm` underline.
- **Links**: Default `text-accent-blue`; on hover add `underline underline-offset-4` + glow.
- **Code / Data Pills**: `bg-surface-glass` + `text-accent-ice` + `font-mono`.

## Components

### Buttons
- **Primary**: `bg-[hsl(var(--accent-warm))] text-[hsl(var(--accent-warm-foreground))] shadow-[0_0_30px_rgba(245,166,35,0.4)] hover:translate-y-[-1px]`
- **Secondary**: `bg-surface-glass border border-[hsl(var(--accent-blue))/40] text-foreground hover:border-[hsl(var(--accent-blue))]`
- **Ghost**: `text-foreground hover:bg-white/5 hover:text-[hsl(var(--accent-blue))]`

### Cards
- **Border**: `border border-[hsl(var(--border))]` by default, upgrade to `border-[hsl(var(--accent-blue))/60]` on hover.
- **Background**: `bg-card/80 backdrop-blur-2xl` for glassmorphism.
- **Shadow**: combine `shadow-[0_20px_60px_rgba(0,0,0,0.45)]` with colored glows.
- **Rounded**: `rounded-[32px]` hero cards, `rounded-2xl` for lists.
- **Motion**: default `transition-all duration-300 ease-out` + `perspective` tilt on pointer.

### Modal
- **Overlay**: bg-black/80 backdrop-blur-md
- **Container**: bg-background border-border rounded-3xl
- **Scrollbar**: Blue-themed (.custom-scrollbar)

### Book Module Skin
- **Paper**: `bg-[hsl(225,16%,12%)]` for spreads, `border-[hsl(var(--accent-blue))/20]`.
- **Gutter**: accent blue hairline, gradient fade.
- **Controls**: warm amber toggles for page nav, electric blue for search.

## Design Principles

1. **Mobile First** – Column-stacked layouts until `lg`, then asymmetric splits.
2. **Black Canvas** – Backgrounds stay near #020309 with soft blue fog, zero purple usage.
3. **Warm Highlights** – Amber accents emphasize CTAs, tags, stat bars.
4. **Electric Details** – Blue glows for outlines, data chips, orb trails.
5. **Glass & Depth** – Transparent cards, layered shadows, parallax micro-motions.
6. **Functional Motion** – Every animation clarifies hierarchy; respect `prefers-reduced-motion`.

## Accessibility

- **Contrast**: Minimum WCAG AA (4.5:1 for text)
- **Focus**: Visible ring in primary color
- **Motion**: Respect prefers-reduced-motion
- **Keyboard**: Full tab navigation support

## Motion System · December 2025

- **Kinetic Hero Variants**: `fadeUp` (delay 0.08s), `slideInRight`, `scaleGlow` for orb container.
- **Hover Tilt**: `rotateX`/`rotateY` max 6deg desktop, 0 on mobile, fallback shadow pulse for reduced motion.
- **Rails**: `stagger` children at 0.06s for TodayDigest + AIPlayground strips.
- **Orbiting Topics**: CSS `offset-path` animations for chips with `animation-play-state` toggled off when prefers reduced motion.
- **Parallax**: Use CSS `transform: translate3d` with `will-change` limited to hero + orb to protect performance.

## Reference Mapping

- **creativewebmanual.com** → text motion cadence + glass hero panels.
- **chroniclehq.com** → narrative section order and sticky storytelling.
- **yinger.dev** → singular 3D orb aesthetic (recolored to blue/amber).
- **phlntn.com** → CourseGalaxyNavigator interaction pattern.
- **mues.ai** → cleanliness for digest + agent strips.
- **godly.video sample** → hover tilt depth for hero + trending topics.
