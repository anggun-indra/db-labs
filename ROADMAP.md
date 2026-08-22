# Roadmap

Phase plans from spec §43. Detailed per-phase planning documents live at the repo root
(`phase-*.md`). Status as of Phase 1 completion.

| Phase | Scope                                          | Status  | Planning doc                            |
| ----- | ---------------------------------------------- | ------- | --------------------------------------- |
| 0     | Project foundation                             | ✅ done | spec §43                                |
| 1     | Local ERD designer                             | ✅ done | spec §43                                |
| 2     | SQLite generation (DDL + WASM runtime)         | ⏳ next | `phase-2-sqlite-generation.md`          |
| 3     | SQL Playground                                 | planned | `phase-3-sql-playground.md`             |
| 4     | Firebase Auth + project sync                   | planned | `phase-4-firebase-auth-projects.md`     |
| 5     | SQLite snapshots via Firestore chunking        | planned | `phase-5-firestore-sqlite-snapshots.md` |
| 6     | Courses & assignments                          | planned | `phase-6-assignments.md`                |
| 7     | Submission + lecturer review                   | planned | `phase-7-submission-lecturer-review.md` |
| 8     | Hardening (rules tests, a11y, PWA tests, docs) | planned | spec §43                                |

## What exists today (Phase 0+1)

- React 18 + TypeScript strict + Vite 5 PWA (installable, offline app shell, update prompt)
- Ant Design app shell with student navigation (Dashboard, My Projects)
- Project CRUD stored locally (Zod-validated JSON behind an async repository interface)
- React Flow ERD canvas: table nodes with per-column handles, drag/zoom/pan/fit/minimap
- Table/column inspector: name, type, PK, NOT NULL, UNIQUE, default value, duplicate/delete
- Relationship creation dialog with cardinality choice and explicit FK placement explanation
- Validation engine (errors/warnings/info) with live panel
- Undo/redo with typing coalescing and drag-gesture handling; keyboard shortcuts
- Autosave with debounce, save-status display, beforeunload flush
- Firebase config scaffold (local mode until configured); no Firebase runtime dependency yet

## Explicit non-goals (spec §38)

AI assistants/LLM APIs, PostgreSQL/MySQL servers, Supabase/Cloudflare, external backends,
paid services, realtime multi-user ERD collaboration, production-scale datasets, DB
administration features, replication, WebSocket backends.

## Definition of done per phase

See spec §53 (Phase 1) and the acceptance criteria in each `phase-*.md`. Every phase ends
with lint + typecheck + tests + production build green, plus the standard report
(Implemented / Files changed / Tests added / Commands run / Known limitations / Recommended
next phase).
