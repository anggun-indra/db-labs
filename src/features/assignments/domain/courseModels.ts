/**
 * Enhanced course & enrollment models (Phase 6+).
 */

import { z } from 'zod'

// ===== COURSES =====

export const courseSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  lecturerUid: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string()
})

export type Course = z.infer<typeof courseSchema>

// ===== COURSE MEMBERSHIPS =====

export const COURSE_ROLES = ['student', 'ta', 'lecturer'] as const
export type CourseRole = (typeof COURSE_ROLES)[number]

export const courseMembershipSchema = z.object({
  membershipId: z.string().min(1),
  courseId: z.string().min(1),
  uid: z.string().min(1),
  role: z.enum(COURSE_ROLES),
  joinedAt: z.string(),
  completedAssignments: z.array(z.string()).default([]),
  currentProgress: z.record(z.string(), z.enum(['not-started', 'in-progress', 'completed'])).default({})
})

export type CourseMembership = z.infer<typeof courseMembershipSchema>

// ===== ASSIGNMENT TASKS =====

export const TASK_STATUSES = ['pending', 'in-progress', 'completed'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const assignmentTaskSchema = z.object({
  taskId: z.string().min(1),
  assignmentId: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  steps: z.array(z.string()),
  hints: z.array(z.string()).default([]),
  helpLinks: z.array(z.object({ title: z.string(), url: z.string() })).default([]),
  dueDate: z.string().nullable().default(null),
  maxScore: z.number().int().positive().default(100)
})

export type AssignmentTask = z.infer<typeof assignmentTaskSchema>

// ===== STUDENT TASK PROGRESS =====

export const taskProgressSchema = z.object({
  taskProgressId: z.string().min(1),
  taskId: z.string().min(1),
  assignmentId: z.string().min(1),
  courseId: z.string().min(1),
  uid: z.string().min(1),
  startedAt: z.string().nullable().default(null),
  completedAt: z.string().nullable().default(null),
  status: z.enum(TASK_STATUSES).default('pending'),
  currentStep: z.number().int().min(0).default(0),
  notes: z.string().default(''),
  submitted: z.boolean().default(false),
  graded: z.boolean().default(false),
  score: z.number().int().min(0).nullable().default(null),
  maxScore: z.number().int().min(0).default(100),
  dueDate: z.string().nullable().default(null),
  feedback: z.string().default('')
})

export type TaskProgress = z.infer<typeof taskProgressSchema>

// ===== UTILITY FUNCTIONS =====

export function calculateProgress(tasks: TaskProgress[]): number {
  if (tasks.length === 0) return 0
  const completed = tasks.filter(t => t.status === 'completed').length
  return Math.round((completed / tasks.length) * 100)
}

export function getOverdueTasks(tasks: TaskProgress[], now: number = Date.now()): TaskProgress[] {
  return tasks.filter(task => {
    if (!task.dueDate) return false
    const dueTime = new Date(task.dueDate).getTime()
    return !Number.isNaN(dueTime) && dueTime < now && task.status !== 'completed'
  })
}

export function getTotalScore(progresses: TaskProgress[]): number | null {
  const scored = progresses.filter(p => p.score !== null)
  if (scored.length === 0) return null
  
  const total = scored.reduce((sum: number, p: TaskProgress) => sum + (p.score ?? 0), 0)
  const maxPossible = progresses.reduce((sum: number, p: TaskProgress) => sum + (p.maxScore ?? 100), 0)
  
  return maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0
}


export function hasCompletionCriteriaMet(progresses: TaskProgress[]): boolean {
  return progresses.every(p => p.status === 'completed' && p.submitted)
}

// Re-export assignment schema for backward compatibility  
import { assignmentSchema } from './assignmentModel'
export const enhancedAssignmentSchema = assignmentSchema.extend({
  tasks: z.array(assignmentTaskSchema).default([]),
  helperGuide: z.object({
    overview: z.string(),
    prerequisites: z.array(z.string()),
    estimatedTime: z.string(),
    resources: z.array(z.object({
      title: z.string(),
      type: z.enum(['video', 'article', 'cheatsheet', 'documentation', 'other']),
      url: z.string(),
      optional: z.boolean().default(false)
    })).default([])
  }).default({ overview: '', prerequisites: [], estimatedTime: 'Unknown', resources: [] })
})

export type EnhancedAssignment = z.infer<typeof enhancedAssignmentSchema>
