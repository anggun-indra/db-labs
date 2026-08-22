# Adopting the DeepSeek Harness Design System (dsw)

Goal: make Database Learning Lab follow the DeepSeek harness UI
(`deepseek-ai/dsh-client-web`) 1:1 — layout, UI kit, components, icon
configuration, Appearance config, and other settings.

## Source of truth

The harness ships its design system in `@deepseek-ai/dsh-client-ui-theme`
(extracted from the locally installed dsh 0.1.0-rc.7):

- Full token CSS, kept verbatim: `docs/design/reference/dsw-theme-extracted.css`
- App token layer: `src/styles/dsw/tokens.css` (generated from the same chunks:
  `design-platform.css.mjs`, `base.css.mjs`, `scrollbar.css.mjs`)

Key mechanics reproduced exactly:

| Mechanic | dsw behaviour | This app |
| --- | --- | --- |
| Token layers | `--dsw-static-*` palette → `--dsw-alias-*` roles | same names, verbatim values |
| Dark mode | `body[data-ds-dark-theme]` overrides aliases | same attribute, same selector |
| Theme modes | light / dark / system | `src/stores/themeStore.ts`, persisted in `dblab:ui-theme` |
| Font stack | -apple-system, …, PingFang SC, … | `--dsw-font-family` (verbatim) |
| Brand | deepseek-500 `#4176e6`, deepseek-450 `#5686fe` | AntD `colorPrimary` per mode |
| Sidebar fill | `--dsw-specific-sidebar-fill` (bluish-50 / bluish-900) | `.app-sider` |
| Radii | cards/code blocks 12px | AntD `borderRadiusLG: 12` |
| Settings dialog | left nav rail + panels; Appearance theme cubes | `/settings` page, same structure |

## Done (round 1)

- [x] Token layer extracted verbatim (432 declarations, light + dark)
- [x] `themeStore` (light/dark/system, persistence, OS watcher, body attribute)
- [x] AntD theme mapping (`src/app/dswTheme.ts`) for both modes
- [x] Settings page: nav rail + General (Appearance theme cubes, Language note)
      + Connection panel — cube styling mirrors the dsw theme picker
- [x] Shell restyle: token-driven sidebar/header/content, Settings nav item
- [x] Verified: gates green (incl. e2e), computed styles match dsw palette
      in both modes; screenshots in /tmp/dsw-*.png for visual review

## Done (round 2) — component parity sweep

- [x] Full AntD component token sweep in `dswTheme.ts`: Card/Table/Button/
      Input/Select/Tabs/Tag/Modal/Drawer/Segmented/Alert/Tooltip/Dropdown/
      Message — dsw radii (8/12/16), bluish neutrals, deepseek accents
- [x] Settings geometry matched to the dsh settings plugin exactly
      (panel radius 24, nav 188px, nav title 16/500, nav cell 40px, logo
      row 60px, brand 18px/600/0.04em letter-spacing)
- [x] Zero hardcoded hex/rgba left in `src` (excl. tokens.css + theme swatch
      previews): ValidationPanel state icons, Badges, Projects/Database
      avatars, SubmissionReviewDrawer selected row, all feature CSS
      (erd/database/playground) now use dsw alias tokens
- [x] ERD canvas + node chrome tokenized with per-theme helpers
      (`--dsw-erd-grid/-accent/-node-border`); node header uses inverted
      brand token so it flips light/dark like dsw
- [x] Verified: full gates green; ERD editor computed colors match the dark
      palette (toolbar #232324, canvas #151517, border-l1 white/12%)

## Done (round 3) — icon config + visual evidence

- [x] Icon config normalized: no filled/two-tone icons remain; status icons
  (ValidationPanel, DatabasePage) converted to Outlined — single outline
  style across nav, toolbars, and status surfaces; nav/toolbar icons 16px
- [x] Visual snapshot suite: `npm run visual` captures dashboard, settings,
  profile, ERD in light + dark into `docs/design/screenshots/` (8 PNGs)

## Done (round 4) — regression lock + chrome polish

- [x] `e2e/dsw-theme.spec.ts`: 5 automated assertions locking the parity in —
  light palette, dark palette, Appearance switch + persistence, dsh settings
  geometry (radius 24 / rail 188px / cell 40px), 16px nav icons
- [x] Panel radius unified to 12px (playground header, monaco frame,
  database header, DDL preview, schema explorer list)
- [x] DDL preview code font switched to the dsw code stack
      (`--ds-font-family-code`)

## Done (round 5) — final pass

- [x] Visual snapshot suite extended: dashboard, settings, profile, ERD,
      database, SQL playground × light/dark → 12 screenshots in
      `docs/design/screenshots/` (`npm run visual`)
- [x] UX fix surfaced by the suite: the mask-less inspector drawer covered
      the ERD toolbar at wide viewports; the toolbar now shifts left while
      the inspector is open (`.erd-toolbar--avoid-inspector`, e2e-guarded)

## Completion assessment

The objective — layout, UI kit, and components following the DeepSeek
harness 1:1 (icon config, Appearance config, other settings) — is met to
the extent the domain allows:

- Token layer is **verbatim** dsw (432 declarations, identical dark-mode
  mechanic), not a re-approximation
- Appearance behaves exactly like the harness picker (light/dark/system,
  persistence, OS sync) and the Settings page reuses the harness dialog
  structure and geometry
- Every AntD component renders through the dsw token mapping; zero
  hardcoded colors remain; icons unified to the outline style at 16px
- Parity is locked by 6 e2e regression assertions and 12 reference
  screenshots

Remaining differences are inherent to the domain: dsh's chat/agent/model
components have no counterpart in a database course app, so their visuals
were translated onto this app's equivalent components instead of copied.

## Follow-up: rename + harness sidebar shell

New objective: name the app **DBLab**, widen the sidebar to the harness
width, use a harness-style collapse/expand affordance, and pin Settings to
the bottom of the rail.

- [x] Renamed the product surface to **DBLab**: sidebar brand, dashboard hero,
      document `<title>`, PWA manifest `name`, sign-in card, error boundary
      and update prompt. (The course strap in the header stays descriptive.)
- [x] Sidebar widened to the harness rail width **280px** (expanded) /
      **56px** (collapsed), matching the dsh `sidebar:280` constant and the
      icon-only collapsed rail.
- [x] Harness-style collapse/expand: the toggle uses the harness's own
      **panel-left glyph** (`IconPanelLeftOutline16` → `PanelLeftIcon`, a rounded
      frame with a divided left panel) instead of a fold/arrow icon. Expanded:
      the panel icon sits at the right of the 60px logo row. Collapsed: the rail
      shows the brand mark and swaps to the panel icon on hover, signalling
      "expand" — the dsh `railMark` ↔ `panelIcon` behaviour.
- [x] Settings moved out of the menu into the bottom **foot area** (dsh
      `footArea` + settings trigger): a 42px radius-12 cell with icon+label,
      collapsing to a 36px circular rail cell.
- [x] e2e locks the new shell: brand=DBLab, rail 280↔56px collapse/expand,
      Settings present in foot area and absent from the menu. All gates green;
      12 reference screenshots refreshed.

## Branding: modern logo, product title, deployment version tag

- [x] New DBLab logo: a modern gradient brand tile (deepseek-450 → 500) with a
      white database cylinder plus an ERD-relation spark. Ships as
      `public/logo.svg`, an inline `src/components/AppLogo.tsx` (crisp at any
      size, used in the sidebar brand + collapsed expand button), the favicon,
      and regenerated `pwa-192x192.png` / `pwa-512x512.png` icons.
- [x] Application title changed from
      "Manajemen Database — Database Management for Digital Business" to
      **Database Management Labs** (header strap).
- [x] Version tag: build-time `__APP_VERSION__` injected from `package.json`
      (`src/app/version.ts`), rendered as a small **`vX.Y.Z` tag beside the
      header title** and in Settings > General. `npm run deploy` bumps the patch
      number before
      building, so every deployment carries a fresh tag.
- [x] e2e asserts the new title and a semver version tag in both the sidebar
      and Settings. All gates green; 12 screenshots refreshed with the new
      branding.
