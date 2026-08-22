# ADR-0003: ERD domain model kept independent from React Flow

- Status: accepted
- Date: 2026-08-22

## Context

The ERD must be persisted, validated, versioned, submitted to lecturers, and later transformed
into DDL. React Flow's node/edge shapes are view concerns that change across library versions
(spec §10 requires independence).

## Decision

Keep `ErdProject` (tables/columns/relationships/viewport) as the single source of truth,
validated by Zod. `flowAdapter.ts` derives React Flow nodes/edges from it; canvas events are
translated back into store actions. Canvas positions are stored in the domain model so layouts
survive persistence.

## Consequences

- ERD JSON is portable: localStorage today, Firestore tomorrow, file export/import anytime.
- Library upgrades or a future canvas replacement do not migrate user data.
- One extra mapping layer; selection/hover stay view-local and are re-merged on rebuild.
