#!/usr/bin/env node
/**
 * Seed the Firebase emulators with a demo classroom:
 *   - lecturer account (dosen@demo.local / password123) with role 'lecturer'
 *   - student account  (mahasiswa@demo.local / password123) with role 'student'
 *   - one course
 *   - one published assignment with starter ERD + starter SQL + sample data
 *
 * Uses only the emulator REST APIs (Bearer "owner" bypasses rules), so it
 * needs no Firebase SDK and never touches production. Idempotent: re-runs
 * upsert the same documents.
 *
 * Usage: npm run seed:demo
 *   env: FIRESTORE_EMULATOR_HOST (auto-detects 8080/8081), AUTH_EMULATOR_HOST
 */

const PROJECT = process.env.FIREBASE_EMULATOR_PROJECT ?? 'demo-dblab'

async function pickPort(envValue) {
  if (envValue) return envValue
  // Authoritative source: the emulator Hub (port 4400) knows the real
  // Firestore port. Probing 8080/8081 directly is unsafe — unrelated local
  // services (e.g. a FastAPI app) also answer HTTP there.
  try {
    const res = await fetch('http://127.0.0.1:4400/emulators')
    const info = await res.json()
    const firestore = info?.firestore
    if (firestore) return `${firestore.host ?? '127.0.0.1'}:${firestore.port}`
  } catch {
    /* hub unreachable — fall through to candidate probing */
  }
  // Fallback: verify candidates against a Firestore-shaped response.
  for (const port of [8081, 8080]) {
    try {
      const res = await fetch(
        `http://127.0.0.1:${port}/v1/projects/${PROJECT}/databases/(default)/documents/__probe__`,
        { headers: { Authorization: 'Bearer owner' } }
      )
      const body = await res.text()
      if (body.startsWith('{"error":')) return `127.0.0.1:${port}`
    } catch {
      /* not reachable */
    }
  }
  throw new Error('No Firestore emulator reachable. Start one with: npm run emulators')
}

const FIRESTORE = await pickPort(process.env.FIRESTORE_EMULATOR_HOST)
const AUTH = process.env.AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'
const FIRESTORE_BASE = `http://${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents`

console.log(`[seed] Firestore emulator: ${FIRESTORE} (project ${PROJECT})`)
console.log(`[seed] Auth emulator:      ${AUTH}`)

/* --- Firestore REST helpers (emulator accepts Bearer owner as admin) --- */

function fv(value) {
  if (value === null) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(fv) } }
  if (typeof value === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fv(v)])) } }
  }
  throw new Error(`Unsupported field value: ${value}`)
}

async function upsert(path, data) {
  const res = await fetch(`${FIRESTORE_BASE}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, fv(v)])) })
  })
  if (!res.ok) throw new Error(`upsert ${path} failed: ${res.status} ${await res.text()}`)
  console.log(`[seed] upserted ${path}`)
}

/* --- Auth emulator: create email/password accounts (idempotent-ish) --- */

async function ensureAccount(email, password) {
  const res = await fetch(
    `http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    }
  )
  const body = await res.json()
  if (body.localId) return body.localId
  if (body.error?.message?.includes('EMAIL_EXISTS')) {
    // Account exists already; sign in to recover its uid.
    const signIn = await fetch(
      `http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
      }
    )
    const found = await signIn.json()
    if (found.localId) return found.localId
  }
  throw new Error(`Could not ensure account for ${email}: ${JSON.stringify(body)}`)
}

const lecturerUid = await ensureAccount('dosen@demo.local', 'password123')
const studentUid = await ensureAccount('mahasiswa@demo.local', 'password123')
console.log(`[seed] lecturer uid: ${lecturerUid}`)
console.log(`[seed] student uid:  ${studentUid}`)

const nowIso = new Date().toISOString()

await upsert(`users/${lecturerUid}`, {
  uid: lecturerUid,
  displayName: 'Dosen Demo',
  email: 'dosen@demo.local',
  role: 'lecturer',
  createdAt: nowIso
})
await upsert(`users/${studentUid}`, {
  uid: studentUid,
  displayName: 'Mahasiswa Demo',
  email: 'mahasiswa@demo.local',
  role: 'student',
  createdAt: nowIso
})

await upsert('courses/database-management', {
  courseId: 'database-management',
  title: 'Manajemen Database',
  description: 'Kelas demo untuk pengujian Database Learning Lab.',
  lecturerUid,
  createdAt: nowIso
})

/* Starter ERD: users + orders with one FK relationship (schemaVersion 1). */
const starterErd = {
  schemaVersion: 1,
  projectId: 'starter-marketplace',
  name: 'Marketplace Starter',
  tables: [
    {
      id: 't-users',
      name: 'users',
      position: { x: 40, y: 80 },
      columns: [
        { id: 'c-users-id', name: 'id', type: 'INTEGER', primaryKey: true, nullable: false, unique: false },
        { id: 'c-users-name', name: 'name', type: 'TEXT', primaryKey: false, nullable: false, unique: false }
      ]
    },
    {
      id: 't-orders',
      name: 'orders',
      position: { x: 360, y: 80 },
      columns: [
        { id: 'c-orders-id', name: 'id', type: 'INTEGER', primaryKey: true, nullable: false, unique: false },
        { id: 'c-orders-user', name: 'user_id', type: 'INTEGER', primaryKey: false, nullable: false, unique: false },
        { id: 'c-orders-total', name: 'total', type: 'REAL', primaryKey: false, nullable: true, unique: false }
      ]
    }
  ],
  relationships: [
    {
      id: 'r-orders-user',
      sourceTableId: 't-orders',
      sourceColumnId: 'c-orders-user',
      targetTableId: 't-users',
      targetColumnId: 'c-users-id',
      cardinality: 'many-to-one'
    }
  ]
}

await upsert('assignments/demo-marketplace', {
  assignmentId: 'demo-marketplace',
  courseId: 'database-management',
  title: 'Marketplace Database (Demo)',
  description: 'Tugas demo: kembangkan skema marketplace dan isi data contoh.',
  instructions:
    '1. Mulai dari starter ERD.\n2. Tambahkan tabel products.\n3. Jalankan sample data lalu tulis 3 query SQL.',
  learningObjectives: ['Memodelkan relasi one-to-many', 'Menulis query SELECT dengan JOIN'],
  requirements: ['Minimal 3 tabel', 'Semua tabel punya primary key'],
  dueAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
  status: 'published',
  starterErd,
  starterSql: 'CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY, message TEXT);',
  sampleData: "INSERT INTO users (id, name) VALUES (1, 'Budi'), (2, 'Siti');",
  createdByUid: lecturerUid,
  createdAt: nowIso,
  updatedAt: nowIso
})

console.log('[seed] done. Sign in at the app with:')
console.log('[seed]   lecturer: dosen@demo.local / password123')
console.log('[seed]   student:  mahasiswa@demo.local / password123')
