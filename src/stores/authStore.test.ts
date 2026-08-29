// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from './authStore'
import type { AuthAdapter, FirebaseUserLike } from '@/lib/firebase/cloudAdapter'

/**
 * Phase 4 auth state tests. Firebase is not configured in the test
 * environment, so real adapters resolve to null (local mode); a fake
 * adapter exercises the signed-in flows.
 */

class FakeAuthAdapter implements AuthAdapter {
  listeners = new Set<(user: FirebaseUserLike | null) => void>()
  failNext: Error | null = null
  signedOut = false

  onAuthChange(cb: (user: FirebaseUserLike | null) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  emit(user: FirebaseUserLike | null): void {
    for (const cb of this.listeners) cb(user)
  }

  private async result(user: FirebaseUserLike): Promise<FirebaseUserLike> {
    if (this.failNext) {
      const error = this.failNext
      this.failNext = null
      throw error
    }
    this.emit(user)
    return user
  }

  signInGoogle(): Promise<FirebaseUserLike> {
    return this.result({ uid: 'uid-google', displayName: 'G User', email: 'g@x.id', photoURL: null })
  }

  signInEmail(email: string): Promise<FirebaseUserLike> {
    return this.result({ uid: 'uid-email', displayName: 'E User', email, photoURL: null })
  }

  signUpEmail(name: string, email: string): Promise<FirebaseUserLike> {
    return this.result({ uid: 'uid-new', displayName: name, email, photoURL: null })
  }

  async signOutUser(): Promise<void> {
    this.signedOut = true
    this.emit(null)
  }
}

const fakeUser: FirebaseUserLike = {
  uid: 'uid-1',
  displayName: 'Budi',
  email: 'budi@student.ac.id',
  photoURL: null
}

beforeEach(async () => {
  window.localStorage.clear()
  useAuthStore.setState({
    mode: 'local',
    initializing: true,
    user: null,
    online: true,
    authError: null
  })
})

describe('initAuth', () => {
  it('falls back to local mode when no adapter is available', async () => {
    await useAuthStore.getState().initAuth(null)
    const state = useAuthStore.getState()
    expect(state.mode).toBe('local')
    expect(state.initializing).toBe(false)
    expect(state.user).toBeNull()
  })

  it('adopts the user reported by the auth listener', async () => {
    const adapter = new FakeAuthAdapter()
    await useAuthStore.getState().initAuth(adapter)
    expect(useAuthStore.getState().mode).toBe('firebase')

    adapter.emit(fakeUser)
    await vi.waitFor(() => {
      expect(useAuthStore.getState().user?.uid).toBe('uid-1')
    })
    const user = useAuthStore.getState().user!
    expect(user.displayName).toBe('Budi')
    // Self sign-up always gets the student role (server-side grants only).
    expect(user.role).toBe('student')
  })

  it('respects a cached profile role (e.g. lecturer grant)', async () => {
    window.localStorage.setItem('dblab:profile:uid-1', JSON.stringify({ role: 'lecturer' }))
    const adapter = new FakeAuthAdapter()
    await useAuthStore.getState().initAuth(adapter)
    adapter.emit(fakeUser)
    await vi.waitFor(() => {
      expect(useAuthStore.getState().user?.role).toBe('lecturer')
    })
  })
})

describe('sign-in flows', () => {
  it('rejects sign-in attempts in local mode with a friendly error', async () => {
    await useAuthStore.getState().initAuth(null)
    await useAuthStore.getState().signInWithGoogle()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().authError).toContain('local mode')
  })

  it('signs in with email and clears errors on success', async () => {
    const adapter = new FakeAuthAdapter()
    await useAuthStore.getState().initAuth(adapter)
    await useAuthStore.getState().signInWithEmail('budi@student.ac.id', 'password123')
    await vi.waitFor(() => {
      expect(useAuthStore.getState().user?.email).toBe('budi@student.ac.id')
    })
    expect(useAuthStore.getState().authError).toBeNull()
  })

  it('surfaces auth errors without breaking the store', async () => {
    const adapter = new FakeAuthAdapter()
    adapter.failNext = new Error('auth/invalid-credential')
    await useAuthStore.getState().initAuth(adapter)
    await useAuthStore.getState().signInWithEmail('x@y.id', 'wrongpass')
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().authError).toBe('auth/invalid-credential')
  })

  it('signs out cleanly and clears profile cache', async () => {
    window.localStorage.setItem('dblab:profile:uid-new', JSON.stringify({ role: 'student' }))
    const adapter = new FakeAuthAdapter()
    await useAuthStore.getState().initAuth(adapter)
    await useAuthStore.getState().signUpWithEmail('Budi', 'budi@student.ac.id', 'password123')
    await vi.waitFor(() => {
      expect(useAuthStore.getState().user?.uid).toBe('uid-new')
    })
    await useAuthStore.getState().signOutUser()
    expect(adapter.signedOut).toBe(true)
    expect(useAuthStore.getState().user).toBeNull()
    expect(window.localStorage.getItem('dblab:profile:uid-new')).toBeNull()
  })
})

