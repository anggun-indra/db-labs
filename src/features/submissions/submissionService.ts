import type { ErdProject } from '@/features/erd/domain/schema'
import { erdProjectSchema } from '@/features/erd/domain/schema'
import { validateErd } from '@/features/erd/domain/validate'
import {
  SubmissionBlockedError,
  submissionSchema,
  type Submission
} from './domain/submissionModel'
import type { SubmissionAdapter } from '@/lib/firebase/submissionAdapter'
import type { SaveResult } from '@/features/snapshots/snapshotService'

/**
 * Submission orchestration (Phase 7). Consistency beats speed: a
 * submission is only written after the SQLite snapshot succeeds, and the
 * frozen ERD is a validated deep clone. Any failure aborts BEFORE the
 * submission document exists — no partial submissions.
 */

/** Minimal snapshot capability submissions need (eases testing). */
export interface SnapshotSaver {
  save(
    projectId: string,
    bytes: Uint8Array,
    options: { kind: 'manual' | 'submission'; fileName: string }
  ): Promise<SaveResult>
  restore(snapshotId: string): Promise<Uint8Array>
}

export interface SubmissionServiceDeps {
  adapter: SubmissionAdapter
  snapshotService: SnapshotSaver
  getUid: () => string | null
  getRole: () => 'student' | 'lecturer' | null
  exportProjectBytes: (projectId: string) => Promise<Uint8Array | null>
  now?: () => Date
}

export interface SubmitInput {
  assignmentId: string
  courseId: string
  projectId: string
  erd: ErdProject
  fileName: string
}

export class SubmissionService {
  constructor(private readonly deps: SubmissionServiceDeps) {}

  private requireSignedIn(): string {
    const uid = this.deps.getUid()
    if (!uid) throw new Error('Sign in to submit work.')
    return uid
  }

  /**
   * Submit flow (spec §26): validate ERD → block on errors → create the
   * SQLite snapshot (kind 'submission', retained forever) → freeze the ERD
   * → compute the next version → write the submission document.
   */
  async submit(input: SubmitInput): Promise<Submission> {
    const uid = this.requireSignedIn()

    const blockingErrors = validateErd(input.erd).filter((issue) => issue.severity === 'error')
    if (blockingErrors.length > 0) {
      throw new SubmissionBlockedError(
        `Fix ${blockingErrors.length} validation error(s) in the ERD before submitting.`
      )
    }

    const bytes = await this.deps.exportProjectBytes(input.projectId)
    if (!bytes) {
      throw new SubmissionBlockedError(
        'Generate and open the SQLite database first — submissions include the current database state.'
      )
    }

    const snapshot = await this.deps.snapshotService.save(input.projectId, bytes, {
      kind: 'submission',
      fileName: input.fileName
    })

    // Freeze: deep clone through zod so the stored ERD can never alias
    // live project state.
    const erdSnapshot = erdProjectSchema.parse(JSON.parse(JSON.stringify(input.erd)))

    const previous = await this.deps.adapter.listByStudent(uid)
    const latestVersion = previous
      .filter((submission) => submission.assignmentId === input.assignmentId)
      .reduce((max, submission) => Math.max(max, submission.version), 0)

    const nowIso = (this.deps.now ?? (() => new Date()))().toISOString()
    const candidate: Submission = {
      submissionId: `sub-${nowIso}-${Math.random().toString(36).slice(2, 8)}`,
      assignmentId: input.assignmentId,
      courseId: input.courseId,
      projectId: input.projectId,
      studentUid: uid,
      version: latestVersion + 1,
      erdSnapshot,
      sqliteSnapshotId: snapshot.meta.snapshotId,
      submittedAt: nowIso,
      status: 'submitted',
      score: null,
      feedback: '',
      gradedAt: null,
      gradedByUid: null
    }
    const parsed = submissionSchema.parse(candidate)
    await this.deps.adapter.writeSubmission(parsed)
    return parsed
  }

  async listMine(): Promise<Submission[]> {
    const uid = this.requireSignedIn()
    return this.deps.adapter.listByStudent(uid)
  }

  async listForAssignment(assignmentId: string): Promise<Submission[]> {
    if (this.deps.getRole() !== 'lecturer') {
      throw new Error('Only lecturers can review submissions.')
    }
    return this.deps.adapter.listByAssignment(assignmentId)
  }

  async read(submissionId: string): Promise<Submission | null> {
    return this.deps.adapter.readSubmission(submissionId)
  }

  async grade(submissionId: string, score: number, feedback: string): Promise<Submission> {
    const uid = this.requireSignedIn()
    if (this.deps.getRole() !== 'lecturer') {
      throw new Error('Only lecturers can grade submissions.')
    }
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new Error('Score must be between 0 and 100.')
    }
    await this.deps.adapter.updateGrading(submissionId, {
      score,
      feedback,
      status: 'graded',
      gradedAt: (this.deps.now ?? (() => new Date()))().toISOString(),
      gradedByUid: uid
    })
    const updated = await this.deps.adapter.readSubmission(submissionId)
    if (!updated) throw new Error('Submission not found after grading.')
    return updated
  }

  /**
   * Restore the submitted SQLite bytes into the reviewer's browser. The
   * database is imported into a throwaway review project — the reviewer
   * never touches the student's live project.
   */
  async restoreForReview(submission: Submission): Promise<Uint8Array> {
    const bytes = await this.deps.snapshotService.restore(submission.sqliteSnapshotId)
    return bytes
  }
}

/** No-op for local mode. */
export class NoopSubmissionService {
  async submit(): Promise<Submission> {
    throw new Error('Submissions require Firebase sign-in.')
  }
  async listMine(): Promise<Submission[]> {
    return []
  }
  async listForAssignment(): Promise<Submission[]> {
    return []
  }
  async read(): Promise<Submission | null> {
    return null
  }
  async grade(): Promise<Submission> {
    throw new Error('Submissions require Firebase sign-in.')
  }
  async restoreForReview(): Promise<Uint8Array> {
    throw new Error('Submissions require Firebase sign-in.')
  }
}

export type AnySubmissionService = SubmissionService | NoopSubmissionService
