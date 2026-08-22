// @vitest-environment node
/**
 * Firestore security-rules tests (Phase 4) against the local emulator.
 *
 * These are OPT-IN: they run only when FIRESTORE_EMULATOR_HOST is set, so
 * the default suite stays hermetic (port 8080 may host unrelated services).
 * Start the emulator, then run:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx vitest run firestoreRules
 */
import { readFileSync } from 'node:fs'
import { connect } from 'node:net'
import { afterAll, beforeAll, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'

const emulatorEnv = process.env.FIRESTORE_EMULATOR_HOST ?? ''
const [EMULATOR_HOST, EMULATOR_PORT_RAW] = emulatorEnv.split(':')
const EMULATOR_PORT = Number(EMULATOR_PORT_RAW || 8080)

function emulatorReachable(): Promise<boolean> {
  if (!EMULATOR_HOST) return Promise.resolve(false)
  return new Promise((resolve) => {
    const socket = connect({ host: EMULATOR_HOST, port: EMULATOR_PORT })
    const done = (value: boolean) => {
      socket.destroy()
      resolve(value)
    }
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
    setTimeout(() => done(false), 1500)
  })
}

const canRun = await emulatorReachable()

describe.skipIf(!canRun)('Firestore security rules (emulator)', () => {
  let env: RulesTestEnvironment | null = null

  const testEnv = (): RulesTestEnvironment => {
    if (!env) throw new Error('Rules test environment not initialized')
    return env
  }

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: 'dblab-rules-test',
      firestore: {
        rules: readFileSync(new URL('../../../firestore.rules', import.meta.url), 'utf8'),
        host: EMULATOR_HOST,
        port: EMULATOR_PORT
      }
    })
  }, 30000)

  afterAll(async () => {
    if (env) await testEnv().cleanup()
  })

  const studentDoc = (ownerUid: string) => ({
    projectId: 'p1',
    ownerUid,
    name: 'My ERD',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    erd: { schemaVersion: 1, projectId: 'p1', name: 'My ERD', tables: [], relationships: [] }
  })

  it('denies anonymous reads and writes on projects', async () => {
    const unauthed = testEnv().unauthenticatedContext()
    await assertFails(getDoc(doc(unauthed.firestore(), 'projects/p1')))
    await assertFails(setDoc(doc(unauthed.firestore(), 'projects/p1'), studentDoc('uid-a')))
  })

  it('lets a student create, read, update and delete their own project', async () => {
    const alice = testEnv().authenticatedContext('uid-a')
    const ref = doc(alice.firestore(), 'projects/p1')
    await assertSucceeds(setDoc(ref, studentDoc('uid-a')))
    await assertSucceeds(getDoc(ref))
    await assertSucceeds(
      setDoc(ref, { ...studentDoc('uid-a'), updatedAt: '2024-02-01T00:00:00.000Z' })
    )
    await assertSucceeds(deleteDoc(ref))
  })

  it('denies creating a project owned by someone else', async () => {
    const alice = testEnv().authenticatedContext('uid-a')
    await assertFails(setDoc(doc(alice.firestore(), 'projects/p2'), studentDoc('uid-b')))
  })

  it('denies reading or deleting another student\'s project', async () => {
    const alice = testEnv().authenticatedContext('uid-a')
    await assertSucceeds(setDoc(doc(alice.firestore(), 'projects/p3'), studentDoc('uid-a')))

    const bob = testEnv().authenticatedContext('uid-b')
    await assertFails(getDoc(doc(bob.firestore(), 'projects/p3')))
    await assertFails(deleteDoc(doc(bob.firestore(), 'projects/p3')))
    // Cannot steal ownership via update either.
    await assertFails(setDoc(doc(bob.firestore(), 'projects/p3'), studentDoc('uid-b')))
  })

  it('only allows creating an own profile with role student', async () => {
    const alice = testEnv().authenticatedContext('uid-a')
    await assertSucceeds(
      setDoc(doc(alice.firestore(), 'users/uid-a'), {
        uid: 'uid-a',
        displayName: 'Alice',
        email: 'alice@student.ac.id',
        role: 'student',
        createdAt: '2024-01-01T00:00:00.000Z'
      })
    )
    // Self-promotion to lecturer is rejected.
    const bob = testEnv().authenticatedContext('uid-b')
    await assertFails(
      setDoc(doc(bob.firestore(), 'users/uid-b'), {
        uid: 'uid-b',
        displayName: 'Bob',
        email: 'bob@student.ac.id',
        role: 'lecturer',
        createdAt: '2024-01-01T00:00:00.000Z'
      })
    )
  })

  it('freezes the role field after profile creation', async () => {
    const alice = testEnv().authenticatedContext('uid-a')
    await assertFails(
      setDoc(doc(alice.firestore(), 'users/uid-a'), {
        uid: 'uid-a',
        displayName: 'Alice',
        email: 'alice@student.ac.id',
        role: 'lecturer',
        createdAt: '2024-01-01T00:00:00.000Z'
      })
    )
  })

  it('denies reading another user\'s profile', async () => {
    const bob = testEnv().authenticatedContext('uid-b')
    await assertFails(getDoc(doc(bob.firestore(), 'users/uid-a')))
  })

  const snapshotMeta = (ownerUid: string, snapshotId: string) => ({
    snapshotId,
    ownerUid,
    projectId: 'p1',
    fileName: 'db.sqlite',
    compression: 'gzip',
    originalSize: 100,
    compressedSize: 50,
    chunkCount: 1,
    checksum: 'a'.repeat(64),
    createdAt: '2024-01-01T00:00:00.000Z',
    kind: 'manual'
  })

  it('lets the owner write snapshot metadata and chunks, then delete them', async () => {
    const alice = testEnv().authenticatedContext('uid-a')
    await assertSucceeds(
      setDoc(doc(alice.firestore(), 'sqliteSnapshots/snap-a'), snapshotMeta('uid-a', 'snap-a'))
    )
    await assertSucceeds(
      setDoc(doc(alice.firestore(), 'sqliteSnapshots/snap-a/chunks/0'), {
        index: 0,
        data: new Uint8Array([1, 2, 3])
      })
    )
    await assertSucceeds(getDoc(doc(alice.firestore(), 'sqliteSnapshots/snap-a/chunks/0')))
    await assertSucceeds(deleteDoc(doc(alice.firestore(), 'sqliteSnapshots/snap-a/chunks/0')))
    await assertSucceeds(deleteDoc(doc(alice.firestore(), 'sqliteSnapshots/snap-a')))
  })

  it('denies reading or writing another user\'s snapshot and chunks', async () => {
    const alice = testEnv().authenticatedContext('uid-a')
    await assertSucceeds(
      setDoc(doc(alice.firestore(), 'sqliteSnapshots/snap-b'), snapshotMeta('uid-a', 'snap-b'))
    )

    const bob = testEnv().authenticatedContext('uid-b')
    await assertFails(getDoc(doc(bob.firestore(), 'sqliteSnapshots/snap-b')))
    await assertFails(getDoc(doc(bob.firestore(), 'sqliteSnapshots/snap-b/chunks/0')))
    await assertFails(
      setDoc(doc(bob.firestore(), 'sqliteSnapshots/snap-b/chunks/0'), {
        index: 0,
        data: new Uint8Array([9])
      })
    )
    await assertFails(deleteDoc(doc(bob.firestore(), 'sqliteSnapshots/snap-b')))
  })

  it('denies creating a snapshot owned by someone else', async () => {
    const alice = testEnv().authenticatedContext('uid-a')
    await assertFails(
      setDoc(doc(alice.firestore(), 'sqliteSnapshots/snap-c'), snapshotMeta('uid-b', 'snap-c'))
    )
  })

  it('denies anonymous snapshot access', async () => {
    const anon = testEnv().unauthenticatedContext()
    await assertFails(getDoc(doc(anon.firestore(), 'sqliteSnapshots/snap-a')))
    await assertFails(
      setDoc(doc(anon.firestore(), 'sqliteSnapshots/snap-a'), snapshotMeta('uid-a', 'snap-a'))
    )
  })
})
