# Database Learning Lab — Phase 8: Hardening and Release Readiness

## Objective

Prepare the application for real classroom use.

## Scope

Deliver:

- Firestore rules audit
- Emulator rules tests
- error boundaries
- corruption recovery
- accessibility pass
- responsive pass
- PWA offline validation
- browser compatibility review
- performance profiling
- quota safeguards
- documentation completion
- deployment instructions
- classroom readiness checklist

## Security Audit

Verify:

- no admin secrets in frontend
- no service account JSON
- role enforcement in Firestore rules
- project ownership enforcement
- assignment permissions
- submission immutability
- grading permissions
- snapshot ownership
- imported JSON validation
- snapshot size limits
- checksum verification

## Error Handling

Add clear handling for:

- Firebase offline
- Firestore permission denied
- SQLite init failure
- OPFS unavailable
- IndexedDB fallback
- corrupted snapshot
- unsupported browser
- PWA update
- quota-sensitive errors

## Accessibility

Check:

- keyboard navigation
- focus states
- dialogs
- labels
- contrast
- screen-reader names
- form errors
- table accessibility

## Responsive

Primary:

- desktop/laptop

Secondary:

- tablet

Mobile:

- assignment browsing supported
- complex ERD editing may recommend larger screen

## Performance

Profile:

- large ERD
- 100+ nodes if practical
- 500-row results
- schema explorer
- Monaco startup
- SQLite WASM load
- snapshot compression

## Quota Safeguards

Add developer diagnostics for:

- autosave frequency
- snapshot size
- snapshot chunk count
- Firestore write patterns

Do not add paid analytics.

## PWA

Validate:

- installability
- cached app shell
- offline re-open
- update notification
- no stale destructive caching of Firestore data

## Documentation

Finalize:

- README.md
- ARCHITECTURE.md
- FIREBASE.md
- ERD-SCHEMA.md
- SQLITE.md
- FIRESTORE-DATA-MODEL.md
- SECURITY.md
- TESTING.md
- ROADMAP.md
- DEPLOYMENT.md
- CLASSROOM-GUIDE.md

## Classroom Guide

Include:

- lecturer setup
- Firebase setup
- creating first course
- creating assignments
- student login
- backup expectations
- troubleshooting
- supported browsers

## Release Checklist

- lint
- typecheck
- unit tests
- integration tests
- Playwright critical flows
- production build
- Firebase emulator rules tests
- PWA audit
- manual smoke test

Critical flows:

- login
- create ERD
- generate DB
- run SQL
- cloud save
- restore
- assignment
- submission
- lecturer review
- grading

## Acceptance Criteria

The app can be used by an initial class of ~30 students without relying on paid Firebase services.

## Non-Goals

Do not add new major product features during hardening.

## Coding Agent Execution Prompt

Perform Phase 8 as a stabilization phase, not a redesign. Fix issues discovered during testing, but do not introduce unrelated features. Produce a release-readiness report with:

- passed checks
- failed checks
- fixes made
- remaining risks
- deployment steps
- classroom setup steps
