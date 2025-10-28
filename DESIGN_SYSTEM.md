# Design System - AINews Platform

## Color Palette (Black & Blue Theme)

### Primary Colors
```css
--background: 222 47% 4%;           /* Deep black-blue */
--foreground: 210 40% 96%;          /* Light blue-white */
--primary: 217 91% 60%;             /* Vibrant blue */
--primary-foreground: 222 47% 4%;  /* Dark text on blue */
```

### Secondary Colors
```css
--secondary: 217 30% 15%;           /* Dark blue-gray */
--secondary-foreground: 210 40% 96%;
--accent: 210 100% 50%;             /* Bright electric blue */
--accent-foreground: 222 47% 4%;
```

### Neutrals
```css
--muted: 217 20% 18%;               /* Muted blue-gray */
--muted-foreground: 215 20% 65%;    /* Light gray-blue */
--border: 217 25% 20%;              /* Subtle blue border */
--card: 222 47% 6%;                 /* Card background */
```

## Background Gradients

```css
background-image:
  radial-gradient(circle at 15% 20%, hsla(217, 91%, 60%, 0.15), transparent 55%),
  radial-gradient(circle at 85% 15%, hsla(210, 100%, 50%, 0.12), transparent 40%),
  radial-gradient(circle at 50% 90%, hsla(217, 91%, 60%, 0.10), transparent 45%);
background-color: hsl(222 47% 4%);
```

## Typography

- **Headlines**: Bold, 5xl on hero images with drop-shadow
- **Body**: Leading-relaxed, foreground/90 opacity
- **Links**: Primary color, no underline (hover: underline)
- **Code**: Muted background, rounded, px-2 py-1

## Components

### Buttons
- **Primary**: bg-primary text-primary-foreground hover:bg-primary/90
- **Secondary**: bg-secondary text-secondary-foreground
- **Ghost**: hover:bg-accent/10

### Cards
- **Border**: border-border
- **Background**: bg-card
- **Shadow**: shadow-lg on hover
- **Rounded**: rounded-3xl (large radius)

### Modal
- **Overlay**: bg-black/80 backdrop-blur-md
- **Container**: bg-background border-border rounded-3xl
- **Scrollbar**: Blue-themed (.custom-scrollbar)

## Design Principles

1. **Mobile First** - Design for mobile, scale up
2. **Dark Mode Native** - Black & blue palette
3. **Glassmorphism** - Subtle blur and transparency
4. **Smooth Animations** - 300ms ease-out transitions
5. **Micro-interactions** - Every element responds to hover
6. **3D Depth** - Shadows and perspective on interactions

## Accessibility

- **Contrast**: Minimum WCAG AA (4.5:1 for text)
- **Focus**: Visible ring in primary color
- **Motion**: Respect prefers-reduced-motion
- **Keyboard**: Full tab navigation support
