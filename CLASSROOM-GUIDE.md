# Classroom Guide — Database Learning Lab

A practical guide for running a class of ~30 Digital Business students on the free
Firebase plan.

## Roles

| Role | Capabilities |
| ---- | ------------ |
| Student | Local ERD projects, SQLite + SQL practice, cloud sync of their own projects, start assignments, submit work, see grades |
| Lecturer | Everything above, plus manage assignments, review submissions, grade |

Roles are set **server-side** in `users/{uid}.role` (Firestore console). The app never
trusts client-claimed roles.

## Lecturer setup (before week 1)

1. Follow [DEPLOYMENT.md](./DEPLOYMENT.md) once (Firebase project, rules, hosting).
2. Sign up in the app with your lecturer account, then set `users/{yourUid}.role = "lecturer"`
   in the Firestore console.
3. Create your course document (`courses/{courseId}`) — see DEPLOYMENT.md §4.
4. Create the first assignment: **Assignments → New assignment**:
   - title, course, due date, description, instructions;
   - learning objectives & requirements (one per line);
   - optional **starter ERD** — pick one of your local projects; students receive a
     *clone*, your original is never shared or editable by them;
   - optional **starter SQL** and **sample data SQL** (students can initialize their
     local database with one click);
   - save as draft → test it with a second (student) account → **Publish**.

## Student onboarding (10 minutes in class)

1. Students open the hosted URL (works on lab PCs — no installs).
2. **Sign up** with email/password.
3. Tour: create project → add table → Generate → SQL Playground → Save Database.
4. Assignments tab → Start → their own clone appears; Submit freezes a version.

## Weekly workflow

1. Lecturer publishes assignment (optionally with starter content).
2. Students start it, design/edit, submit (resubmission = new version, project stays editable).
3. Lecturer opens **Review** on the assignment:
   - inspect the frozen ERD + validation issues;
   - **Load submitted database into browser** to browse tables and run SQL against the
     *submitted* state (never the student's live project);
   - enter score (0–100) + feedback → Mark graded.
4. Students see score and feedback in the assignment drawer.

## Backup expectations

- **Local-first**: projects, SQL drafts and generated databases live in the browser
  (localStorage/IndexedDB). Students should use the same browser profile consistently;
  clearing site data deletes local work.
- **Cloud sync**: signed-in students' ERD projects sync to Firestore automatically
  (debounced). Pull happens on sign-in; the fresher document wins per field.
- **Snapshots**: SQLite bytes are uploaded **only** on explicit *Save Database* or on
  submission — never after every query. Snapshots are checksummed (SHA-256) and restored
  only after verification. Submission snapshots are kept permanently; manual snapshots
  keep the latest per project.
- Recommend students export important ERDs as JSON (Project export) at milestones.

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| "Assignments need cloud sync" | Firebase isn't configured on that deployment — expected in local mode |
| Sync shows `offline` | Network down — edits stay local and sync when back online |
| Sync shows `error` | Project failed validation — open it and fix blocking issues |
| Restore fails with integrity error | Snapshot corrupted in transit — the local DB is untouched; re-save a fresh snapshot |
| Snapshot blocked (> 5 MB) | Trim sample data or split the exercise; limits protect the free Firestore quota |
| Blank page after update | Use the reload prompt; the PWA never swaps versions mid-session |
| Old browser (no WebAssembly) | The app shows a clear "Browser not supported" notice |

## Supported browsers

Current Chrome, Edge, Firefox and Safari (desktop and tablet). WebAssembly is required
(SQLite in-browser). For phones, assignment browsing and review work; ERD editing is
possible but a larger screen is recommended (the app says so on small screens).

## Cost control (Spark plan)

- No Storage, no Cloud Functions, no paid analytics.
- Writes are debounced; snapshots are chunked (450 KiB), compressed and explicit.
- Developer quota diagnostics are visible in the browser console (`[quota]` lines).
- Monitor Firestore usage in the console weekly during the first month.
