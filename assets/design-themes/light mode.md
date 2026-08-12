---
name: Orbital Soft-Tech
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464554'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#b4136d'
  on-secondary: '#ffffff'
  secondary-container: '#fd56a7'
  on-secondary-container: '#600037'
  tertiary: '#006c49'
  on-tertiary: '#ffffff'
  tertiary-container: '#00885d'
  on-tertiary-container: '#000703'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#ffd9e4'
  secondary-fixed-dim: '#ffb0cd'
  on-secondary-fixed: '#3e0022'
  on-secondary-fixed-variant: '#8c0053'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
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
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
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
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is built for modern SaaS and creative technology platforms. It prioritizes a **Modern Minimalist** aesthetic with a heavy emphasis on **Glassmorphism** and organic, friendly geometry. The target audience includes digital natives who value clarity, fluidity, and a premium "app-like" feel even within web environments.

The emotional response should be one of "effortless sophistication." By utilizing high-radius shapes and soft depth, the UI feels approachable and tactile, reducing the cognitive load often associated with complex technical tools.

## Colors

This design system utilizes a vibrant "Indigo-to-Pink" primary spectrum to denote action and energy. 

- **Primary:** An electric Indigo used for main actions and focus states.
- **Secondary:** A warm Pink used for highlights, notifications, and secondary accents.
- **Neutral:** A balanced Slate palette that provides grounding for typography and borders.
- **Surface:** High-transparency whites and light greys are used to facilitate glassmorphic layering.

## Typography

The typography strategy pairs the sharp, contemporary precision of **Hanken Grotesk** for headlines and labels with the functional clarity of **Inter** for long-form body text. 

Headlines utilize tighter letter-spacing and heavier weights to command attention, while labels are slightly tracked out to maintain legibility at smaller sizes within pill-shaped containers. For mobile, headline sizes are scaled down to ensure four-line titles do not dominate the viewport.

## Layout & Spacing

The design system employs a **Fluid Grid** model based on an 8px base unit. 

- **Desktop:** 12-column grid with 24px gutters and 40px outer margins.
- **Tablet:** 8-column grid with 24px gutters and 24px outer margins.
- **Mobile:** 4-column grid with 16px gutters and 16px outer margins.

Spacing between functional groups should follow a rhythmic progression (24px, 48px, 80px) to create a clear visual hierarchy and "breathable" content regions.

## Elevation & Depth

Depth is established through **Glassmorphism** and ambient, tinted shadows. Surfaces do not rely on heavy solids; instead, they use:

1.  **Backdrop Blurs:** 12px to 20px blur radius on container backgrounds.
2.  **Translucent Fills:** White or Neutral-50 at 70-80% opacity.
3.  **Inner Borders:** A 1px semi-transparent white border on the top and left edges to simulate light hitting a glass edge.
4.  **Ambient Shadows:** Soft, diffused shadows (Blur: 30px, Spread: -5px) tinted with the Primary color at 5% opacity to create a "floating" effect.

## Shapes

The shape language is defined by extreme roundness to promote a friendly and high-tech aesthetic. 

- **Interactive Components:** All buttons, input fields, and selectors must use a minimum corner radius of **24px**.
- **Labels & Badges:** Must be **fully pill-shaped** (9999px radius), ensuring the ends are perfectly semicircular.
- **Containers:** Large cards and sections utilize the `rounded-xl` (48px on desktop, 32px on mobile) to maintain consistency with the hyper-rounded interactive elements.

## Components

### Buttons
Buttons are the primary interactive element. They must be pill-shaped (radius: 9999px or at least 24px for smaller heights). Primary buttons use a subtle gradient and a soft shadow, while secondary buttons use a ghost style with a 1.5px border.

### Input Fields
Inputs must mirror the button radius. Use a 24px corner radius for the text field container. Focus states should be indicated by a glow effect (soft shadow) rather than just a border color change.

### Chips & Badges
Chips are strictly pill-shaped. They use a low-opacity tint of the category color (e.g., Primary-100) with high-contrast text for accessibility.

### Cards
Cards use a 32px or 48px radius. They should feature the glassmorphic background blur and the 1px highlight border to separate them from the background without needing heavy drop shadows.

### Checkboxes & Radios
To match the rounded theme, checkboxes should have a significant 4px radius (softened square), while radio buttons remain perfectly circular.