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

## Next rounds (component parity backlog)

1. Icon configuration: adopt a single 16px outline icon style across nav +
   toolbars; audit for filled/outlined mixing
2. Profile page restyle (cards, auth forms) to dsw tokens
3. SQL Playground + Database page chrome polish (panels, explorer, schema)
4. Modals/drawers/message visual regression screenshots per page (light+dark)
5. Empty states + illustrations aligned to dsw neutral style
