# ADR-0005: Undo/redo with label coalescing and drag gestures

- Status: accepted
- Date: 2026-08-22

## Context

An ERD editor needs undo/redo that feels right: one undo step per logical action, not per
keystroke or per drag frame. A temporal middleware (e.g. zundo) was considered but adds a
dependency for behavior the store can express directly.

## Decision

The editor store keeps `past`/`future` stacks around the present `ErdProject` (cap 100):

- **Label coalescing**: every mutation carries a label (e.g. `rename-table-<id>`); mutations
  with the same label within 1.2 s replace the present without pushing a new history entry.
  Typing a name becomes one undo step.
- **Drag gestures**: the first position change of a drag pushes one history entry and sets a
  gesture flag; subsequent frames mutate the present only; `endGesture()` clears the flag.
- **Viewport** changes never enter history; they are editor chrome, not student work.
- Keyboard shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z / Ctrl+Y, suppressed while typing in
  inputs.

## Consequences

- No extra dependency; behavior is unit-testable (and tested) deterministically.
- History granularity is predictable for the teaching context.
- Trade-off: coalescing window is time-based; very slow typing creates extra steps. Acceptable.
