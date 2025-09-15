# Squircle Design System

The Squircle component system provides a modern alternative to traditional border-radius by using mathematically precise superellipse shapes that create more organic, visually appealing rounded corners.

## Overview

Squircles (superellipses) offer a more natural, organic feel compared to standard CSS border-radius. They provide smoother corner transitions that are especially effective for:

- Image thumbnails and avatars
- Cards and panels
- Buttons and interactive elements
- Modal containers and overlays

## Components

### `<Squircle>` Component

A React wrapper component that applies squircle masking to its children.

```tsx
import { Squircle } from '@/shared/ui/squircle';

// Basic usage
<Squircle>
  <img src="avatar.jpg" alt="User avatar" />
</Squircle>

// With custom radius and smoothing
<Squircle radius={30} smoothing={0.8}>
  <div className="card-content">...</div>
</Squircle>

// Custom element type
<Squircle as="button" radius={16} className="custom-button">
  Click me
</Squircle>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `as` | `keyof JSX.IntrinsicElements \| React.ComponentType` | `'div'` | Element type or component to render |
| `radius` | `number` | `20` | Corner radius in pixels |
| `smoothing` | `number` | `0.6` | Smoothing factor (0.0 = sharp, 1.0 = very smooth) |
| `className` | `string` | - | Additional CSS class name |
| `style` | `React.CSSProperties` | - | Additional inline styles |
| `children` | `React.ReactNode` | - | Child elements to render inside the squircle |

### CSS Utility Classes

For simple cases where you don't need the full React component, use CSS classes:

```html
<!-- Basic squircle -->
<div class="squircle">Content</div>

<!-- Custom radius -->
<div class="squircle squircle-lg">Large squircle</div>

<!-- Custom radius via CSS variable -->
<div class="squircle" style="--shape-radius: 25px;">Custom radius</div>
```

#### Available Classes

- `.squircle` - Basic squircle with default 20px radius
- `.squircle-sm` - Small radius (12px)
- `.squircle-md` - Medium radius (16px)
- `.squircle-lg` - Large radius (20px) - default
- `.squircle-xl` - Extra large radius (24px)
- `.squircle-2xl` - 2X large radius (32px)
- `.squircle-sharp` - Sharp smoothing (0.3)
- `.squircle-smooth` - Smooth corners (0.8)

## CSS Variables

The system is fully themeable via CSS custom properties:

```css
:root {
  --shape-radius: 20px;        /* Default radius */
  --shape-smoothing: 0.6;      /* Default smoothing factor */
}

/* Override per component */
.custom-squircle {
  --shape-radius: 30px;
  --shape-smoothing: 0.8;
}
```

## Implementation Details

### Browser Support

The squircle system gracefully degrades across browser capabilities:

1. **Modern browsers** with CSS mask support: Full squircle rendering
2. **Older browsers** without mask support: Falls back to standard border-radius
3. **Users with reduced transparency preference**: Automatically falls back to border-radius

### Performance

- SVG paths are cached per dimension/radius/smoothing combination
- ResizeObserver efficiently tracks element size changes
- GPU-accelerated rendering via CSS masks when supported
- Minimal runtime overhead for fallback scenarios

### SSR Safety

The component is fully server-side rendering safe:
- No window-dependent code in initial render
- Feature detection occurs only on client-side
- Graceful degradation when ResizeObserver is unavailable

## Migration Guide

### From border-radius to Squircle

#### 1. Replace inline styles

**Before:**
```tsx
<div style={{ borderRadius: '20px' }}>Content</div>
```

**After:**
```tsx
<Squircle radius={20}>
  <div>Content</div>
</Squircle>
```

#### 2. Replace CSS classes

**Before:**
```css
.card {
  border-radius: 20px;
}
```

**After:**
```css
.card {
  /* Remove border-radius */
}
```

```tsx
<div className="card squircle">Content</div>
```

#### 3. Complex components

For interactive elements or components with complex positioning:

```tsx
// Wrap the entire component
<Squircle radius={20}>
  <Button onClick={handleClick}>
    <Icon />
    <span>Button Text</span>
  </Button>
</Squircle>
```

### Automated Migration

Use the provided codemod to automatically migrate common patterns:

```bash
# Dry run to preview changes
npx tsx scripts/codemods/rounded20-to-squircle.ts --dry-run

# Apply changes
npx tsx scripts/codemods/rounded20-to-squircle.ts --apply
```

## Best Practices

### Do's ✅

- Use squircles for visual containers (cards, thumbnails, panels)
- Apply consistent radius values across your design system
- Leverage CSS variables for themeable designs
- Use the React component for dynamic or complex layouts
- Use CSS classes for static content and better performance

### Don'ts ❌

- Don't apply squircles to elements that already have complex clipping (videos, canvases)
- Don't use extremely high smoothing values (> 0.9) as they may look unnatural
- Don't apply squircles to text inputs or form controls without careful testing
- Don't mix squircles with traditional border-radius in the same design context

### Recommended Values

| Use Case | Radius | Smoothing | Notes |
|----------|---------|-----------|-------|
| Small UI elements | 12-16px | 0.5-0.7 | Buttons, badges, small cards |
| Medium containers | 20-24px | 0.6-0.8 | Cards, modals, panels |
| Large surfaces | 28-32px | 0.7-0.9 | Hero sections, full-screen overlays |
| Thumbnails/Avatars | 16-20px | 0.6-0.8 | Profile pictures, image previews |

## Troubleshooting

### Squircle not appearing

1. Check browser DevTools for mask support: `CSS.supports('mask', 'url()')`
2. Ensure the element has explicit dimensions
3. Verify no conflicting CSS is overriding the mask

### Performance issues

1. Use CSS classes instead of React component for static content
2. Avoid unnecessary re-renders by memoizing props
3. Consider using `will-change: mask` for frequently animated elements

### Visual artifacts

1. Ensure parent containers don't have `overflow: hidden` that clips the mask
2. Check for conflicting border-radius styles
3. Verify the element has proper background/content to show the clipping effect

## Examples

See `/src/shared/ui/SquircleExample.tsx` for comprehensive usage examples.