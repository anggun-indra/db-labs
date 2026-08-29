import { initializeApp, deleteApp } from 'firebase/app'
import {
  connectAuthEmulator,
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut
} from 'firebase/auth'
import { getFirebaseConfig, isUsingEmulator, getAuthEmulatorUrl } from '@/lib/firebase/config'

export interface CreateUserAuthParams {
  email: string
  password?: string
  displayName: string
}

export interface CreateUserAuthResult {
  uid: string
  email: string
  authCreated: boolean
}

/**
 * Creates a new user account in Firebase Authentication using the Email/Password provider
 * via an isolated secondary Firebase App instance so that the active administrator's
 * primary session is not overwritten or logged out.
 */
export async function createFirebaseUserWithPassword(
  params: CreateUserAuthParams
): Promise<CreateUserAuthResult> {
  const config = getFirebaseConfig()
  const email = params.email.trim()
  const password = params.password?.trim() || 'password123'
  const displayName = params.displayName.trim()

  if (!config) {
    throw new Error('Firebase is not initialized or configured.')
  }

  // Create an isolated secondary Firebase app instance with random suffix
  const secondaryAppName = `SecondaryAdminAuth_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const secondaryApp = initializeApp(config, secondaryAppName)
  const secondaryAuth = getAuth(secondaryApp)

  if (isUsingEmulator() && getAuthEmulatorUrl()) {
    try {
      connectAuthEmulator(secondaryAuth, getAuthEmulatorUrl(), { disableWarnings: true })
    } catch {
      // ignore if already connected
    }
  }

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    if (displayName && credential.user) {
      await updateProfile(credential.user, { displayName })
    }
    const uid = credential.user.uid
    await signOut(secondaryAuth)
    return {
      uid,
      email,
      authCreated: true
    }
  } finally {
    try {
      await deleteApp(secondaryApp)
    } catch (err) {
      console.warn('Could not clean up temporary secondary Firebase App:', err)
    }
  }
}
