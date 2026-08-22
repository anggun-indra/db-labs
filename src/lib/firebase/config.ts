import { initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

/**
 * Firebase configuration scaffold (spec §43 Phase 0).
 *
 * Phase 0/1 do not use Firebase at runtime; this module exists so later
 * phases (Auth in Phase 4, Firestore in Phase 4/5) have a single place to
 * initialize from environment variables. The public web config is safe to
 * ship in the frontend - real protection comes from Auth + Firestore Rules
 * (spec §28, §39).
 *
 * Only Firebase Spark-plan services may ever be enabled here:
 * Authentication, Firestore, Hosting. Never Cloud Storage (spec §2.1).
 */

export interface FirebaseWebConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

const env = import.meta.env

export const firebaseConfig: FirebaseWebConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? ''
}

/**
 * Local emulator hookup (Phase 8 developer workflow). When these are set —
 * normally via a git-ignored `.env.emulator.local` plus `npm run dev:emulators`
 * (mode "emulator", so ordinary dev/build/test stays in local mode) — the app
 * talks to the Firebase emulators instead of the cloud. They stay empty in
 * production builds, so deployed apps always use real Firebase.
 */
const authEmulatorUrl: string = env.VITE_FIREBASE_AUTH_EMULATOR_URL ?? ''
const firestoreEmulatorHost: string = env.VITE_FIRESTORE_EMULATOR_HOST ?? ''

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)
}

let app: FirebaseApp | null = null

/** Lazily initializes Firebase; returns null when not configured. */
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null
  if (!app) {
    app = initializeApp(firebaseConfig)
    if (authEmulatorUrl) {
      connectAuthEmulator(getAuth(app), authEmulatorUrl, { disableWarnings: true })
    }
    if (firestoreEmulatorHost) {
      const [host, portRaw] = firestoreEmulatorHost.split(':')
      connectFirestoreEmulator(getFirestore(app), host, Number(portRaw || 8080))
    }
  }
  return app
}
