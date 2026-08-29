import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createFirebaseUserWithPassword } from './adminAuthService'
import * as firebaseConfig from '@/lib/firebase/config'
import * as firebaseApp from 'firebase/app'
import * as firebaseAuth from 'firebase/auth'

vi.mock('@/lib/firebase/config', () => ({
  getFirebaseConfig: vi.fn(),
  isUsingEmulator: vi.fn(() => false),
  getAuthEmulatorUrl: vi.fn(() => '')
}))

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  deleteApp: vi.fn()
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  connectAuthEmulator: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signOut: vi.fn()
}))

describe('adminAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws an error if Firebase config is missing', async () => {
    vi.mocked(firebaseConfig.getFirebaseConfig).mockReturnValue(null)

    await expect(
      createFirebaseUserWithPassword({
        email: 'test@example.com',
        displayName: 'Test User'
      })
    ).rejects.toThrow('Firebase is not initialized or configured.')
  })

  it('creates a user with default password and cleans up secondary app', async () => {
    vi.mocked(firebaseConfig.getFirebaseConfig).mockReturnValue({
      apiKey: 'test-api-key',
      projectId: 'test-project'
    } as unknown as ReturnType<typeof firebaseConfig.getFirebaseConfig>)

    const mockApp = { name: 'SecondaryAdminAuth_123' }
    const mockAuth = { name: 'auth-instance' }
    const mockUser = { uid: 'auth_uid_123' }

    vi.mocked(firebaseApp.initializeApp).mockReturnValue(mockApp as unknown as ReturnType<typeof firebaseApp.initializeApp>)
    vi.mocked(firebaseAuth.getAuth).mockReturnValue(mockAuth as unknown as ReturnType<typeof firebaseAuth.getAuth>)
    vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValue({
      user: mockUser
    } as unknown as firebaseAuth.UserCredential)
    vi.mocked(firebaseAuth.updateProfile).mockResolvedValue()
    vi.mocked(firebaseAuth.signOut).mockResolvedValue()
    vi.mocked(firebaseApp.deleteApp).mockResolvedValue()

    const result = await createFirebaseUserWithPassword({
      email: 'lecturer@univ.ac.id',
      displayName: 'Dr. Lecturer'
    })

    expect(result).toEqual({
      uid: 'auth_uid_123',
      email: 'lecturer@univ.ac.id',
      authCreated: true
    })

    expect(firebaseAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      mockAuth,
      'lecturer@univ.ac.id',
      'password123'
    )
    expect(firebaseAuth.updateProfile).toHaveBeenCalledWith(mockUser, {
      displayName: 'Dr. Lecturer'
    })
    expect(firebaseAuth.signOut).toHaveBeenCalledWith(mockAuth)
    expect(firebaseApp.deleteApp).toHaveBeenCalledWith(mockApp)
  })

  it('creates a user with custom password if provided', async () => {
    vi.mocked(firebaseConfig.getFirebaseConfig).mockReturnValue({
      apiKey: 'test-api-key',
      projectId: 'test-project'
    } as unknown as ReturnType<typeof firebaseConfig.getFirebaseConfig>)

    const mockApp = { name: 'SecondaryAdminAuth_456' }
    const mockAuth = { name: 'auth-instance' }
    const mockUser = { uid: 'auth_uid_456' }

    vi.mocked(firebaseApp.initializeApp).mockReturnValue(mockApp as unknown as ReturnType<typeof firebaseApp.initializeApp>)
    vi.mocked(firebaseAuth.getAuth).mockReturnValue(mockAuth as unknown as ReturnType<typeof firebaseAuth.getAuth>)
    vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockResolvedValue({
      user: mockUser
    } as unknown as firebaseAuth.UserCredential)
    vi.mocked(firebaseAuth.updateProfile).mockResolvedValue()
    vi.mocked(firebaseAuth.signOut).mockResolvedValue()
    vi.mocked(firebaseApp.deleteApp).mockResolvedValue()

    const result = await createFirebaseUserWithPassword({
      email: 'student@univ.ac.id',
      password: 'customSecretPassword',
      displayName: 'Student One'
    })

    expect(result).toEqual({
      uid: 'auth_uid_456',
      email: 'student@univ.ac.id',
      authCreated: true
    })

    expect(firebaseAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      mockAuth,
      'student@univ.ac.id',
      'customSecretPassword'
    )
    expect(firebaseApp.deleteApp).toHaveBeenCalledWith(mockApp)
  })

  it('always cleans up secondary app even when createUserWithEmailAndPassword throws', async () => {
    vi.mocked(firebaseConfig.getFirebaseConfig).mockReturnValue({
      apiKey: 'test-api-key',
      projectId: 'test-project'
    } as unknown as ReturnType<typeof firebaseConfig.getFirebaseConfig>)

    const mockApp = { name: 'SecondaryAdminAuth_err' }
    const mockAuth = { name: 'auth-instance' }

    vi.mocked(firebaseApp.initializeApp).mockReturnValue(mockApp as unknown as ReturnType<typeof firebaseApp.initializeApp>)
    vi.mocked(firebaseAuth.getAuth).mockReturnValue(mockAuth as unknown as ReturnType<typeof firebaseAuth.getAuth>)
    vi.mocked(firebaseAuth.createUserWithEmailAndPassword).mockRejectedValue(
      new Error('auth/email-already-in-use')
    )
    vi.mocked(firebaseApp.deleteApp).mockResolvedValue()

    await expect(
      createFirebaseUserWithPassword({
        email: 'existing@univ.ac.id',
        displayName: 'Existing User'
      })
    ).rejects.toThrow('auth/email-already-in-use')

    expect(firebaseApp.deleteApp).toHaveBeenCalledWith(mockApp)
  })
})
