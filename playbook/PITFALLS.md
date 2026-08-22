# Pitfalls Catalog

Failure modes actually hit in this project, with the fix. Search this file
before debugging anything that smells familiar.

## Testing environment

| Symptom | Cause | Fix |
| --- | --- | --- |
| `localStorage is not defined` in Vitest node-env tests | jsdom default env vs `// @vitest-environment node` tests | `MemoryStorage` polyfill installed in `src/test/setup.ts` for both envs |
| `crypto.getRandomValues` throws on big buffers | WebCrypto caps one call at 65,536 bytes | Fill in slices ≤ 65536 |
| `getByText`/strict-mode violations in e2e | AntD renders hidden duplicates (both tab panes exist in DOM) | Scope to `.ant-tabs-tabpane-active` or use `.first()` deliberately |
| `waitForFunction` times out only in headless | Headless Chrome throttles `requestAnimationFrame` | `{ polling: 500 }` (interval polling), never rAF |
| Playwright vs wrong server | e2e must hit `vite preview` (:4173), not dev | Build first; webServer command runs preview |
| Rules tests pass once, fail next run | Firestore emulator KEEPS data between runs; stale docs turn `create` into `update` | `await env.clearFirestore()` in `beforeAll`; unique doc ids per test |
| `Unsupported field value: a custom Uint8Array object` | Firebase v11 rejects raw Uint8Array in writes | `Bytes.fromUint8Array(...)` |
| `PERMISSION_DENIED` on ops the rules should allow | Test fixture id ≠ document path (rules enforce `field == path id`) | Parameterize fixtures so ids match their paths — do NOT loosen rules |
| Rules tests skip silently in CI | Opt-in via `FIRESTORE_EMULATOR_HOST`; plain TCP probe is unsafe | TCP probe + the env var; CI without emulator stays green |

## Firebase

| Symptom | Cause | Fix |
| --- | --- | --- |
| firebase-tools refuses to start: "no longer supports Java version before 21" | CLI ≥ 15 needs Java ≥ 21; macOS default often 17 | `export PATH=/opt/homebrew/opt/openjdk@25/bin:$PATH` (scripts/emulators.sh auto-detects) |
| Firestore emulator port 8080 "in use" but no firebase process | Unrelated local services squat 8080 (e.g. FastAPI dev servers) | Override port via git-ignored `firebase.emulator.local.json` — never edit committed `firebase.json` |
| `nohup firebase emulators:start` dies silently with Java error | Shell env not inherited as expected | Use a background job runner / `exec` with exported PATH |
| App shows local mode although config exists | Env vars loaded at server START | Restart `vite` after editing env files |
| Emulator config leaks into build/tests/e2e | `.env.local` loads in EVERY Vite mode | Emulator config lives in `.env.emulator.local`, used only by `npm run dev:emulators` (`--mode emulator`); never in plain `.env.local` |
| Port probing picks the wrong service | Any HTTP 404 passes a naive probe | Ask the emulator Hub (`:4400/emulators`) for real ports, or verify a Firestore-shaped JSON error body |
| Emulator REST writes rejected | REST API applies security rules | Admin bypass: `Authorization: Bearer owner` (emulator only) |
| Firestore composite index required | Query combines multiple fields/`orderBy` | Design single-field queries only (this project's convention) |
| `@firebase/rules-unit-testing` version mismatch | firebase v11 needs rules-unit-testing v4 | `@firebase/rules-unit-testing@^4` |

## PWA / service worker

| Symptom | Cause | Fix |
| --- | --- | --- |
| Offline test fails: page not controlled by SW | `registerType: 'prompt'` takes control only on a LATER navigation | Bounded retry loop (≤5): reload until `navigator.serviceWorker.controller !== null` |
| SW never activates in test | Waiting for `reg.active` too early | Poll `reg?.active != null` with interval polling |
| Offline shell assertions flaky | Dev server serves SW differently | e2e runs against `vite preview` build, never dev |

## App architecture (React/AntD/sql.js)

| Symptom | Cause | Fix |
| --- | --- | --- |
| Infinite re-render from store selectors | `useSyncExternalStore` snapshot not referentially stable | Memoize snapshots; select primitives |
| Toolbar buttons unreachable under AntD Drawer | Drawer overlays the canvas toolbar | Close drawer or z-index layering by convention |
| sql.js `exec()` "no results" confusion | `exec()` returns `[]` for non-SELECT statements (that is correct) | Classify statements; use `exec` result shape, never throw on `[]` |
| Monaco editor bundle bloat / slow first paint | Full monaco import | Lazy-load; workers via Vite |
| SQLite file > few MB in Firestore | Doc limit 1 MiB | Chunking: 450 KiB chunks, gzip-if-smaller, SHA-256 of ORIGINAL bytes verified before restore; 3 MB warn / 5 MB block |

## macOS / shell

| Symptom | Cause | Fix |
| --- | --- | --- |
| `timeout: command not found` | macOS has no coreutils timeout by default | Use background jobs with tool-side timeouts, or `gtimeout` |
| Port in use confusion | `lsof -i :PORT` shows the real owner | Always identify before killing |
