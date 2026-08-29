---
name: dblab-playbook
description: >-
  Runbooks, emulator workflows, quality gate scripts, and pitfall troubleshooting
  for the Database Learning Lab project. Use when running tests, starting Firebase emulators,
  seeding demo data, or debugging known platform issues.
---

# Database Learning Lab Playbook & Runbooks

Operational procedures, helper scripts, and pitfall resolutions for the Database Learning Lab stack.

## 1. Quality Gates

Run before completing any feature phase or submitting changes:

```bash
# Full quality gate (lint -> typecheck -> vitest -> build -> playwright)
npm run gates

# Quick quality gate (lint -> typecheck -> vitest -> build)
npm run gates:quick
```

## 2. Firebase Emulator Workflow

### Starting the Emulators
- Use `scripts/emulators.sh` (`npm run emulators`), which auto-detects Java ≥ 21 and handles port fallback (8080 -> 8081).
- Port overrides live in `.env.emulator.local` and `firebase.emulator.local.json` (git-ignored).
- Emulator Hub runs on port `4400`. Query `http://127.0.0.1:4400/emulators` to discover assigned ports.

### Seeding Demo Data
```bash
# Seed idempotent demo classroom (lecturer + student + course + assignment)
npm run seed:demo
```

### Testing Firestore Security Rules
```bash
npm run test:rules
```
*Note: Always clear Firestore data in `beforeAll` (`await env.clearFirestore()`) to avoid state pollution.*

## 3. Pitfalls Quick Reference

- **Ant Design in Playwright**: Tab panes remain in DOM; scope selectors to `.ant-tabs-tabpane-active` or use `.first()`.
- **Headless Chrome RAF Throttling**: Use `{ polling: 500 }` instead of default requestAnimationFrame polling in `waitForFunction`.
- **Firebase Bytes**: Use `Bytes.fromUint8Array(...)` for binary writes; never pass raw `Uint8Array`.
- **Monaco Editor**: Always dynamic/lazy-import to avoid bundle bloat.
- **Detailed Pitfalls**: Consult [`playbook/PITFALLS.md`](file:///Users/nb-mac-fj2n0x/Work/wproject/kuliah/manajemen-database/playbook/PITFALLS.md).
