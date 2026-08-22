# 0007 — Skill, tools & plugin consolidation of project knowledge

Date: 2026-08 (after Phase 8 + emulator wiring)

## Context

Eight phases of delivery accumulated hard-won operational knowledge: quality
gates, the Firebase emulator workflow (Java ≥ 21, port conflicts, data
persistence), Firestore rules testing conventions, and a long pitfall catalog.
The user asked for this to be consolidated into reusable **skills, tools and a
plugin** so future iterations/projects start stronger.

## Decision

1. **Tools (repo scripts)** — committed, executable:
   - `scripts/emulators.sh` (`npm run emulators`): Java ≥ 21 auto-detection,
     8080→8081 fallback with git-ignored local config, prints connection info.
   - `scripts/seed-demo.mjs` (`npm run seed:demo`): idempotent demo classroom
     (lecturer + student + course + published assignment) via emulator REST.
     Discovers the real Firestore port from the Hub (`:4400/emulators`) —
     blind port probing hit an unrelated FastAPI service on 8080.
   - `scripts/gates.sh` (`npm run gates`, `--quick` variant): the full release
     gate sequence, stops at first failure.
   - `scripts/new-project.sh`: scaffolds the whole kit into another repo.
2. **Plugin (playbook starter kit)** — `playbook/`: README (non-negotiable
   habits), PHASE-TEMPLATE.md, firestore.rules.skeleton, PITFALLS.md.
3. **Skill** — `~/.claude/skills/dblab-playbook/SKILL.md`: agent-facing entry
   point that routes to the tools and playbook.

### Rejected alternative: Cordis dynamic plugin

`cordis_define` was attempted, but this session's transport corrupted object
parameters (`"plugin" must match exactly one oneOf branch (matched 0)`;
`inspect_query` rejected even `{}` inputs). Independently, Cordis dynamic
plugins are explicitly *temporary and process-local*, which conflicts with the
goal of durable cross-project reuse. Repo artifacts win on durability, git
history, and portability.

## Consequences

- Future sessions: load the `dblab-playbook` skill → run `npm run emulators` /
  `seed:demo` / `gates` → consult `playbook/PITFALLS.md` before debugging.
- New projects: `bash scripts/new-project.sh <dir>` copies the kit.
- If Cordis transport is fixed later, a thin dynamic tool wrapping
  `dblab_playbook` topics can be added without changing any repo asset.
