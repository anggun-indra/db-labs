# Phase N: <title>

<!-- One file per phase in docs/phase-N-*.md. Keep the skeleton identical across
     phases so reviews and diffs stay predictable. -->

## Goal
<1–3 sentences: what the user can DO after this phase>

## Scope
- <bullet list of included features>

Out of scope: <explicit exclusions — prevents creep>

## Data model
<new/changed Firestore collections + field tables; note every field the rules
will read (owner uids, ids that must match the doc path, frozen fields)>

## UI plan
<route → page → components; testids used by e2e>

## Rules impact
<which rule blocks change; new conditions; link the rules test names>

## Tests
- Unit: <counts + what they cover>
- Integration: <counts>
- e2e: <flows>

## Delivery report (fill at the end)
| Item | Value |
| --- | --- |
| Commit | `<sha> Phase N: <title>` |
| Files added / modified | n / m |
| Test counts | unit x · integration y · rules z · e2e w |
| Gates | lint ✅ tsc ✅ vitest ✅ build ✅ playwright ✅ |
| Decisions | <short list with rationale> |
| Risks / follow-ups | <list> |
