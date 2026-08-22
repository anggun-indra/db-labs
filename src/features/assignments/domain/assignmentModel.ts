import { z } from 'zod'
import { erdProjectSchema } from '@/features/erd/domain/schema'

/**
 * Course & assignment models (Phase 6). Assignments are lecturer-owned
 * templates; students never edit the definition — starting an assignment
 * clones the starter ERD into their own local project (spec §24).
 */

export const ASSIGNMENT_STATUSES = ['draft', 'published', 'archived'] as const
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number]

export const courseSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  lecturerUid: z.string().min(1),
  createdAt: z.string()
})

export type Course = z.infer<typeof courseSchema>

export const assignmentSchema = z.object({
  assignmentId: z.string().min(1),
  courseId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  instructions: z.string().default(''),
  learningObjectives: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  dueAt: z.string().nullable().default(null),
  status: z.enum(ASSIGNMENT_STATUSES),
  starterErd: erdProjectSchema.nullable().default(null),
  starterSql: z.string().default(''),
  sampleData: z.string().default(''),
  createdByUid: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string()
})

export type Assignment = z.infer<typeof assignmentSchema>

/** Student-facing progress derived from local links (Phase 6 scope). */
export const STUDENT_PROGRESS = ['not-started', 'in-progress', 'submitted'] as const
export type StudentProgress = (typeof STUDENT_PROGRESS)[number]

export function formatDueDate(dueAt: string | null): string {
  if (!dueAt) return 'No due date'
  const date = new Date(dueAt)
  if (Number.isNaN(date.getTime())) return 'No due date'
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

export function isOverdue(dueAt: string | null, now: number = Date.now()): boolean {
  if (!dueAt) return false
  const time = new Date(dueAt).getTime()
  return !Number.isNaN(time) && time < now
}
