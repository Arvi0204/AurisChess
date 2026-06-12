# AurisChess Style Guide & Architecture (7-1 Pattern)

This folder contains the modular CSS architecture for AurisChess, structured according to the **7-1 Pattern**.

## Directory Layout
- **`00-config/`**: Global tokens, custom properties, and stack configurations.
  - `_variables.css`: Theme colors, typography, sizing scale, and transition timing.
  - `_breakpoints.css`: Global viewport width limits.
  - `_z-index.css`: Stack elevation layers.
- **`01-reset/`**: Universal base adjustments.
  - `_reset.css`: Universal elements box models and anchor defaults.
  - `_typography.css`: Headings, copy blocks, and typeface defaults.
- **`02-utilities/`**: Reusable layout helper shortcuts.
  - `_layout.css`: Flexbox and Grid column layouts.
  - `_text.css`: Alignment and overflow styles.
  - `_effects.css`: Standard glassmorphism overlays and ambient shadows.
- **`03-components/`**: Standalone, modular visual units.
  - `_buttons.css`: Centralized button modifiers.
  - `_play-buttons.css`: Pre-game selection controls (engine strengths, time controls).
  - `_game-buttons.css`: Active game control panels and mic toggle buttons.
  - `_cards.css`: Landing bento features and support cards.
  - `_play-cards.css`: Dashboard play mode and play selection card layouts.
  - `_dashboard-stats.css`: Quick stats items and recent game boards.
  - `_forms.css`: Text boxes and labels.
  - `_badges.css`: Status pills and indicators.
  - `_animations.css`: Parametric keyframe transitions.
- **`04-layout/`**: Structural layout wrappers.
  - `_header.css`, `_sidebar.css`, `_grid.css`, `_footer.css`
- **`05-sections/`**: Specific page sections.
  - `_hero.css` (Landing Page hero main section).
  - `_features.css` (Landing Page bento grids and feature previews).
  - `_workflows.css` (Landing Page workflows list, support sections, benefits).
  - `_dashboard.css` (Dashboard page layout structure).
  - `_play-page.css` (Play page wrapper shells and overlay dialogs).
  - `_auth.css` (Authentication page layout).
  - `_game-board.css` (Active chess board, player-info bars, active clock).
  - `_game-controls.css` (Game controls sidebar panel, move history scroll list, voice control).
  - `_game-results.css` (Chess game end overlay and result cards).
- **`06-responsive/`**: Viewport breakpoint media query overrides.
  - `_tablet.css` (max-width: 1040px)
  - `_mobile.css` (max-width: 720px)
  - `_small.css` (max-width: 440px)


---

## 1. CSS Variable Naming Conventions
Always use prefixed CSS custom properties declared in `:root` of `00-config/_variables.css`.

- **Colors**: `--color-{name}` or `--color-{name}-{modifier}`
  - Example: `--color-cyan`, `--color-cyan-strong`, `--color-cyan-glow-intense`
- **Spacing**: `--spacing-{scale}`
  - Example: `--spacing-xs: 4px`, `--spacing-sm: 8px`, `--spacing-md: 16px`, `--spacing-lg: 24px`, `--spacing-xl: 32px`
- **Typography Fonts**: `--font-{type}`
  - Example: `--font-primary`, `--font-display`, `--font-mono`
- **Transitions**: `--transition-{type}`
  - Example: `--transition-bezier`, `--transition-duration-normal`

---

## 2. BEM Naming Conventions & Structure
We enforce the standard **Block__Element--Modifier** structure. Nesting should never go deeper than a single element or modifier.

- **Block**: `.play-mode-card`
- **Element**: `.play-mode-card__header` (use `__` separator)
- **Modifier**: `.play-mode-card--amber` or `.play-mode-card--highlighted` (use `--` separator)

Avoid nesting child HTML tags directly (e.g., `.card h3`) inside generic layout blocks. Create descriptive elements instead (e.g., `.card__title`).

---

## 3. Responsive Breakpoint Strategy
All responsive styles are grouped and isolated within the `06-responsive/` layer inside dedicated media queries:

- **Tablet**: `@media (max-width: 1040px)` in `_tablet.css`
- **Mobile**: `@media (max-width: 720px)` in `_mobile.css`
- **Small Mobile**: `@media (max-width: 440px)` in `_small.css`

Responsive utilities should be kept in the respective responsive sheets rather than inline within the component sheets to keep the base code extremely clean and scroll-free.

---

## 4. Z-Index Hierarchy
Refer to `--z-index-*` variables in `00-config/_z-index.css` to prevent stack collisions:

- `--z-index-deep`: `0` (backgrounds)
- `--z-index-base`: `1` (normal content cards)
- `--z-index-above`: `2` (touch triggers, visual icons)
- `--z-index-resign-backdrop`: `9`
- `--z-index-blindfold-overlay`: `10`
- `--z-index-sidebar-closed`: `80`
- `--z-index-sidebar-overlay`: `999`
- `--z-index-sidebar-open`: `1000`
- `--z-index-sidebar-toggle`: `1001`
- `--z-index-sidebar-hover`: `1002`
- `--z-index-overlay`: `2000` (full-screen loading screens, modals)

---

## 5. How to Add New Components
1. Create a partial stylesheet under `03-components/` starting with an underscore: `_my-component.css`.
2. Follow BEM structure for all classes.
3. Import the new partial inside `styles/main.css` manifest at the components layer:
   ```css
   @import url('./03-components/_my-component.css');
   ```
4. Define responsive adjustments for your component inside the relevant sheets in `06-responsive/`.
