# Database Learning Lab — Phase 5: SQLite Snapshots in Firestore

## Objective

Provide cloud backup/restore of small educational SQLite databases without Firebase Storage.

## Critical Constraint

Use Firestore chunking intentionally.

## Scope

Deliver:

- export SQLite bytes
- SHA-256 checksum
- gzip compression
- chunking
- Firestore snapshot metadata
- chunk upload
- restore
- integrity verification
- explicit Save Database
- snapshot retention cleanup
- size limits

## Snapshot Flow

```text
SQLite
  |
  v
Uint8Array
  |
  +--> SHA-256
  |
  v
gzip
  |
  v
chunk ~400-500 KiB
  |
  v
Firestore
```

## Firestore Structure

```text
sqliteSnapshots/{snapshotId}
sqliteSnapshots/{snapshotId}/chunks/{chunkIndex}
```

Metadata should include:

- ownerUid
- projectId
- fileName
- compression
- originalSize
- compressedSize
- chunkCount
- checksum
- createdAt
- kind

## Size Limits

Default:

- warn at 3 MB uncompressed
- block cloud snapshot above 5 MB uncompressed

Make configurable.

## Upload Rules

Snapshot upload occurs only on:

- Save Database
- assignment submission later
- explicit backup

Never after every SQL statement.

## Restore Rules

Restore must:

1. fetch metadata
2. fetch all chunks
3. order chunks
4. merge
5. decompress
6. verify SHA-256
7. import only if valid

If verification fails:

- preserve current local DB
- show corruption error
- do not partially import

## Retention

Do not keep unlimited manual snapshots.
Initial recommendation:

- keep latest manual snapshot per project
- keep submission snapshots

## Security

- authenticated writes only
- owner may write own snapshots
- enforce ownership in Firestore rules

## Quota Awareness

Minimize:

- chunk count
- repeated reads
- redundant versions

## Testing

Test:

- compress/decompress round trip
- chunk split/merge
- checksum verification
- corrupted chunk detection
- upload metadata
- restore round trip
- oversize rejection
- retention cleanup

## Acceptance Criteria

Student can:

- click Save Database
- create cloud snapshot
- remove local DB
- restore snapshot
- get identical schema/data
- see snapshot timestamp and size

## Non-Goals

Do not implement:

- external object storage
- assignments
- lecturer grading
- complex backup browser

## Coding Agent Execution Prompt

Implement only Phase 5. Treat quota efficiency and corruption safety as mandatory. Do not replace Firestore chunking with another provider. At completion provide standard report plus measured chunking behavior from tests.
