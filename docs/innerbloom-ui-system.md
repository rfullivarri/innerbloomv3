# Innerbloom UI System

## 1) Core Principle

**Innerbloom UI System** is the single source of truth for UI implementation across the product.

### Non-negotiable rules

1. **Every component must support both Light Mode and Dark Mode.**
2. **No component may ship in only one theme.**
3. **Dashboard-v3 is the visual reference baseline.**
4. **Do not invent a new visual language while implementing new features.**

When there is doubt, compare the component against Dashboard-v3 behavior and styling tokens before merging.

---

## 2) Theming System

The app uses global theme tokens and Dashboard-v3 scoped behavior (`data-light-scope="dashboard-v3"`) to keep parity between themes.

### Light Mode rules

- Use bright neutral surfaces (`--color-surface`, `--color-surface-elevated`) and low-noise overlays.
- For **macro dashboard surfaces** (large cards/sections), prefer **shadow/elevation-first** separation and keep perimeter borders imperceptible (`--color-card-border` can be transparent in scoped light surfaces like dashboard-v3).
- Keep **micro surfaces** (chips, pills, mini-panels, form controls) with subtle borders when they improve hierarchy.
- Use short, soft shadows (`--shadow-elev-1`, `--color-card-shadow`) to separate layers.
- For dashboard card parity (task cards + emotion surfaces), use `--IB_SURFACE_CARD_LIGHT` (`0 6px 20px rgba(15, 23, 42, 0.3)`) in Light Mode only.
- Keep text contrast hierarchy clear:
  - Primary text: `--color-text`
  - Secondary text: `--color-text-muted`
  - Tertiary/meta text: `--color-text-subtle`

### Dark Mode rules

- Use deep neutral surfaces (`--color-surface`, `--color-surface-muted`, `--color-surface-elevated`).
- Use translucent overlays to create depth (`--color-overlay-1` through `--color-overlay-3`).
- Keep borders soft and low-alpha (`--color-border-subtle`, `--color-border-soft`).
- Elevation relies more on luminance contrast and glow than on heavy border contrast.

### Surface philosophy

#### Light Mode

- **Light surfaces** first.
- **Macro surfaces:** shadow/elevation second.
- **Micro surfaces:** subtle borders second.
- **Short shadows** third.

#### Dark Mode

- **Dark surfaces** first.
- **Soft glow / translucent overlays** second.
- **Elevation by luminance** (brighter foreground on darker backdrop), not by thick borders.

---

## 3) Color System

Use Dashboard-v3 token categories. Components must use these token families instead of hardcoded random values.

### Primary color

- **Dark Mode:** `--color-accent-primary: #38bdf8` (sky/cyan family)
- **Light Mode:** `--color-accent-primary: #6366f1` (indigo family)

Primary color is used for emphasis, interactive focus, active controls, and key highlights.

### Accent color

- **Dark Mode:** `--color-accent-secondary: #8b5cf6`
- **Light Mode:** `--color-accent-secondary: #d946ef`

Accent color is used for secondary gradients, celebratory states, and mixed accent surfaces.

### Inner Bloom gradient

The **Inner Bloom gradient** is the canonical brand progress/CTA gradient taken from the onboarding GP bar.

- CSS token: `--gradient-innerbloom`
- Stops: `#a770ef 0%` -> `#cf8bf3 52%` -> `#fdb99b 100%`
- Direction: `90deg`
- Soft track token: `--gradient-innerbloom-soft`
- CTA shadow token: `--shadow-innerbloom-cta`

Use this gradient for primary brand progress bars, GP/onboarding-aligned progress fills, and primary Daily Quest CTAs. Avoid replacing it with cyan/sky/indigo gradients in core product progress surfaces unless the component is intentionally representing a separate metric color system.

### Neutral surfaces

Use neutral stacks per theme:

- **Dark:**
  - `--color-surface: #0f172a`
  - `--color-surface-muted: #111c33`
  - `--color-surface-elevated: #182640`
- **Light:**
  - `--color-surface: #f8fafc`
  - `--color-surface-muted: #f1f5f9`
  - `--color-surface-elevated: #ffffff`

Overlay layers (`--color-overlay-*`) are preferred for glass cards, pills, and nested containers.

### Borders

- **Dark:** semi-transparent white border tokens (subtle/soft/strong).
- **Light:** cool neutral stroke tokens (`#e2e8f0`, `#eef2f7`, `#cbd5e1`).

Use border intensity to communicate state:

- subtle = default container boundary
- soft = hover/focus/interactive boundary
- strong = selected/active/critical emphasis only

### Text hierarchy

- `--color-text` = primary readable text.
- `--color-text-muted` = supporting copy.
- `--color-text-subtle` = meta labels, timestamps, helper hints.

Never invert this hierarchy (e.g. do not use subtle text for primary content).

### Widget menu semantic tokens

For Dashboard-v3 widget configuration surfaces ("Widgets", "Widgets disponibles", chips, and "Editar" actions), use semantic tokens only.

- `--color-widget-menu-heading`: section title text.
- `--color-widget-menu-label`: secondary labels and helper copy.
- `--color-widget-menu-item-title`: primary item names inside list rows.
- `--color-widget-menu-icon`: chevrons and passive iconography.
- `--color-widget-edit-*`: border/background/text/hover tokens for compact secondary edit actions.
- `--color-widget-chip-*`: default and selected chip surfaces, borders, icons, text, and selected outline.

Do not hardcode `slate-*`, `white`, or `emerald-*` utility colors in this area; map visual states through these DS tokens to preserve contrast parity in Light and Dark modes.

---

## 4) Component Categories

### Cards

**Visual structure**

- Rounded corners (typically 2xl/3xl or project-specific rounded token).
- Macro cards in Light Mode can use `--color-card-border` with near-transparent/transparent values when scoped (e.g., `data-light-scope="dashboard-v3"`).
- Nested and micro containers should keep subtle border tokens (`--color-border-subtle`, `--color-border-soft`) when needed for legibility.
- Surface from card/surface gradient tokens (`--color-card-gradient`, `--color-card-highlight-gradient`) or `--color-overlay-1`.

**Elevation style**

- Use `--color-card-shadow` / `--shadow-elev-1` for standard cards.
- Use stronger elevation only for modal-level or overlay cards.

**Border usage**

- Dark Mode floating cards keep visible soft borders.
- Light Mode macro cards may rely primarily on elevation and keep border fully subtle/imperceptible; avoid hard gray outlines.

**When to use**

- Grouping dashboard data, modules, metrics, and content blocks.

### Chips / Badges

**Visual structure**

- Rounded-full small labels with compact horizontal padding.
- One of two approved styles: Soft Chip or Solid Chip (see Section 5).

**Elevation style**

- Generally flat or lightly elevated.
- Glow is allowed only when representing priority/active status in Dark Mode.

**Border usage**

- Soft chips: subtle border optional, low alpha.
- Solid chips: border usually present with stronger tint for contrast.

**When to use**

- States, metadata, status tags, tiny CTAs, contextual labels.

### Buttons

**Visual structure**

- Rounded-full or rounded-2xl depending on context.
- Filled primary CTAs use accent gradients or accent fills.
- Secondary buttons use overlay surface + subtle border.

**Elevation style**

- Primary: medium elevation and vivid contrast.
- Secondary: low elevation and clear hover feedback via border/background shift.

**Border usage**

- Secondary/ghost buttons must keep visible borders in both themes.
- Primary buttons may reduce border visibility if fill contrast is strong.

**When to use**

- Any direct action. Promote one primary action per block; keep others secondary.

### Inputs

**Visual structure**

- Rounded corners, surface background, subtle border, high-contrast text.
- Label + helper text follow text hierarchy tokens.

**Elevation style**

- Minimal; rely on border/focus ring rather than strong shadows.

**Border usage**

- Default border subtle.
- Focus border/ring transitions to accent-informed color.

**When to use**

- Form controls inside cards/modals and settings panels.

### Modals

**Visual structure**

- Backdrop with dim + blur.
- Elevated rounded container with border and surface token.
- Clear top header + close affordance.

**Elevation style**

- Stronger than cards (`shadow-2xl` equivalent is acceptable).

**Border usage**

- Required for modal container to maintain shape definition in both themes.

**When to use**

- Focused multi-step actions, settings, confirmations, and detailed inspection.

### Notifications / Alerts

**Visual structure**

- Context-tinted background + matching border + high readability text.
- Optional icon/dot and compact action chip/button.

**Elevation style**

- Inline alerts: minimal.
- Floating notifications: elevated card with blur and clear close action.

**Border usage**

- Required to preserve color-state semantics.

**When to use**

- System guidance, warnings, success/error states, and contextual onboarding feedback.

### Navigation

**Visual structure**

- Glass/overlay container with rounded shape and border.
- Active item indicated by both icon and text contrast changes.

**Elevation style**

- Persistent nav bars can use elevated glass style + blur.

**Border usage**

- Keep subtle enclosing border to define nav boundary over variable backgrounds.

**When to use**

- Primary route switching (mobile bottom nav, menu entry points, section tabs).

### Lists

**Visual structure**

- List container typically sits inside card/notification surface.
- Each row keeps clean spacing, simple icon/text/value hierarchy.

**Elevation style**

- Usually none per row; row grouping gains elevation from parent container.

**Border usage**

- Use subtle outer border for grouped list blocks.
- Optional inner separators only when density requires it.

**When to use**

- Task items, notification payloads, compact structured summaries.

---

## 5) Chip System

Two chip styles are approved.

### Soft Chip

A **Soft Chip** uses a translucent or low-opacity background (approximately **10–20% tint of base color**) with text in the same color family.

Use Soft Chip for:

- metadata
- secondary information
- contextual labels
- non-critical state indicators

Examples in Dashboard-v3 patterns:

- accent-tinted plan/status pills with low-opacity fill and colored text
- overlay chip surfaces that are informative, not urgent

### Solid Chip

A **Solid Chip** uses a filled or strongly tinted background with high-contrast text and a clearly visible border when needed.

Use Solid Chip for:

- important states
- warnings/success/error emphasis
- compact actions that must stand out

Examples in Dashboard-v3 patterns:

- onboarding/action chips in alerts
- warning/success state chips in light theme overrides

---

## 6) Component Creation Rule

Every new component must satisfy all rules below before merge:

1. Support **Light Mode**.
2. Support **Dark Mode**.
3. Follow Dashboard-v3 design language.
4. Reuse existing style patterns for:
   - cards
   - chips
   - buttons
   - inputs

No new visual style should be introduced unless this document is explicitly updated first.

---

## 7) Implementation Rule for Codex

When Codex creates or updates a UI component, it must follow this sequence:

1. Check `/docs/innerbloom-ui-system.md`.
2. Reuse styles and tokens defined here.
3. Implement and verify both Light Mode and Dark Mode.
4. Keep consistency with Dashboard-v3 visual behavior.

If an implementation requires a new visual pattern, Codex must update this UI System document in the same change set before introducing that pattern.

---

## Practical enforcement checklist (for PR review)

- [ ] Component renders correctly in Light Mode.
- [ ] Component renders correctly in Dark Mode.
- [ ] Uses existing token categories (surface, border, text, accent, overlay).
- [ ] Reuses existing Dashboard-v3 card/chip/button/input structure.
- [ ] No undocumented one-off style introduced.
