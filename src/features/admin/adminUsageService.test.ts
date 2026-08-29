import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  AdminUsageService,
  SPARK_STORAGE_LIMIT_BYTES,
  SPARK_DAILY_WRITES_LIMIT
} from './services/adminUsageService'
import {
  getRoleMeta,
  getRoleLabel,
  getRoleShortLabel,
  getRoleTagColor,
  isLecturerOrAdmin,
  isSuperAdmin
} from '@/lib/firebase/roles'

describe('AdminUsageService & Roles', () => {
  let service: AdminUsageService

  beforeEach(() => {
    service = new AdminUsageService()
    vi.restoreAllMocks()
  })

  it('defines the correct Spark Free Tier limits according to Firebase pricing', () => {
    expect(SPARK_STORAGE_LIMIT_BYTES).toBe(1024 * 1024 * 1024) // 1 GiB
    expect(SPARK_DAILY_WRITES_LIMIT).toBe(20000)
  })

  it('throws an error if Firebase is not initialized', async () => {
    await expect(service.fetchUsageStatistics()).rejects.toThrow('Firebase is not initialized.')
    await expect(
      service.createUserProfile({
        uid: 'u1',
        displayName: 'Test',
        email: 't@t.com',
        role: 'student',
        createdAt: ''
      })
    ).rejects.toThrow('Firebase is not initialized.')
    await expect(service.updateUserRole('u1', 'lecturer')).rejects.toThrow(
      'Firebase is not initialized.'
    )
  })

  it('correctly maps generic role metadata and captions', () => {
    expect(getRoleMeta('lecturer').role).toBe('lecturer')
    expect(getRoleMeta('super_admin').color).toBe('purple')
    expect(getRoleLabel('super_admin')).toContain('Super Admin')
    expect(getRoleLabel('lecturer')).toContain('Instruktur')
    expect(getRoleLabel('student')).toContain('Peserta')

    expect(getRoleShortLabel('super_admin')).toBe('Super Admin')
    expect(getRoleShortLabel('lecturer')).toBe('Instruktur')
    expect(getRoleShortLabel('student')).toBe('Peserta')

    expect(getRoleTagColor('super_admin')).toBe('purple')
    expect(getRoleTagColor('lecturer')).toBe('blue')
    expect(getRoleTagColor('student')).toBe('green')

    expect(isLecturerOrAdmin('super_admin')).toBe(true)
    expect(isLecturerOrAdmin('admin')).toBe(true)
    expect(isLecturerOrAdmin('lecturer')).toBe(true)
    expect(isLecturerOrAdmin('student')).toBe(false)

    expect(isSuperAdmin('super_admin')).toBe(true)
    expect(isSuperAdmin('admin')).toBe(true)
    expect(isSuperAdmin('lecturer')).toBe(false)
    expect(isSuperAdmin('student')).toBe(false)
  })
})
