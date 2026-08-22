# Database Learning Lab — Coding Agent Master Specification

## 1. Project Goal

Build a **React Progressive Web App (PWA)** for undergraduate Digital Business students to learn database management through hands-on practice.

The application must allow students to:

1. Design an ERD visually.
2. Define tables, columns, primary keys, foreign keys, nullability, unique constraints, and relationships.
3. Generate a real SQLite schema from the ERD.
4. Run the generated database locally in the browser.
5. Insert, update, delete, and query data using SQL.
6. View query results in a student-friendly table.
7. Save project state and ERD to Firebase.
8. Save/restore SQLite database snapshots without requiring Firebase Storage.
9. Submit assignments to the lecturer.
10. Allow lecturers to review ERD designs and SQLite databases.

This tool is intended for a university course named approximately:

> Manajemen Database / Database Management for Digital Business

Primary target:

- ~30 students initially.
- Should remain usable for larger cohorts later.
- Cost target for the first version: **Rp0 / Firebase Spark plan**.
- Do not require credit cards or paid cloud services.

---

# 2. Critical Architecture Constraints

These requirements are mandatory.

## 2.1 Firebase Spark Only

The project must work on the Firebase **Spark/free plan**.

Allowed Firebase services:

- Firebase Authentication
- Cloud Firestore
- Firebase Hosting

Do NOT depend on:

- Firebase Cloud Storage
- Cloud Functions requiring Blaze
- Paid Firebase extensions
- Any infrastructure requiring a credit card
- Supabase
- Cloudflare R2
- External backend services unless explicitly added in a future phase

The current version must be deployable using only free Firebase services plus browser APIs.

---

## 2.2 Firebase Authentication Is the Single Identity Provider

Use Firebase Authentication.

Preferred login methods:

1. Google Sign-In
2. Email/password as optional fallback

Do not introduce another authentication system.

Firebase `uid` is the canonical user identifier throughout the system.

Example:

```text
Firebase Auth
    |
    +-- uid
          |
          +-- student profile
          +-- projects
          +-- assignments
          +-- submissions
```

---

# 3. Local-First Architecture

The core database engine must run locally in the browser.

Architecture:

```text
React PWA
   |
   +-- ERD Designer
   |
   +-- SQLite WASM
   |
   +-- OPFS / IndexedDB persistence
   |
   +-- SQL Editor
   |
   +-- Query Result Viewer
   |
   +-- Firebase synchronization
```

SQLite query execution must NOT happen on Firebase.

The student should still be able to:

- edit ERD
- generate database
- create tables
- insert data
- query data
- continue exercises

even when temporarily offline.

Firebase is used for:

- authentication
- ERD persistence
- project metadata
- assignments
- submissions
- SQLite cloud snapshot storage using Firestore chunking

---

# 4. Recommended Technology Stack

Use the following unless there is a strong technical reason not to.

## Frontend

- React
- TypeScript
- Vite
- React Router
- PWA plugin for Vite
- Ant Design for general UI
- React Flow / `@xyflow/react` for ERD canvas
- Monaco Editor for SQL editing
- Zustand for editor/application state
- Zod for runtime validation
- TanStack Query where useful for Firebase data synchronization

## Database

- SQLite compiled to WebAssembly
- Prefer official SQLite WASM when practical
- Use OPFS when supported
- Provide IndexedDB fallback when required

Do NOT use `sql.js` as the first choice if official SQLite WASM + OPFS is practical.

## Firebase

- Firebase Auth
- Firestore
- Firebase Hosting

## Testing

- Vitest
- React Testing Library
- Playwright for important end-to-end workflows

---

# 5. Main Application Roles

There are two application roles.

## Student

Capabilities:

- login
- view assigned tasks
- create projects
- edit ERD
- generate SQLite
- manage test data
- run SQL queries
- save project
- restore previous database
- submit assignment
- view submission status

## Lecturer

Capabilities:

- login
- create assignment
- edit assignment
- publish/unpublish assignment
- view students
- view student projects
- inspect submitted ERD
- open student's SQLite snapshot
- run SQL against a submitted database locally
- record score
- add feedback

Role must be stored in Firestore.

Example:

```text
users/{uid}

{
  displayName,
  email,
  role: "student" | "lecturer"
}
```

Never trust the role supplied by the browser without checking Firestore rules.

---

# 6. Main Application Modules

Create the project with clear modular separation.

Suggested structure:

```text
src/
  app/
  components/
  features/
    auth/
    courses/
    assignments/
    projects/
    erd/
    sqlite/
    sql-editor/
    submissions/
    lecturer/
  lib/
    firebase/
    sqlite/
    persistence/
    validation/
  stores/
  hooks/
  types/
  utils/
```

Avoid placing all logic inside page components.

---

# 7. ERD Designer

The ERD Designer is a core feature.

Use React Flow / `@xyflow/react`.

Students must be able to:

- add table
- rename table
- move table
- delete table
- duplicate table
- add column
- rename column
- choose column datatype
- set primary key
- set foreign key
- set nullable
- set unique
- optionally define default value
- define relationship
- remove relationship
- zoom
- pan
- fit diagram
- undo
- redo

Recommended basic data types:

```text
INTEGER
REAL
TEXT
BLOB
BOOLEAN
DATE
DATETIME
NUMERIC
```

Since SQLite uses dynamic typing, the UI should explain that these are teaching-oriented SQL types and will be mapped appropriately to SQLite affinities.

---

# 8. Relationship Support

Initial supported relationship types:

- one-to-one
- one-to-many
- many-to-one
- many-to-many

For many-to-many:

The application should teach that an associative/junction table is required.

Do not silently create a hidden junction table without explaining it.

Preferred UX:

```text
Student connects:
STUDENT <----> COURSE

System:
"Many-to-many relationships require a junction table."

Suggested:
STUDENT_COURSE
- student_id
- course_id
```

Allow the student to accept or manually design the junction table.

---

# 9. ERD Validation

Implement a validation engine.

Initial validations:

- table must have a name
- table names must be unique
- column names within a table must be unique
- each table should have a primary key
- referenced foreign-key table must exist
- referenced foreign-key column must exist
- FK and referenced column types should be compatible
- duplicate relationships should be detected
- orphan relationships should be detected
- invalid SQL identifiers should be detected
- empty tables should show warning
- multiple primary-key columns should be interpreted as composite key if intentionally selected

Validation should produce:

```ts
type ValidationIssue = {
  id: string
  severity: 'error' | 'warning' | 'info'
  entityType: 'table' | 'column' | 'relationship'
  entityId: string
  code: string
  message: string
}
```

Do not block all work because of warnings.

Only true schema errors should prevent database generation.

---

# 10. ERD Data Model

Create a versioned ERD schema.

Example:

```ts
interface ErdProject {
  schemaVersion: number
  projectId: string
  name: string
  tables: ErdTable[]
  relationships: ErdRelationship[]
  viewport?: {
    x: number
    y: number
    zoom: number
  }
}

interface ErdTable {
  id: string
  name: string
  position: {
    x: number
    y: number
  }
  columns: ErdColumn[]
}

interface ErdColumn {
  id: string
  name: string
  type: string
  primaryKey: boolean
  nullable: boolean
  unique: boolean
  defaultValue?: string
}

interface ErdRelationship {
  id: string
  sourceTableId: string
  sourceColumnId: string
  targetTableId: string
  targetColumnId: string
  cardinality: 'one-to-one' | 'one-to-many' | 'many-to-one'
}
```

Many-to-many should normally be resolved through a junction table rather than saved as an executable FK relationship.

Keep the ERD JSON independent from React Flow's internal schema where practical.

Use adapters between domain state and canvas state.

---

# 11. SQL Schema Generator

Create a deterministic schema generator.

Input:

```text
ERD domain model
```

Output:

```text
SQLite CREATE TABLE statements
```

Example:

```sql
CREATE TABLE customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE
);

CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    total REAL NOT NULL,
    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
);
```

Requirements:

- deterministic output
- properly escape identifiers
- preserve FK relationships
- support composite keys when required
- output human-readable formatted SQL
- show generated DDL before execution
- allow student to copy SQL

Do not generate database directly without allowing the student to inspect the DDL.

The teaching purpose is important.

---

# 12. SQLite Browser Runtime

Implement a SQLite service abstraction.

Example API:

```ts
interface SqliteDatabaseService {
  create(projectId: string): Promise<void>
  open(projectId: string): Promise<void>
  execute(sql: string): Promise<QueryExecutionResult>
  exportDatabase(): Promise<Uint8Array>
  importDatabase(bytes: Uint8Array): Promise<void>
  close(): Promise<void>
  reset(): Promise<void>
}
```

Do not expose raw SQLite objects throughout the React app.

Encapsulate SQLite-specific implementation in a dedicated service layer.

---

# 13. Local SQLite Persistence

Preferred storage:

1. OPFS
2. IndexedDB fallback where necessary

Goal:

Student refreshes the browser and the database remains available.

Project metadata should remember the locally stored SQLite database.

Example:

```text
local project
   |
   +-- projectId
   +-- SQLite database
   +-- last local save timestamp
```

Firebase synchronization must not be required for every SQL statement.

---

# 14. SQL Playground

Create a SQL Playground similar to a lightweight database IDE.

Layout suggestion:

```text
+--------------------------------------------------+
| Project: Coffee Shop                             |
+------------------------+-------------------------+
| Tables                 | SQL Editor              |
|                        |                         |
| customers              | SELECT *               |
| orders                 | FROM customers;         |
| products               |                         |
|                        | [ Run ]                 |
+------------------------+-------------------------+
| Query Result                                     |
|                                                  |
| id | name | city                                 |
| ...                                              |
+--------------------------------------------------+
```

Capabilities:

- SQL editor
- execute selected SQL
- execute entire editor
- keyboard shortcut
- clear editor
- SQL history
- query execution time
- display affected row count
- display errors
- paginated/tabular query result
- copy result
- optional CSV export

Initial SQL commands should support everything supported by SQLite.

Do not artificially restrict SQL commands in the local student database.

---

# 15. Student-Friendly Query Errors

Raw SQLite errors may be confusing.

Show:

1. original SQLite error
2. optional educational explanation

Example:

```text
SQLite:
no such column: customer_name

Hint:
The column "customer_name" could not be found.
Check the table schema or column spelling.
```

Do not use an LLM for this in Phase 1.

Use rule-based mapping for common SQLite errors.

---

# 16. Schema Explorer

Provide a schema explorer showing:

- tables
- columns
- primary keys
- foreign keys
- indexes
- row count

Clicking a table should allow:

- browse rows
- view schema
- show CREATE TABLE statement

---

# 17. Visual Data Editor

Students in Digital Business may initially find SQL difficult.

Provide a simple table data editor:

- add row
- edit row
- delete row
- pagination
- sort
- filter

Changes must translate into actual SQLite statements.

The application should optionally show the generated SQL.

Example:

```text
Visual action:
Add Customer

Generated SQL:
INSERT INTO customers (name, city)
VALUES ('Andi', 'Bandung');
```

This supports learning SQL progressively.

---

# 18. Firestore Project Persistence

ERD should be persisted to Firestore.

Suggested model:

```text
users/{uid}

courses/{courseId}

assignments/{assignmentId}

projects/{projectId}

submissions/{submissionId}
```

Example project document:

```json
{
  "ownerUid": "firebase-user-id",
  "courseId": "database-management",
  "assignmentId": null,
  "name": "Coffee Shop",
  "erd": {},
  "createdAt": "...",
  "updatedAt": "...",
  "lastSnapshotAt": "..."
}
```

Keep ERD in a single project document while it remains safely below Firestore document limits.

---

# 19. Autosave Strategy

Do NOT write to Firestore on every:

- drag event
- keypress
- mouse movement
- node resize

Use local-first state.

Recommended flow:

```text
student edits
      |
      +--> Zustand
      |
      +--> local persistence
      |
      +--> mark dirty
             |
             +--> debounce
                    |
                    +--> Firestore save
```

Suggested debounce:

- 5-10 seconds after meaningful change
- flush on explicit Save
- flush on important navigation
- avoid excessive Firestore writes

Always display save status:

```text
Saved
Saving...
Unsaved changes
Offline
```

---

# 20. SQLite Snapshot Storage Without Firebase Storage

Firebase Spark does not provide Cloud Storage for this project.

Therefore implement SQLite cloud snapshots using **Firestore chunking**.

This is intentional for Phase 1.

## Snapshot flow

```text
SQLite database
      |
      +-- export Uint8Array
      |
      +-- gzip compression
      |
      +-- split into chunks
      |
      +-- Firestore
```

Use the browser Compression Streams API when available.

Provide fallback when necessary.

---

# 21. Snapshot Structure

Suggested Firestore structure:

```text
sqliteSnapshots/{snapshotId}
  ownerUid
  projectId
  fileName
  contentType
  compression
  originalSize
  compressedSize
  chunkCount
  checksum
  createdAt

sqliteSnapshots/{snapshotId}/chunks/{chunkIndex}
  data
```

Do NOT approach Firestore's maximum document size.

Use conservative chunk sizes.

Recommended target:

```text
~400-500 KiB payload per chunk
```

Account for Firestore serialization overhead.

Do not use 1 MiB raw chunks.

---

# 22. Snapshot Integrity

Every snapshot must include a checksum.

Preferred:

- SHA-256

Flow:

```text
export SQLite
      |
      +-- SHA-256
      |
      +-- compress
      |
      +-- chunk
```

Restore:

```text
load chunks
      |
      +-- merge
      |
      +-- decompress
      |
      +-- SHA-256 verify
      |
      +-- import SQLite
```

If checksum fails:

- do not import
- show clear error
- keep local database intact

---

# 23. Snapshot Policy

Do NOT upload a SQLite snapshot after every SQL statement.

Cloud snapshots are checkpoints.

Upload when:

- student clicks Save Database
- student submits assignment
- optional periodic backup after significant idle time
- lecturer explicitly requests snapshot

Recommended initial version:

- explicit save only
- automatic snapshot during submission

This protects Firestore quota.

---

# 24. Snapshot Size Limit

The application is intended for educational datasets, not production-size databases.

Set a configurable default database snapshot limit.

Recommended initial limit:

```text
5 MB uncompressed SQLite database
```

Warn at:

```text
3 MB
```

Explain to students that course exercises should use small datasets.

Make the limit configurable in application settings.

---

# 25. Assignments

Lecturer should be able to create an assignment with:

- title
- description
- instructions
- due date
- status
- starter ERD optional
- starter SQL optional
- sample data optional
- expected learning objective

Example:

```text
Assignment:
Marketplace Database

Objective:
Model customers, products, orders and order details.

Requirements:
- minimum 4 tables
- primary key on every table
- at least 3 foreign-key relationships
- query total spending by customer
```

---

# 26. Assignment Submission

Student submission must contain:

```text
submission
|
+-- student UID
+-- assignment ID
+-- project ID
+-- ERD snapshot
+-- SQLite snapshot ID
+-- submittedAt
+-- status
```

Submission should freeze a logical snapshot of the student's work.

Student may continue editing the project after submission without modifying the submitted version.

Support future resubmission by creating a new submission version.

---

# 27. Lecturer Review

Lecturer dashboard:

```text
Course
   |
   +-- Assignment
          |
          +-- Student A
          |      +-- ERD
          |      +-- Database
          |      +-- SQL
          |      +-- Score
          |      +-- Feedback
          |
          +-- Student B
```

Lecturer should be able to:

- inspect ERD
- see validation warnings
- download/restore submitted SQLite
- open database inside browser
- browse tables
- execute SQL locally
- enter score
- enter feedback

Do not create a server-side SQLite runtime.

Review should also use SQLite WASM in the lecturer's browser.

---

# 28. Firestore Security Rules

Security rules are a mandatory deliverable.

Principles:

Students can:

- read their own private project data
- write their own project data
- submit their own assignments

Lecturers can:

- read projects/submissions for their course
- create/edit assignments
- grade submissions

Public SQLite snapshot read access is acceptable for this educational tool if necessary, but write access must never be anonymous.

Prefer authenticated reads anyway unless public access materially simplifies the first version.

Do not trust document fields alone for authorization when they can be modified by the client.

Add rules tests using Firebase Emulator Suite where practical.

---

# 29. Offline Behavior

The PWA should be useful during temporary internet loss.

Offline-capable:

- launch previously cached application
- edit ERD
- manipulate local SQLite
- run queries
- browse data

Requires connection:

- login if no cached auth session
- Firestore synchronization
- assignment refresh
- submission
- cloud SQLite snapshot

Show clear offline state.

Do not silently discard unsynchronized work.

---

# 30. PWA Requirements

Implement:

- installable manifest
- service worker
- application shell caching
- icons placeholders
- offline fallback
- update notification

Do not aggressively cache Firestore/API responses in service worker.

Let Firebase SDK manage its data behavior.

---

# 31. UX Direction

Audience:

- undergraduate Digital Business students
- not primarily computer science students

Therefore prioritize:

- visual clarity
- guided interactions
- educational explanations
- progressive disclosure
- friendly database terminology

Avoid making the interface look like a professional DBA tool full of dense controls.

Desktop/laptop is the primary editing experience.

PWA must still be responsive.

For small mobile screens:

- browsing assignments is supported
- query editor may be usable
- complex ERD editing can display a recommendation to use tablet/desktop

---

# 32. Suggested Main Navigation

Student:

```text
Dashboard
Assignments
My Projects
Database Lab
Profile
```

Lecturer:

```text
Dashboard
Courses
Assignments
Students
Submissions
```

---

# 33. Student Dashboard

Show:

- current course
- pending assignments
- due dates
- recent projects
- last edited project
- submission statuses

Keep it simple.

---

# 34. Learning Modes

Design the architecture to support two modes later.

## Guided Mode

For beginners.

Features may include:

- visual data editor
- hints
- generated SQL
- relationship explanations
- guided exercises

## Free Lab Mode

For advanced sessions.

Students directly use:

- ERD
- SQL editor
- SQLite
- schema explorer

Do not fully implement all future guided lessons in the first phase unless needed.

Make the architecture extensible.

---

# 35. Demo Dataset

Include at least one built-in demo.

Recommended:

## Coffee Shop

Tables:

```text
customers
products
orders
order_items
```

Sample queries:

```sql
SELECT * FROM products;

SELECT
    c.name,
    SUM(oi.quantity * p.price) AS total_spending
FROM customers c
JOIN orders o
    ON o.customer_id = c.id
JOIN order_items oi
    ON oi.order_id = o.id
JOIN products p
    ON p.id = oi.product_id
GROUP BY c.id, c.name
ORDER BY total_spending DESC;
```

The app should be usable immediately without Firebase after loading the demo.

---

# 36. SQL Learning Examples

Provide non-invasive examples for:

- SELECT
- WHERE
- ORDER BY
- LIMIT
- INSERT
- UPDATE
- DELETE
- JOIN
- GROUP BY
- HAVING
- aggregate functions
- subquery

Examples should not automatically modify student work unless explicitly run.

---

# 37. Future Auto-Grading Architecture

Do NOT overbuild Phase 1, but design for future support.

Potential automatic checks:

```text
Does table X exist?
Does column Y exist?
Does FK exist?
Does query return expected columns?
Does query return expected result?
Does student use JOIN?
```

Define an extensible rule shape.

Example:

```ts
type GradingRule = TableExistsRule | ColumnExistsRule | RelationshipExistsRule | QueryResultRule
```

Implementation of full auto-grading may be deferred.

---

# 38. Important Non-Goals for Initial Version

Do NOT add unless explicitly requested:

- AI assistant
- LLM API
- PostgreSQL server
- MySQL server
- Supabase
- Cloudflare
- external API backend
- paid services
- real-time multi-user ERD collaboration
- production-scale datasets
- advanced DB administration
- database replication
- WebSocket backend

Keep the first production version focused.

---

# 39. Security Requirements

Even though this is an educational tool:

- never expose Firebase admin credentials
- never store service-account JSON in frontend
- never trust client role flags
- sanitize user-visible text
- validate imported ERD JSON
- validate uploaded/restored SQLite snapshot metadata
- set reasonable size limits
- verify snapshot checksum
- avoid executing SQL outside isolated local SQLite
- do not build arbitrary server-side SQL execution

Firebase public web config is allowed in frontend as intended by Firebase, but security must be enforced using Auth + Firestore Rules.

---

# 40. Import / Export

Support:

## ERD

- Export ERD JSON
- Import ERD JSON

## SQL

- Export schema as `.sql`

## SQLite

- Export `.sqlite`
- Import `.sqlite`

All export operations should happen locally in browser.

Do not require cloud storage.

---

# 41. Database Reset

Provide:

```text
Reset Database
```

But require clear confirmation.

Possible choices:

```text
Rebuild from current ERD
Clear all data
Cancel
```

Do not accidentally destroy local student work.

Before destructive operations, optionally offer:

```text
Download Backup
```

---

# 42. Schema Migration Behavior

Changing ERD after data exists is complicated.

Initial implementation should NOT pretend all schema changes are automatically safe.

When ERD changes after SQLite has data:

show:

```text
The ERD differs from the current database schema.

Options:
1. Rebuild database from ERD
2. Keep current database
3. View generated migration SQL
```

For Phase 1, full migration automation is optional.

Prefer correctness over magical migrations.

---

# 43. Development Phases

Implement incrementally.

---

## Phase 0 — Project Foundation

Deliver:

- React + TypeScript + Vite
- Ant Design
- React Router
- Zustand
- PWA setup
- linting
- formatting
- Vitest
- Playwright
- Firebase configuration scaffold
- `.env.example`
- clean project structure

Acceptance:

- app runs locally
- PWA builds successfully
- tests run successfully

---

## Phase 1 — Local ERD Designer

Deliver:

- ERD canvas
- table nodes
- column editing
- primary key
- FK relationships
- ERD validation
- undo/redo
- local persistence

No Firebase dependency is required for this phase.

Acceptance:

Student can create a complete ERD and reload browser without losing it.

---

## Phase 2 — SQLite Generation

Deliver:

- ERD-to-SQL generator
- DDL preview
- SQLite WASM runtime
- generate/rebuild database
- schema explorer

Acceptance:

Student creates ERD and generates a working SQLite database.

---

## Phase 3 — SQL Playground

Deliver:

- Monaco SQL editor
- execute SQL
- results table
- execution errors
- query history
- table browser
- visual data editor

Acceptance:

Student can perform a complete CRUD + SELECT/JOIN exercise locally.

---

## Phase 4 — Firebase Auth + Projects

Deliver:

- Firebase Auth
- user profile
- role model
- save ERD to Firestore
- load projects
- autosave strategy
- online/offline status

Acceptance:

Student can log in and access ERD project from another browser after synchronization.

---

## Phase 5 — SQLite Firestore Snapshots

Deliver:

- export database bytes
- compression
- chunking
- SHA-256 checksum
- Firestore upload
- Firestore restore
- project snapshot metadata
- explicit Save Database workflow

Acceptance:

Student can save SQLite snapshot, clear local DB, restore cloud snapshot, and get identical database contents.

---

## Phase 6 — Assignments

Deliver:

- lecturer assignment CRUD
- student assignment list
- project created from assignment
- optional starter ERD/data
- due date display

Acceptance:

Lecturer publishes assignment and student can start it.

---

## Phase 7 — Submission + Lecturer Review

Deliver:

- submission snapshot
- submission version
- lecturer submissions table
- ERD viewer
- SQLite restore in lecturer browser
- scoring
- feedback

Acceptance:

Lecturer can inspect exactly what the student submitted.

---

## Phase 8 — Hardening

Deliver:

- Firestore rules
- rules tests
- error boundaries
- database size limits
- snapshot corruption handling
- accessibility pass
- responsive pass
- PWA offline tests
- documentation

---

# 44. Repository Documentation

Maintain these files:

```text
README.md
ARCHITECTURE.md
FIREBASE.md
ERD-SCHEMA.md
SQLITE.md
FIRESTORE-DATA-MODEL.md
SECURITY.md
TESTING.md
ROADMAP.md
```

Also maintain:

```text
docs/decisions/
```

for architecture decision records.

Important design decisions must be documented.

---

# 45. Coding Agent Rules

The coding agent must follow these rules.

1. Read the repository before modifying files.
2. Preserve working functionality.
3. Do not rewrite unrelated code.
4. Make small coherent commits/changes.
5. Keep TypeScript strict.
6. Avoid `any` unless unavoidable and documented.
7. Do not add unnecessary dependencies.
8. Do not introduce paid services.
9. Do not switch authentication provider.
10. Do not use Firebase Storage.
11. Do not introduce a backend server without explicit approval.
12. Add tests for important business logic.
13. Update documentation after architectural changes.
14. Run lint, typecheck, test, and build before declaring a phase complete.
15. If implementation differs from this document, explain the technical reason in documentation.

---

# 46. Quality Gates

Before declaring work complete, run:

```text
lint
typecheck
unit tests
integration tests where available
production build
```

For important flows also verify manually or with Playwright:

```text
login
create ERD
generate database
run SQL
save project
save SQLite snapshot
restore SQLite snapshot
submit assignment
lecturer review
```

---

# 47. Performance Expectations

Target devices:

- typical student laptop
- Chrome/Edge/Firefox/Safari where practical
- modern Android tablet/browser as secondary

Avoid rendering entire huge datasets.

Query result viewer should paginate or limit large outputs.

Default query result display limit can be:

```text
500 rows
```

Do not alter the actual SQL result unless clearly communicated.

---

# 48. Firestore Cost/Quota Awareness

The application must remain efficient on Firebase Spark.

Avoid:

- excessive document listeners
- write-per-keystroke
- write-per-drag-frame
- repeatedly downloading snapshots
- storing redundant ERD history

Prefer:

- local caching
- debounced saves
- explicit snapshots
- compact documents
- pagination
- one-time reads where appropriate

Add comments/documentation where quota-sensitive behavior exists.

---

# 49. Firestore Snapshot Cleanup

Support deletion of older snapshots.

Recommended initial policy:

Keep:

```text
latest manual save
latest submission snapshots
```

Do not automatically accumulate unlimited backups.

Future configurable retention may be added.

---

# 50. Educational UX Principle

Never hide important database concepts merely to make the UI easier.

Examples:

Bad:

```text
Student creates relationship
System silently changes database.
```

Better:

```text
Student creates relationship
System shows resulting FOREIGN KEY.
```

Bad:

```text
Visual row editor modifies data invisibly.
```

Better:

```text
Visual row editor performs operation
and optionally shows generated INSERT/UPDATE/DELETE.
```

The product is a **learning tool**, not just a database builder.

---

# 51. Expected First Complete User Flow

The following workflow must ultimately work.

```text
Student logs in
      |
      v
opens assignment
      |
      v
creates new project
      |
      v
draws ERD
      |
      v
defines PK and FK
      |
      v
views validation
      |
      v
generates CREATE TABLE SQL
      |
      v
creates SQLite database
      |
      v
adds sample data
      |
      v
runs SELECT / JOIN / GROUP BY
      |
      v
saves project
      |
      v
uploads SQLite snapshot to Firestore
      |
      v
submits assignment
```

Lecturer:

```text
Lecturer logs in
      |
      v
opens assignment submissions
      |
      v
selects student
      |
      +--> inspect ERD
      |
      +--> inspect database
      |
      +--> run SQL locally
      |
      +--> grade
      |
      +--> feedback
```

---

# 52. First Implementation Task for the Coding Agent

Start with **Phase 0 and Phase 1 only**.

Do not attempt the whole application in one pass.

First:

1. Inspect existing repository if present.
2. Create/update architecture documentation.
3. Establish project structure.
4. Implement domain models for ERD.
5. Implement React Flow ERD designer.
6. Implement table/column editor.
7. Implement ERD validation.
8. Implement undo/redo.
9. Implement local persistence.
10. Add unit tests.
11. Ensure production build succeeds.

At the end provide a report containing:

```text
Implemented
Files changed
Tests added
Commands run
Known limitations
Recommended next phase
```

Do not begin Phase 2 automatically unless explicitly instructed.

---

# 53. Definition of Done for Phase 1

Phase 1 is complete when a student can:

- open the app
- create an ERD project
- add multiple tables
- add/edit/remove columns
- set column types
- designate PK
- create FK relationships
- move tables visually
- see validation errors/warnings
- undo/redo
- refresh browser
- continue with the same local ERD

And:

- TypeScript compiles without errors
- lint passes
- unit tests pass
- production build passes
- no Firebase Storage dependency exists
- no paid cloud dependency exists

---

# 54. Product Name

Use the working name:

**Database Learning Lab**

The name can be changed later.

Do not spend significant time on branding in the initial phases.

Focus on learning workflows and technical correctness.
