# Reusable Playbook — Firebase Classroom Apps

Everything this project learned, packaged for the NEXT project. This is not
project documentation (that lives in `docs/`) — it is a starter kit meant to be
copied into new repos.

## When to use it

Building another learning/classroom web app with this stack:

- React 18 + TypeScript strict + Vite 5
- Ant Design 5 + @xyflow/react (canvas apps) + Zustand 5 + Zod + react-router v6
- Firebase v11 modular (Auth + Firestore) with local emulator workflow
- sql.js / Monaco / PWA (vite-plugin-pwa) if the app needs in-browser engines
- Quality gates: ESLint 0 warnings, tsc, Vitest, production build, Playwright

## Contents

| File | Use it for |
| --- | --- |
| `PHASE-TEMPLATE.md` | Structuring phase docs + the per-phase delivery report format |
| `firestore.rules.skeleton` | Deny-by-default rules: role checks via `users/{uid}`, ownership via uid fields, id-must-match-path on create, field-level update whitelists |
| `PITFALLS.md` | Hard-won failure modes (testing, Firebase, PWA, antd, sql.js) with fixes |
| Repo `scripts/` | `emulators.sh`, `seed-demo.mjs`, `gates.sh` — copy them verbatim |

## Non-negotiable habits (why this project stayed green for 8 phases)

1. **One commit per phase**, message starts with `Phase N:`.
2. **Gates before commit**: lint → tsc → vitest → build → playwright. `npm run gates`.
3. **Rules are tested against a live emulator** (`npm run test:rules` with
   `FIRESTORE_EMULATOR_HOST`); the suite clears emulator data on startup.
4. **No secrets in the repo.** Web config goes in `.env.local` (git-ignored via
   `*.local`). Never commit service-account JSON.
5. **Deny-by-default Firestore rules**; role data only writable server-side or by
   admins — the UI never sets `role` on an existing profile.
6. **Every phase doc ends with a report table**: files added/modified, tests
   (counts), gate results, decisions, next phase. See `PHASE-TEMPLATE.md`.
