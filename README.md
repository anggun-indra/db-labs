# Database Learning Lab

A **local-first React PWA** for undergraduate Digital Business students to learn database
management through hands-on practice: design an ERD visually, generate a real SQLite database,
practice SQL in the browser, and (in later phases) submit work to a lecturer via Firebase.

Course: **Manajemen Database / Database Management for Digital Business**.

> Master specification: [`database-learning-lab-agent-spec.md`](./database-learning-lab-agent-spec.md)

## Current status

| Phase | Scope                                 | Status  |
| ----- | ------------------------------------- | ------- |
| 0     | Project foundation                    | ✅ done |
| 1     | Local ERD designer                    | ✅ done |
| 2     | SQLite generation (ERD → DDL → WASM)  | ✅ done |
| 3     | SQL Playground                        | ✅ done |
| 4     | Firebase Auth + Firestore projects    | ✅ done |
| 5     | SQLite Firestore snapshots (chunking) | ✅ done |
| 6     | Assignments                           | ✅ done |
| 7     | Submission + lecturer review          | ✅ done |
| 8     | Hardening (rules, a11y, PWA tests)    | ✅ done |

## Quick start

```bash
npm install
npm run dev        # local development server
```

The app runs fully **without Firebase configured** (local mode). To enable cloud features in
later phases, copy `.env.example` to `.env` and fill in your Firebase web config (Spark plan
only — see [FIREBASE.md](./FIREBASE.md)).

## Scripts

| Command             | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Vite dev server                                |
| `npm run build`     | Typecheck + production build + PWA generation  |
| `npm run preview`   | Serve the production build locally             |
| `npm run lint`      | ESLint (flat config, strict TypeScript rules)  |
| `npm run typecheck` | `tsc -b --noEmit` (strict mode)                |
| `npm run test`      | Vitest unit/component tests (jsdom)            |
| `npm run test:e2e`  | Playwright end-to-end tests (production build) |
| `npm run format`    | Prettier write                                 |
| `npm run icons`     | Regenerate placeholder PWA icons               |

## Technology stack

- **React 18 + TypeScript (strict) + Vite 5**
- **@xyflow/react** — ERD canvas
- **Ant Design 5** — UI kit
- **Zustand** — editor state with undo/redo
- **Zod** — runtime validation of ERD JSON (persistence + future imports)
- **vite-plugin-pwa** — installable PWA, offline app shell
- **Firebase** (scaffolded) — Auth + Firestore + Hosting only, Spark plan
- **Vitest + React Testing Library** — unit/component tests
- **Playwright** — end-to-end tests

## Key design rules (from the spec)

- Firebase **Spark plan only**; never Cloud Storage, never paid services.
- SQLite execution is always **in the browser** (WASM), never on Firebase.
- Firebase Auth is the single identity provider; `uid` is canonical.
- Educational UX: never hide database concepts — show generated FKs/SQL.
- See [ARCHITECTURE.md](./ARCHITECTURE.md) and [docs/decisions/](./docs/decisions/).

## Documentation map

- [ARCHITECTURE.md](./ARCHITECTURE.md) — modules, data flow, state design
- [ERD-SCHEMA.md](./ERD-SCHEMA.md) — versioned ERD domain model
- [FIREBASE.md](./FIREBASE.md) — Firebase usage & Spark constraints
- [FIRESTORE-DATA-MODEL.md](./FIRESTORE-DATA-MODEL.md) — planned collections
- [SQLITE.md](./SQLITE.md) — SQLite WASM runtime plan (Phase 2)
- [SECURITY.md](./SECURITY.md) — security principles
- [TESTING.md](./TESTING.md) — test strategy
- [ROADMAP.md](./ROADMAP.md) — phase roadmap
- [DEPLOYMENT.md](./DEPLOYMENT.md) — release steps for the Firebase Spark plan
- [CLASSROOM-GUIDE.md](./CLASSROOM-GUIDE.md) — lecturer & student classroom workflow
- [docs/decisions/](./docs/decisions/) — architecture decision records
