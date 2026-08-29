#!/usr/bin/env bash
# Start the Firebase emulators for Database Learning Lab (dev workflow).
#
# Handles the two environment traps seen on real machines:
#   1. firebase-tools >= 15 requires Java >= 21 (system java is often older).
#   2. Port 8080 is frequently occupied by unrelated services; the Firestore
#      emulator then moves to 8081 via a git-ignored local config.
#
# Usage: npm run emulators   (or: bash scripts/emulators.sh)
set -euo pipefail
cd "$(dirname "$0")/.."

# --- 1. Locate a Java >= 21 -------------------------------------------------
find_java_home() {
  local candidates=(
    "${JAVA_HOME:-}"
    "/opt/homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home"
    "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
    "/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home"
    "/usr/local/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home"
  )
  for home in "${candidates[@]}"; do
    if [[ -n "$home" && -x "$home/bin/java" ]]; then
      local major
      major=$("$home/bin/java" -version 2>&1 | head -1 | sed -E 's/.*version "([0-9]+).*/\1/')
      if [[ "$major" -ge 21 ]]; then
        echo "$home"
        return 0
      fi
    fi
  done
  return 1
}

if JAVA_HOME=$(find_java_home); then
  export JAVA_HOME
  export PATH="$JAVA_HOME/bin:$PATH"
  echo "[emulators] using $($JAVA_HOME/bin/java -version 2>&1 | head -1)"
else
  echo "[emulators] ERROR: no Java >= 21 found (firebase-tools requirement)." >&2
  echo "[emulators] Install one with: brew install openjdk@25" >&2
  exit 1
fi

# --- 2. Pick a free Firestore port (8080 -> 8081 fallback) ------------------
port_busy() { lsof -i ":$1" >/dev/null 2>&1; }

CONFIG="firebase.json"
FIRESTORE_PORT=8080
if port_busy 8080; then
  FIRESTORE_PORT=8081
  if port_busy 8081; then
    echo "[emulators] ERROR: both 8080 and 8081 are busy — free one and retry." >&2
    exit 1
  fi
  CONFIG="firebase.emulator.local.json"
  cat > "$CONFIG" <<JSON
{
  "firestore": { "rules": "firestore.rules" },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": $FIRESTORE_PORT },
    "ui": { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  }
}
JSON
  echo "[emulators] port 8080 busy — wrote $CONFIG (git-ignored) with Firestore on $FIRESTORE_PORT"
fi

echo "[emulators] Auth: 127.0.0.1:9099 | Firestore: 127.0.0.1:$FIRESTORE_PORT | UI: http://127.0.0.1:4000"
if command -v firebase >/dev/null 2>&1; then
  exec firebase emulators:start --config "$CONFIG" --project "${FIREBASE_EMULATOR_PROJECT:-demo-dblab}"
else
  exec npx -y firebase-tools emulators:start --config "$CONFIG" --project "${FIREBASE_EMULATOR_PROJECT:-demo-dblab}"
fi

