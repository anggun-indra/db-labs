#!/usr/bin/env bash
# Scaffold the Database Learning Lab dev kit into another project.
#
# Copies:
#   scripts/emulators.sh, scripts/gates.sh, scripts/seed-demo.mjs  -> <target>/scripts/
#   playbook/ (README, PHASE-TEMPLATE, PITFALLS, rules skeleton)   -> <target>/playbook/
#   firestore.rules skeleton (only if the target has none)
#   firebase.json (only if the target has none)
#   .env.local template for emulator wiring (only if absent)
#   npm scripts: emulators, gates, seed:demo, test:rules (if package.json exists)
#
# Usage: bash scripts/new-project.sh <target-dir>
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="$(pwd)"

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "usage: bash scripts/new-project.sh <target-dir>" >&2
  exit 1
fi
mkdir -p "$TARGET/scripts" "$TARGET/playbook"

copy_if_missing() {
  local src="$1" dst="$2"
  if [[ -e "$dst" ]]; then
    echo "[scaffold] keep existing: $dst"
  else
    cp "$src" "$dst"
    echo "[scaffold] added: $dst"
  fi
}

for f in emulators.sh gates.sh seed-demo.mjs; do
  copy_if_missing "$SRC/scripts/$f" "$TARGET/scripts/$f"
  chmod +x "$TARGET/scripts/$f" 2>/dev/null || true
done

for f in README.md PHASE-TEMPLATE.md PITFALLS.md firestore.rules.skeleton; do
  copy_if_missing "$SRC/playbook/$f" "$TARGET/playbook/$f"
done

copy_if_missing "$SRC/playbook/firestore.rules.skeleton" "$TARGET/firestore.rules"

if [[ ! -e "$TARGET/firebase.json" ]]; then
  cat > "$TARGET/firebase.json" <<'JSON'
{
  "firestore": { "rules": "firestore.rules" },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  }
}
JSON
  echo "[scaffold] added: $TARGET/firebase.json"
fi

if [[ ! -e "$TARGET/.env.emulator.local" ]]; then
  cat > "$TARGET/.env.emulator.local" <<'ENV'
# Emulator-mode config only — keep git-ignored. Loaded by `vite --mode emulator`
# (npm run dev:emulators); ordinary dev/build/test never see these values.
VITE_FIREBASE_API_KEY=demo-api-key
VITE_FIREBASE_AUTH_DOMAIN=demo-dblab.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-dblab
VITE_FIREBASE_STORAGE_BUCKET=demo-dblab.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:demodblab
VITE_FIREBASE_AUTH_EMULATOR_URL=http://127.0.0.1:9099
VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1:8081
ENV
  echo "[scaffold] added: $TARGET/.env.local (template)"
fi

if [[ -f "$TARGET/package.json" ]]; then
  node -e '
    const fs = require("fs")
    const p = process.argv[1]
    const d = JSON.parse(fs.readFileSync(p, "utf8"))
    d.scripts = d.scripts || {}
    d.scripts.emulators = "bash scripts/emulators.sh"
    d.scripts.gates = "bash scripts/gates.sh"
    d.scripts["seed:demo"] = "node scripts/seed-demo.mjs"
    if (!d.scripts["test:rules"]) {
      d.scripts["test:rules"] = "FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 vitest run firestoreRules"
    }
    fs.writeFileSync(p, JSON.stringify(d, null, 2) + "\n")
  ' "$TARGET/package.json"
  echo "[scaffold] npm scripts registered in $TARGET/package.json"
fi

echo "[scaffold] done. Next: npm run emulators, then npm run seed:demo"
