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

## Next rounds (component parity backlog)

1. Dashboard cards + stat tiles → dsw layer/border/shadow tokens
2. Tables, forms, inputs, buttons across Projects/Assignments/Submissions
3. Icon configuration: adopt dsh-style 16px outline icons across nav + toolbars
4. Profile page restyle (cards, auth forms) to dsw tokens
5. SQL Playground + ERD editor chrome (toolbars, drawers) token pass
6. Modals/drawers/message styles (AntD component token sweep)
7. Light/dark visual regression screenshots per page
