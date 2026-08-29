import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { createFirestoreAdapters } from './cloudAdapter'

/**
 * Firebase configuration scaffold (Phase 0+).
 * 
 * Uses production Firebase when credentials are provided.
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

// Load environment variables
export const firebaseConfig: FirebaseWebConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? ''
}

// Local emulator hookup (only when explicitly enabled via env flag)
const useEmulator = env.VITE_USE_FIREBASE_EMULATOR === 'true'
const authEmulatorUrl: string = env.VITE_FIREBASE_AUTH_EMULATOR_URL ?? ''
const firestoreEmulatorHost: string = env.VITE_FIRESTORE_EMULATOR_HOST ?? ''

export function isFirebaseConfigured(): boolean {
  return Boolean(
    (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) ||
      (useEmulator && authEmulatorUrl && firestoreEmulatorHost)
  )
}

export function getFirebaseConfig(): FirebaseWebConfig | null {
  if (!isFirebaseConfigured()) return null
  return firebaseConfig
}

export function isUsingEmulator(): boolean {
  return useEmulator
}

export function getAuthEmulatorUrl(): string {
  return authEmulatorUrl
}

let app: FirebaseApp | null = null
let adaptersInstance: ReturnType<typeof createFirestoreAdapters> | null = null

/** Lazily initializes Firebase App instance. */
export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null
  if (!app) {
    const existing = getApps()
    if (existing.length > 0) {
      app = getApp()
    } else if (useEmulator && authEmulatorUrl && firestoreEmulatorHost) {
      app = initializeApp(
        {
          apiKey: firebaseConfig.apiKey || 'demo-api-key',
          authDomain: firebaseConfig.authDomain || 'localhost',
          projectId: firebaseConfig.projectId || 'demo-dblab',
          appId: firebaseConfig.appId || 'demo-app-id'
        }
      )
      try {
        connectAuthEmulator(getAuth(app), authEmulatorUrl, { disableWarnings: true })
        const [host, portRaw] = firestoreEmulatorHost.split(':')
        connectFirestoreEmulator(getFirestore(app), host, Number(portRaw || 8080))
      } catch (err: unknown) {
        console.error('Error connecting to emulators:', err)
      }
    } else {
      app = initializeApp(firebaseConfig)
    }
  }
  return app
}



export function getFirestoreInstance() {
  const firebaseApp = getFirebaseApp()
  return firebaseApp ? getFirestore(firebaseApp) : null
}


// Create adapters on demand (singleton pattern)
export function getAdapters(): ReturnType<typeof createFirestoreAdapters> {
  if (!adaptersInstance) {
    adaptersInstance = createFirestoreAdapters()
  }
  return adaptersInstance
}

