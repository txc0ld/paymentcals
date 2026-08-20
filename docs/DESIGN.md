Recreate the website "STRATA" with high visual fidelity as a modern landing page. The design follows a strict "Swiss Editorial Tech" aesthetic: minimalist, high-contrast black/white palette, and precise grid layouts.

Preserve source quirks:
- The navigation uses `mix-blend-difference` to maintain visibility against varying backgrounds.
- The custom `.btn-editorial` uses a specific asymmetric `clip-path` polygon.
- Responsive text scaling uses `clamp()` extensively for fluid typography.

CRITICAL FIDELITY CONSTRAINTS
- Use only Black (#000000), White (#FFFFFF), and Zinc-400 (#A1A1AA) for the core palette.
- Strict absence: No colorful gradients, soft shadows, or standard rounded buttons.
- Layering: The WebGL background must reside behind all text but maintain an opacity of 0.6.
- Layout: Preserve the 1px-width vertical grid lines in the hero section overlay.

TECH STACK / DEPENDENCIES
- Tailwind CSS (CDN version)
- Geist Sans & Geist Mono (via Fontsource CDN)
- Iconify (solar icon set)
- WebGL (for background shader)
- Intersection Observer API for reveal animations

GLOBAL STYLE
- Background: `#000000` (bg)
- Surfaces: `#0A0A0A` (surface), `#141414` (surface2)
- Text: `#FFFFFF` (main), `#A1A1AA` (secondary)
- Selection: `bg-white text-black`
- Classes: `text-h1` (clamp(3.5rem, 8vw, 8rem)), `text-h2` (clamp(2.5rem, 5vw, 4.5rem)), `text-body` (clamp(1rem, 1.2vw, 1.25rem))

ASSET MAP
- Logo SVG: Custom 24x24 rect/circle composite (viewBox="0 0 24 24")
- Portrait: `https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1200&auto=format&fit=crop` (Grayscale applied)

VECTOR / ICON SHAPES
- Navigation/Footer Logo: `<rect x="2" y="2" width="20" height="20" stroke="white" stroke-width="2.5"></rect><circle cx="12" cy="12" r="4" fill="white"></circle>`
- Editorial Button: `clip-path: polygon(0 0, 100% 0, 100% calc(100% - 1rem), calc(100% - 1rem) 100%, 0 100%);`

MEDIA BEHAVIOR
- WebGL Canvas: ID `#webgl-hero`. Implement a dotted glow shader with mouse interaction (ripples) and simplex noise for organic movement. Blend mode: `SRC_ALPHA, ONE`.
- Hero Image: Grayscale, `object-cover`, opacity 0.8, scaling to 1.05 on hover.

LAYER STACK / POSITIONING MAP
- Nav: `fixed top-0 w-full z-50`, `mix-blend-difference`, `glass-panel` background.
- Hero Grid Lines: `absolute inset-0`, `z-0`, opacity 0.1, 1px white lines at edges and mid-points.
- Section Containers: `max-w-[100rem] mx-auto`.
- Bento Grid: `.swiss-grid` using 1px gap on a zinc-800 background to create faux-borders.

SECTION 1 - HERO
- Content: "Scale without the friction." (Zinc-400 span).
- Badge: "SYSTEM_CORE // 1.0" with editorial line pseudo-element.
- Call to Action: `.btn-editorial` with sliding black background on hover (`translateY(-100%)`).

SECTION 2 - TRUST LOGOS
- Layout: Horizontal flex row with text-based logos (Linear, Vercel, Raycast, Ramp, Retool).
- Interaction: `text-white/40` shifting to `white` on hover over 500ms.

SECTION 3 - PLATFORM PREVIEW
- Layout: 21:9 aspect ratio "Glass" dashboard container.
- Components: Browser-style dots (top left), tab navigation (Overview/Revenue/Pipeline), and a 5-bar CSS bar chart where the last bar is highlighted white with a glow.

SECTION 4 - CAPABILITIES BENTO
- Layout: `swiss-grid` 3-column (MD/LG).
- Features: Unified Ledger, Deterministic Routing, Enterprise Grade (White Card), Real-time Attribution (Span 2 cols), Extensible API.
- Interactions: `.hover-lift` (translateY(-8px)) on cards.

SECTION 5 - METRICS
- Statistics: 300% (ROI), 45 hrs (Saved), 99.99% (Uptime).
- Logic: Numeric counter animation on intersection using `easeOutExpo` over 2500ms.

GLOBAL ANIMATION / INTERACTION RULES
- Reveal: `.reveal-up` (opacity 0, translateY 2rem) transitions to visible on intersection.
- Delays: `.delay-1` (150ms), `.delay-2` (300ms).
- Smooth Scroll: Enabled via `scroll-smooth` on HTML tag.

COMMON MISTAKES TO AVOID
- Do not use standard rounded-corners for cards; use strict sharp 1px borders or the specific asymmetric button clip-path.
- Do not use color in the WebGL shader; keep it monochrome white/grey.
- Do not substitute Iconify icons for generic SVGs; maintain the `solar:` line library.

IMPLEMENTATION REQUIREMENTS
- Build as a single-page landing page.
- Use the exact provided asset URL for the customer portrait.
- Replicate the WebGL fragment shader for the dot-matrix background effect exactly.
- Ensure the `mix-blend-difference` on the nav is applied to the entire bar.