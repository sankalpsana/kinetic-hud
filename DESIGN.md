---
name: Kinetic HUD
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353943'
  surface-container-lowest: '#0a0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#262a34'
  surface-container-highest: '#31353f'
  on-surface: '#dfe2ef'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#dfe2ef'
  inverse-on-surface: '#2c303a'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#ffb95f'
  on-secondary: '#472a00'
  secondary-container: '#ee9800'
  on-secondary-container: '#5b3800'
  tertiary: '#ffb3ad'
  on-tertiary: '#68000a'
  tertiary-container: '#ff7a73'
  on-tertiary-container: '#79000e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#0f131c'
  on-background: '#dfe2ef'
  surface-variant: '#31353f'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  metric-display:
    fontFamily: JetBrains Mono
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.04em
  metric-display-mobile:
    fontFamily: JetBrains Mono
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.03em
  metric-md:
    fontFamily: JetBrains Mono
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.02em
  metric-sm:
    fontFamily: JetBrains Mono
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system is precision-engineered for the harsh, low-lux environment of commercial and strength facilities. Drawing heavily from industrial telemetry, avionics Heads-Up Displays (HUD), and high-contrast tactical gear interfaces, the visual philosophy rejects decorative ambiguity in favor of operational efficiency, immediate visual hierarchy, and relentless readability.

The target audience consists of dedicated strength athletes, hyper-focused lifters, and data-driven performance coaches executing demanding physical protocols. The UI must invoke absolute reliability, kinetic feedback, and physiological clarity—instilling confidence that data entry requires zero cognitive overhead between grueling sets. 

The aesthetic is an authentic industrial-technical HUD: ultra-dark, low-luminance canvas architecture punctuated by razor-sharp structural outlines and surgical signal colors. Information is treated as live diagnostic telemetry: weights, tempos, velocity loss, and reps are quantified with raw, mechanical precision.

## Colors

The palette is tuned specifically for low-light legibility and distinct operational states under high eye fatigue and rapid glance conditions.

- **Primary Canvas & Background (`#090D16`)**: Deep Obsidian / Midnight Slate. Absorbs reflective glare and establishes an infinite-depth backdrop that prolongs battery life on OLED devices during long training sessions.
- **Surface Elevation (`#111827`)**: Rich technical card container surface, providing distinct architectural separation from the canvas while preserving dark-adaptation.
- **Structural Outlines (`#1F2937`)**: Crisp 1px structural boundaries defining operational panels, data grids, and component enclosures.
- **Primary Action & Confirmation (`#10B981`)**: Kinetic Mint Emerald. Reserved strictly for forward velocity: active timer countdowns, completed sets, automated progression bumps, and primary action buttons.
- **Warning & Recovery Accent (`#F59E0B`)**: Warm Amber. Denotes system alerts, adaptive volume reductions, RPE overshoots, deload recommendations, and rest-period expiration thresholds.
- **Critical / Physiological Stress (`#EF4444`)**: High-visibility Crimson. Flagged solely for biomechanical risk: reported joint pain, tendon load caps, failed attempts, and emergency set aborts.
- **Text & Telemetry Hierarchy**:
  - High-Luminance Data & Titles: `#F9FAFB` (100% white-slate for instant scanning)
  - Structural Metadata & Labels: `#9CA3AF` (Neutral mid-tone for secondary metrics)
  - Units, Delimiters & Sub-readouts: `#6B7280` (Muted dark slate, preventing visual pollution around primary numerical outputs)

## Typography

The type system is divided across three distinct operational roles:
1. **Space Grotesk (Display / Structural Titles)**: Delivers an assertive, technical geometry for workout stages, exercise naming, and modal overlays.
2. **Inter (UI Context & Instructions)**: Provides neutral, ultra-legible humanist flow for instructions, biomechanical cues, and settings menus.
3. **JetBrains Mono (Telemetry & Metrics)**: Carries all numerical and kinetic outputs—reps, weight values (kg/lbs), rest interval countdowns, velocity indices, and RPE scores. Its fixed-width characteristics eliminate visual jitter when values update in real-time.

All metadata labels use `label-caps` styled with forced uppercase and positive letter-spacing (`0.08em`) to mimic diagnostic cockpit readouts.

## Layout & Spacing

The layout is built mobile-first around dynamic gym thumb zones. It relies on a responsive fluid grid structure with strict bounds to prevent excessive ocular travel across wide screens.

- **Mobile Viewport (<768px)**: 4-column fluid layout with `1rem` outer screen margins and `0.75rem` gutters. All primary action mechanics (set completion, incremental weight toggles) are docked strictly in the bottom 40% of the viewport (thumb-reach sector).
- **Tablet / Mounted Console (768px - 1024px)**: 8-column system with `1.5rem` margins. Splits active telemetry (timers, prescribed targets) to the left column and live input fields to the right.
- **Desktop / Kiosk (>1024px)**: 12-column fixed system locked to a maximum width of `1200px` centered within deep obsidian canvas space.

Every touch target adheres to a strict physical envelope: a mandatory minimum of **48×48px** for all interactive targets, expanding to **56px** height for high-frequency in-workout buttons (e.g., "LOG SET", "START REST").

## Elevation & Depth

In a high-contrast industrial HUD, depth is conveyed through **surface luminance stacking and razor-thin borders**, rather than heavy diffuse drop shadows that wash out dark displays.

- **Base Layer (Level 0)**: Background canvas (`#090D16`), flat and static.
- **Container Layer (Level 1)**: Primary cards and panels (`#111827`). Crisp `1px solid #1F2937` perimeter definition with zero shadow.
- **Active / Focused Interactive Layer (Level 2)**: Overlays, bottom workout sheets, and floating HUD badges (`#1F2937`). Reinforced with a high-contrast boundary (`1px solid #374151`) and an ultra-subtle, directional ambient occlusion: `box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.8)`.
- **Telemetry Glow / Signal State**: Active countdown bars or confirmed set checkpoints cast a razor-thin neon atmospheric bloom: `box-shadow: 0 0 12px rgba(16, 185, 129, 0.25)`. Warning states trigger `0 0 12px rgba(245, 158, 11, 0.25)`.

## Shapes

The design system employs a disciplined, micro-chamfered shape profile (`roundedness: 1`). Elements favor technical sharpness over soft, playful consumer curves.

- Base inputs, buttons, and telemetry chips carry a tight `0.25rem` (4px) corner radius.
- Cards, modal dialogue containers, and macro workout panels implement `0.5rem` (8px, `rounded-lg`).
- Round forms are strictly reserved for circular progress rings and timer tracks; decorative circular avatars and pill shapes are completely avoided to maintain a precision tool identity.

## Components

### Buttons
- **Primary Kinetic Action**: Fill `#10B981` with `#090D16` text in `JetBrains Mono` bold caps. Minimum height of 52px. Hover/tap state: `#34D399` with instantaneous transition (`75ms ease-out`). Active state triggers an inset `1px` white stroke.
- **Secondary Ghost / Technical**: Transparent fill, `1px solid #1F2937`, text `#F9FAFB`. On focus or hover: border shifts to `#10B981`, text adopts emerald tint.
- **Destructive / Abort**: Transparent fill, `1px solid #EF4444`, text `#EF4444`. Tapping produces a confirmation state with solid `#EF4444` background and `#090D16` text.

### Interactive Metric Pickers (Weight & Rep Steppers)
- Modular split-component: Central display box showing current value (`metric-display` in `#F9FAFB`) with small upper label (`KG` or `REPS` in `label-caps` `#6B7280`).
- Flanked by large 48px square decrement (`-`) and increment (`+`) steppers, styled with `1px solid #1F2937` and solid `#111827` backing. Long-press activates rapid acceleration.

### Input Fields
- Dark enclosed containers (`#0D131F`) with a base border of `1px solid #1F2937`.
- Focus state instantly replaces the border with `1px solid #10B981` accompanied by a `0 0 0 1px #10B981` hard ring.
- Fixed unit suffixes (`KG`, `LBS`, `RPE`) sit anchored inside the right margin in `JetBrains Mono` `#6B7280`.

### Cards & Workout Set Rows
- **Card**: Background `#111827`, border `1px solid #1F2937`, internal padding `1rem`. Headers display exercise labels with technical index prefixes (`01 // BARBELL BACK SQUAT`).
- **Set Matrix Row**: Grid layout allocating space for Set Number (`01`), Previous Target (`140kg x 5`), Actual Input Fields, and Set Confirmation Indicator.
- **Set Confirmation State**: When a set is logged, the row background transitions from `#111827` to a dimmed translucent green (`rgba(16, 185, 129, 0.08)`) bounded by a subtle emerald border (`rgba(16, 185, 129, 0.3)`).

### Chips & Telemetry Badges
- Compact rectangular indicators (height 28px) with `0.25rem` radius.
- **RPE / Readiness Badges**: Neutral (`#1F2937` fill, `#9CA3AF` text), Deload/Fatigue warning (`rgba(245, 158, 11, 0.15)` fill, `#F59E0B` text and border), Biomechanical pain alert (`rgba(239, 68, 68, 0.15)` fill, `#EF4444` text and border).

### Checkbox & Radio Buttons
- Industrial mechanical switches: 24×24px square boxes (`0.25rem` radius) with `1px solid #374151` borders.
- Selected state turns the entire box solid `#10B981` with an interior black checkmark glyph, delivering zero ambiguity in peripheral vision.

### Floating Rest Timer HUD
- Persistent viewport-anchored bottom bar displaying an integrated horizontal SVG progress wire. 
- Time remaining rendered in massive `metric-md` typography. Quick-adjustment buttons (`+30s`, `SKIP`) flank the readout with 48px hit areas for high-adrenaline accessibility.