# Firestore Data Model

Planned collections (Phases 4–7). Phase 0/1 stores everything locally; nothing in Firestore
yet. This document follows spec §18, §21, §26 and the phase planning docs at the repo root.

```text
users/{uid}                 profile + role
projects/{projectId}        ERD + metadata (owner: student)
assignments/{assignmentId}  lecturer-created tasks
submissions/{submissionId}  frozen student submissions (versioned)
sqliteSnapshots/{id}        snapshot metadata
sqliteSnapshots/{id}/chunks/{i}  gzipped SQLite bytes (chunked)
```

## users/{uid}

```json
{
  "displayName": "Andi",
  "email": "andi@student.example.ac.id",
  "role": "student",
  "createdAt": "..."
}
```

`role: "student" | "lecturer"` — assigned by setup/rules, never trusted from the client.

## projects/{projectId}

```json
{
  "ownerUid": "...",
  "courseId": "database-management",
  "assignmentId": null,
  "name": "Coffee Shop",
  "erd": { "schemaVersion": 1, "...": "ErdProject JSON" },
  "createdAt": "...",
  "updatedAt": "...",
  "lastSnapshotAt": "..."
}
```

The ERD stays in a single document while safely below Firestore's 1 MiB document limit (an ERD
is typically tens of KB).

## sqliteSnapshots/{snapshotId}

```json
{
  "snapshotId": "...",
  "ownerUid": "...",
  "projectId": "...",
  "fileName": "coffee-shop.sqlite",
  "compression": "gzip",
  "originalSize": 24576,
  "compressedSize": 8120,
  "chunkCount": 1,
  "checksum": "<64-char sha256 hex of the ORIGINAL uncompressed bytes>",
  "createdAt": "...",
  "kind": "manual"
}
```

Chunks: `sqliteSnapshots/{snapshotId}/chunks/{chunkIndex}` with `{ index, data: bytes }`
(450 KiB per chunk, never approaching the 1 MiB document limit — spec §21). The checksum
covers the original bytes; restore decompresses, recomputes SHA-256 and refuses to import
on mismatch. Retention: latest manual snapshot per project; submission snapshots kept.

## assignments/{assignmentId}

```json
{
  "assignmentId": "...",
  "courseId": "database-management",
  "title": "Marketplace Database",
  "description": "...",
  "instructions": "...",
  "learningObjectives": ["Model 1:N relationships"],
  "requirements": ["At least 4 tables"],
  "dueAt": "... (ISO) or null",
  "status": "draft | published | archived",
  "starterErd": { "...frozen ErdProject or null" },
  "starterSql": "CREATE TABLE ... / INSERT ...",
  "sampleData": "INSERT INTO ...",
  "createdByUid": "...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

Students read published assignments only (rules enforce; drafts never leak). Starting an
assignment deep-clones `starterErd` into the student's own local project — the template is
never edited (spec §24). Published assignments are archived, not deleted.

## submissions/{submissionId}

```json
{
  "studentUid": "...",
  "assignmentId": "...",
  "projectId": "...",
  "erd": { "...": "frozen ErdProject" },
  "snapshotId": "...",
  "version": 1,
  "submittedAt": "...",
  "status": "submitted | graded",
  "score": null,
  "feedback": null
}
```

A submission freezes a logical snapshot; students keep editing their project afterwards.
Resubmission creates a new version (spec §26). Grading fields are written only by lecturers
(enforced by rules).
