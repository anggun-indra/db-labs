import { create } from 'zustand'
import { createFirebaseAuthAdapter, type AuthAdapter, type FirebaseUserLike, type UserRole } from '@/lib/firebase/cloudAdapter'
import { getCloudAdapters } from '@/lib/firebase/adaptersInstance'

/**
 * Auth state (Phase 4). Firebase UID is the canonical identity (spec §35).
 * In local mode (no Firebase config) everything degrades gracefully: the
 * store reports mode 'local' and all sign-in attempts are rejected with a
 * friendly message.
 */

export interface AuthUser extends FirebaseUserLike {
  role: UserRole
}

interface AuthState {
  mode: 'local' | 'firebase'
  initializing: boolean
  user: AuthUser | null
  online: boolean
  authError: string | null

  initAuth(adapter?: AuthAdapter | null): Promise<void>
  signInWithGoogle(): Promise<void>
  signInWithEmail(email: string, password: string): Promise<void>
  signUpWithEmail(name: string, email: string, password: string): Promise<void>
  signOutUser(): Promise<void>
}

const profileCacheKey = (uid: string) => `dblab:profile:${uid}`

export function clearProfileCache(uid?: string): void {
  if (typeof localStorage === 'undefined') return
  if (uid) {
    localStorage.removeItem(profileCacheKey(uid))
  }
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('dblab:profile:')) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key))
}

async function ensureProfile(firebaseUser: FirebaseUserLike): Promise<UserRole> {
  const adapters = getCloudAdapters()
  if (adapters) {
    try {
      const remote = await adapters.users.loadProfile(firebaseUser.uid)
      if (remote) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(profileCacheKey(firebaseUser.uid), JSON.stringify(remote))
        }
        return remote.role
      }
      // Roles are granted server-side only; self sign-up is always 'student'.
      const profile = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName ?? '',
        email: firebaseUser.email ?? '',
        role: 'student' as const,
        createdAt: new Date().toISOString()
      }
      await adapters.users.createProfile(profile)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(profileCacheKey(firebaseUser.uid), JSON.stringify(profile))
      }
      return 'student'
    } catch {
      // Remote load failed (e.g. offline), fall back to cache
    }
  }

  // Fallback to cache if offline or adapters not configured
  if (typeof localStorage !== 'undefined') {
    const cached = localStorage.getItem(profileCacheKey(firebaseUser.uid))
    if (cached) {
      try {
        const parsed: unknown = JSON.parse(cached)
        const role = (parsed as { role?: unknown })?.role
        if (role === 'student' || role === 'lecturer' || role === 'super_admin' || role === 'admin') return role
      } catch {
        // fall through
      }
    }

  }

  return 'student'
}


export const useAuthStore = create<AuthState>()((set) => {
  let adapter: AuthAdapter | null = null
  let unsubscribeAuth: (() => void) | null = null
  let onlineListenersInstalled = false

  function installOnlineListeners(): void {
    if (onlineListenersInstalled || typeof window === 'undefined') return
    onlineListenersInstalled = true
    window.addEventListener('online', () => set({ online: true }))
    window.addEventListener('offline', () => set({ online: false }))
  }

  async function adoptUser(firebaseUser: FirebaseUserLike | null): Promise<void> {
    if (!firebaseUser) {
      set({ user: null, initializing: false })
      return
    }
    const role = await ensureProfile(firebaseUser)
    set({ user: { ...firebaseUser, role }, initializing: false, authError: null })
  }

  return {
    mode: 'local',
    initializing: true,
    user: null,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    authError: null,

    async initAuth(providedAdapter) {
      installOnlineListeners()
      adapter = providedAdapter !== undefined ? providedAdapter : createFirebaseAuthAdapter()
      if (!adapter) {
        set({ mode: 'local', initializing: false, user: null })
        return
      }
      set({ mode: 'firebase', initializing: true })
      if (unsubscribeAuth) unsubscribeAuth()
      unsubscribeAuth = adapter.onAuthChange((user) => {
        void adoptUser(user)
      })
    },

    async signInWithGoogle() {
      if (!adapter) {
        set({ authError: 'Firebase is not configured. The app keeps running in local mode.' })
        return
      }
      try {
        set({ authError: null })
        const user = await adapter.signInGoogle()
        await adoptUser(user)
      } catch (error) {
        set({ authError: error instanceof Error ? error.message : 'Sign-in failed.' })
      }
    },

    async signInWithEmail(email, password) {
      if (!adapter) {
        set({ authError: 'Firebase is not configured. The app keeps running in local mode.' })
        return
      }
      try {
        set({ authError: null })
        const user = await adapter.signInEmail(email, password)
        await adoptUser(user)
      } catch (error) {
        set({ authError: error instanceof Error ? error.message : 'Sign-in failed.' })
      }
    },

    async signUpWithEmail(name, email, password) {
      if (!adapter) {
        set({ authError: 'Firebase is not configured. The app keeps running in local mode.' })
        return
      }
      try {
        set({ authError: null })
        const user = await adapter.signUpEmail(name, email, password)
        await adoptUser(user)
      } catch (error) {
        set({ authError: error instanceof Error ? error.message : 'Sign-up failed.' })
      }
    },

    async signOutUser() {
      if (!adapter) return
      try {
        const currentUid = useAuthStore.getState().user?.uid
        await adapter.signOutUser()
        clearProfileCache(currentUid)
        set({ user: null, authError: null })
      } catch (error) {
        set({ authError: error instanceof Error ? error.message : 'Sign-out failed.' })
      }
    }

  }
})

export function getAuthInitState(): Pick<AuthState, 'mode' | 'initializing'> {
  const { mode, initializing } = useAuthStore.getState()
  return { mode, initializing }
}
