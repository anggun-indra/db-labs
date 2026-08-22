import { z } from 'zod'
import { erdProjectSchema } from '@/features/erd/domain/schema'

/**
 * Submission model (Phase 7). A submission is an IMMUTABLE logical
 * snapshot: the frozen ERD, the SQLite snapshot id and the timestamp are
 * captured at submit time. The student's live project keeps being mutable;
 * resubmission simply creates the next version (spec §26).
 */

export const SUBMISSION_STATUSES = ['submitted', 'graded'] as const
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

export const submissionSchema = z.object({
  submissionId: z.string().min(1),
  assignmentId: z.string().min(1),
  courseId: z.string().min(1),
  projectId: z.string().min(1),
  studentUid: z.string().min(1),
  version: z.number().int().min(1),
  erdSnapshot: erdProjectSchema,
  sqliteSnapshotId: z.string().min(1),
  submittedAt: z.string(),
  status: z.enum(SUBMISSION_STATUSES),
  score: z.number().min(0).max(100).nullable().default(null),
  feedback: z.string().default(''),
  gradedAt: z.string().nullable().default(null),
  gradedByUid: z.string().nullable().default(null)
})

export type Submission = z.infer<typeof submissionSchema>

export class SubmissionBlockedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SubmissionBlockedError'
  }
}
