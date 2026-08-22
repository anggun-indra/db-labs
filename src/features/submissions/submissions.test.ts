// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { SubmissionService } from './submissionService'
import type { SubmissionAdapter } from '@/lib/firebase/submissionAdapter'
import type { SnapshotSaver } from './submissionService'
import type { SaveResult } from '@/features/snapshots/snapshotService'
import { SubmissionBlockedError, type Submission } from './domain/submissionModel'
import { createProject, createTable } from '@/features/erd/domain/factory'

/**
 * Phase 7 tests: consistency-first submission flow (no partial
 * submissions), frozen ERD immutability, versioning and grading guards.
 * Server-side authorization lives in the Firestore rules tests.
 */

class FakeSubmissionAdapter implements SubmissionAdapter {
  submissions = new Map<string, Submission>()

  async writeSubmission(submission: Submission): Promise<void> {
    this.submissions.set(submission.submissionId, submission)
  }
  async readSubmission(submissionId: string): Promise<Submission | null> {
    return this.submissions.get(submissionId) ?? null
  }
  async listByStudent(studentUid: string): Promise<Submission[]> {
    return [...this.submissions.values()].filter((s) => s.studentUid === studentUid)
  }
  async listByAssignment(assignmentId: string): Promise<Submission[]> {
    return [...this.submissions.values()].filter((s) => s.assignmentId === assignmentId)
  }
  async updateGrading(
    submissionId: string,
    grading: Pick<Submission, 'score' | 'feedback' | 'status' | 'gradedAt' | 'gradedByUid'>
  ): Promise<void> {
    const current = this.submissions.get(submissionId)
    if (!current) throw new Error('not found')
    this.submissions.set(submissionId, { ...current, ...grading })
  }
}

function makeSnapshotService(opts: { fail?: boolean } = {}): SnapshotSaver & { saved: string[] } {
  const fake = {
    saved: [] as string[],
    async save(
      projectId: string,
      _bytes: Uint8Array,
      options: { kind: 'manual' | 'submission'; fileName: string }
    ): Promise<SaveResult> {
      if (opts.fail) throw new Error('Firestore unavailable')
      fake.saved.push(`${projectId}:${options.kind}`)
      return {
        meta: {
          snapshotId: `snap-${fake.saved.length}`,
          ownerUid: 'stu-1',
          projectId,
          fileName: options.fileName,
          compression: 'none',
          originalSize: 10,
          compressedSize: 10,
          chunkCount: 1,
          checksum: 'a'.repeat(64),
          createdAt: '2024-01-01T00:00:00.000Z',
          kind: options.kind
        },
        oversizeWarning: false
      }
    },
    async restore(): Promise<Uint8Array> {
      return new Uint8Array([1, 2, 3])
    }
  }
  return fake
}

function makeService(opts: {
  role?: 'student' | 'lecturer' | null
  uid?: string | null
  snapshotFail?: boolean
  noDb?: boolean
} = {}) {
  const adapter = new FakeSubmissionAdapter()
  const snapshotService = makeSnapshotService({ fail: opts.snapshotFail })
  const service = new SubmissionService({
    adapter,
    snapshotService,
    getUid: () => (opts.uid === undefined ? 'stu-1' : opts.uid),
    getRole: () => (opts.role === undefined ? 'student' : opts.role),
    exportProjectBytes: () =>
      opts.noDb ? Promise.resolve(null) : Promise.resolve(new Uint8Array([1, 2, 3])),
    now: () => new Date('2024-06-01T10:00:00.000Z')
  })
  return { service, adapter, snapshotService }
}

function validErd() {
  const project = createProject('Marketplace')
  project.tables = [createTable('users', { x: 0, y: 0 })]
  return project
}

const baseInput = {
  assignmentId: 'asg-1',
  courseId: 'c1',
  projectId: 'p1',
  fileName: 'submission.sqlite'
}

describe('submission flow', () => {
  it('submits a frozen snapshot with version 1', async () => {
    const { service, adapter, snapshotService } = makeService()
    const submission = await service.submit({ ...baseInput, erd: validErd() })

    expect(submission.version).toBe(1)
    expect(submission.status).toBe('submitted')
    expect(submission.score).toBeNull()
    expect(submission.sqliteSnapshotId).toBe('snap-1')
    expect(snapshotService.saved).toEqual(['p1:submission'])
    expect(adapter.submissions.size).toBe(1)
  })

  it('blocks submission when the ERD has blocking errors', async () => {
    const { service, adapter, snapshotService } = makeService()
    const erd = validErd()
    erd.tables[0].name = '' // validation error: empty table name

    await expect(service.submit({ ...baseInput, erd })).rejects.toThrow(SubmissionBlockedError)
    // Snapshot is never created and no submission document exists.
    expect(snapshotService.saved).toEqual([])
    expect(adapter.submissions.size).toBe(0)
  })

  it('blocks submission when no SQLite database has been generated', async () => {
    const { service } = makeService({ noDb: true })
    await expect(service.submit({ ...baseInput, erd: validErd() })).rejects.toThrow(
      /generate and open/i
    )
  })

  it('snapshot failure prevents the submission document (no partial submission)', async () => {
    const { service, adapter } = makeService({ snapshotFail: true })
    await expect(service.submit({ ...baseInput, erd: validErd() })).rejects.toThrow(
      'Firestore unavailable'
    )
    expect(adapter.submissions.size).toBe(0)
  })

  it('freezes the ERD: mutating the project afterwards never changes the submission', async () => {
    const { service, adapter } = makeService()
    const erd = validErd()
    const submission = await service.submit({ ...baseInput, erd })

    erd.name = 'MUTATED'
    erd.tables[0].name = 'mutated_users'
    erd.tables.push(createTable('extra', { x: 0, y: 0 }))

    const stored = [...adapter.submissions.values()][0]
    expect(stored.erdSnapshot.name).toBe('Marketplace')
    expect(stored.erdSnapshot.tables).toHaveLength(1)
    expect(stored.erdSnapshot.tables[0].name).toBe('users')
    expect(submission.erdSnapshot).not.toBe(erd)
  })

  it('resubmission creates version 2 and keeps version 1 intact', async () => {
    const { service, adapter } = makeService()
    const first = await service.submit({ ...baseInput, erd: validErd() })
    const second = await service.submit({ ...baseInput, erd: validErd() })

    expect(first.version).toBe(1)
    expect(second.version).toBe(2)
    expect(adapter.submissions.size).toBe(2)
  })
})

describe('grading', () => {
  it('lecturers grade with score, feedback, gradedAt and gradedByUid', async () => {
    const { service, adapter } = makeService()
    const submission = await service.submit({ ...baseInput, erd: validErd() })

    const lecturer = new SubmissionService({
      adapter,
      snapshotService: makeSnapshotService(),
      getUid: () => 'lec-1',
      getRole: () => 'lecturer',
      exportProjectBytes: () => Promise.resolve(new Uint8Array()),
      now: () => new Date('2024-06-01T10:00:00.000Z')
    })

    const graded = await lecturer.grade(submission.submissionId, 87, 'Bagus sekali!')
    expect(graded.status).toBe('graded')
    expect(graded.score).toBe(87)
    expect(graded.feedback).toBe('Bagus sekali!')
    expect(graded.gradedByUid).toBe('lec-1')
    expect(graded.gradedAt).toBe('2024-06-01T10:00:00.000Z')
  })

  it('students cannot grade (not even their own submission)', async () => {
    const { service } = makeService()
    const submission = await service.submit({ ...baseInput, erd: validErd() })
    await expect(service.grade(submission.submissionId, 100, 'self-grade')).rejects.toThrow(
      /only lecturers/i
    )
  })

  it('rejects out-of-range scores', async () => {
    const { service } = makeService({ role: 'lecturer', uid: 'lec-1' })
    await expect(service.grade('sub-x', 101, '')).rejects.toThrow(/between 0 and 100/)
    await expect(service.grade('sub-x', -1, '')).rejects.toThrow(/between 0 and 100/)
  })

  it('students cannot list submissions of an assignment', async () => {
    const { service } = makeService()
    await expect(service.listForAssignment('asg-1')).rejects.toThrow(/only lecturers/i)
  })
})

describe('review restore', () => {
  it('restores submitted SQLite bytes for in-browser review', async () => {
    const { service } = makeService()
    const submission = await service.submit({ ...baseInput, erd: validErd() })
    const bytes = await service.restoreForReview(submission)
    expect(bytes).toEqual(new Uint8Array([1, 2, 3]))
  })
})
