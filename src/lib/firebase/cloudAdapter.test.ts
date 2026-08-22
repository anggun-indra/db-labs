// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { remoteProjectSchema, userProfileSchema } from './cloudAdapter'
import { createProject } from '@/features/erd/domain/factory'

/**
 * Phase 4 cloud data contracts: Zod validation of Firestore documents.
 * Malformed remote documents must be rejected before they can reach local
 * storage or the editor.
 */

const baseProject = createProject('Cloud doc')

const validDoc = {
  projectId: baseProject.projectId,
  ownerUid: 'uid-1',
  name: 'Cloud doc',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  erd: baseProject
}

describe('remoteProjectSchema', () => {
  it('accepts a well-formed project document', () => {
    expect(remoteProjectSchema.safeParse(validDoc).success).toBe(true)
  })

  it('rejects documents with a malformed ERD payload', () => {
    const broken = { ...validDoc, erd: { schemaVersion: 99, tables: 'nope' } }
    expect(remoteProjectSchema.safeParse(broken).success).toBe(false)
  })

  it('rejects documents missing ownership metadata', () => {
    const withoutOwner: Record<string, unknown> = { ...validDoc }
    delete withoutOwner.ownerUid
    expect(remoteProjectSchema.safeParse(withoutOwner).success).toBe(false)
  })

  it('rejects empty projectId', () => {
    expect(remoteProjectSchema.safeParse({ ...validDoc, projectId: '' }).success).toBe(false)
  })
})

describe('userProfileSchema', () => {
  it('defaults role to student', () => {
    const parsed = userProfileSchema.parse({ uid: 'uid-1' })
    expect(parsed.role).toBe('student')
  })

  it('accepts lecturer role granted server-side', () => {
    const parsed = userProfileSchema.parse({ uid: 'uid-1', role: 'lecturer' })
    expect(parsed.role).toBe('lecturer')
  })

  it('rejects unknown roles', () => {
    expect(userProfileSchema.safeParse({ uid: 'uid-1', role: 'admin' }).success).toBe(false)
  })
})
