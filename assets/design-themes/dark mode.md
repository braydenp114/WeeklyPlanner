---
name: Orbital Soft-Tech Dark
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#b9c8de'
  on-secondary: '#233143'
  secondary-container: '#39485a'
  on-secondary-container: '#a7b6cc'
  tertiary: '#7bd0ff'
  on-tertiary: '#00354a'
  tertiary-container: '#009bd1'
  on-tertiary-container: '#002d40'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#d4e4fa'
  secondary-fixed-dim: '#b9c8de'
  on-secondary-fixed: '#0d1c2d'
  on-secondary-fixed-variant: '#39485a'
  tertiary-fixed: '#c4e7ff'
  tertiary-fixed-dim: '#7bd0ff'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004c69'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  container-max: 1280px
---

## Brand & Style
This design system centers on a sophisticated, high-tech aesthetic tailored for modern SaaS and developer platforms. The brand personality is professional yet innovative, evoking a sense of deep space and digital precision. 

The visual style is a fusion of **Minimalism** and **Glassmorphism**, optimized for a dark environment. It utilizes semi-transparent surfaces, subtle backdrop blurs, and vibrant accent highlights to create a multi-layered interface that feels light despite the dark palette. The atmosphere is calm, focused, and premium.

## Colors
The palette is built on a deep obsidian base (#0f172a), providing a high-end canvas for developer-centric workflows. 

- **Primary Indigo (#6366f1):** Remains the core action color, tuned for maximum vibrance against dark surfaces.
- **Surface Strategy:** Depth is established through varying shades of slate and navy. `surface_dim` is used for background-level grouping, while `surface_bright` is reserved for elevated interactive elements.
- **Glassmorphism:** Container backgrounds utilize semi-transparent alpha channels (e.g., `rgba(30, 41, 59, 0.6)`) to allow underlying gradients or colors to bleed through subtly.
- **Contrast:** Text colors are strictly enforced for accessibility, scaling from pure white for headings to muted slate for metadata.

## Typography
The typography system balances modern grotesque aesthetics with technical utility. 

- **Headlines:** Uses **Hanken Grotesk** for a sharp, contemporary feel. High-level displays use negative letter spacing to feel tighter and more impactful.
- **Body:** **Inter** is the workhorse font, providing exceptional legibility for long-form data and documentation.
- **Technical/Labels:** **JetBrains Mono** is utilized for labels, buttons, and code snippets, reinforcing the "soft-tech" narrative. 
- **Hierarchy:** Contrast is maintained through weight and color (text_primary vs text_secondary) rather than just size.

## Layout & Spacing
The layout follows a **Fluid Grid** philosophy with a strict 4px baseline rhythm.

- **Grid:** A 12-column grid is used for desktop (breakpoints at 1024px+), transitioning to a 4-column grid for mobile devices.
- **Margins:** Generous outer margins (48px on desktop) preserve the minimalist aesthetic and focus attention on the central content.
- **Reflow:** On mobile, side-by-side card layouts stack vertically, and padding is reduced to 16px to maximize screen real estate.

## Elevation & Depth
Depth is communicated through **Tonal Layering** and **Glassmorphism** rather than traditional heavy shadows.

- **Layers:** Higher elevation levels are represented by lighter surface colors (closer to `surface_bright`).
- **Glass Effects:** Top-level cards should apply a `backdrop-filter: blur(12px)` and a subtle 1px border using `rgba(255, 255, 255, 0.1)` to define edges against the dark background.
- **Glows:** Primary buttons and active states may use a subtle indigo outer glow (soft, low-opacity shadow) to simulate light emission.

## Shapes
The design system employs a **Rounded** geometry to soften the technical precision.

- **Standard Elements:** Buttons, inputs, and small widgets use a base 0.5rem (8px) radius.
- **Containers:** Large cards and modals utilize `rounded-xl` (1.5rem / 24px) to create a friendly, modern "app-like" container feel.
- **Consistency:** Maintain consistent corner radii across nested elements to ensure "inner radius = outer radius - padding" logic where possible.

## Components
- **Buttons:** Primary buttons are solid Indigo (#6366f1) with white text. Secondary buttons are outlined with a subtle slate border. Text is always set in JetBrains Mono.
- **Cards:** Use semi-transparent dark overlays (`container_low`) with a 1px border stroke. The background blur is essential for legibility over any background patterns.
- **Inputs:** Fields use the `surface_dim` color with a 1px border that glows Indigo on focus. Labels are positioned above the field in `text_secondary`.
- **Chips:** Small, pill-shaped elements with `surface_bright` backgrounds and `body-sm` typography, used for tagging and status.
- **Lists:** Items are separated by subtle `rgba(255, 255, 255, 0.05)` dividers. Hover states should use a slight brightness increase rather than a color shift.