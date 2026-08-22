import {
  assignmentSchema,
  type Assignment,
  type AssignmentStatus,
  type Course
} from './domain/assignmentModel'
import type { AssignmentAdapter } from '@/lib/firebase/assignmentAdapter'

/**
 * Assignment orchestration (Phase 6). Authorization is enforced by
 * Firestore rules (lecturer role for writes, published-only reads for
 * students); this service shapes the flows and validates documents.
 */

export interface AssignmentServiceDeps {
  adapter: AssignmentAdapter
  getUid: () => string | null
  getRole: () => 'student' | 'lecturer' | null
  now?: () => number
}

export type AssignmentInput = Omit<Assignment, 'createdAt' | 'updatedAt' | 'createdByUid'> & {
  createdAt?: string
  updatedAt?: string
}

export class AssignmentService {
  constructor(private readonly deps: AssignmentServiceDeps) {}

  private requireLecturer(): string {
    const uid = this.deps.getUid()
    if (!uid) throw new Error('Sign in to manage assignments.')
    if (this.deps.getRole() !== 'lecturer') {
      throw new Error('Only lecturers can manage assignments.')
    }
    return uid
  }

  async listCourses(): Promise<Course[]> {
    if (!this.deps.getUid()) return []
    return this.deps.adapter.listCourses()
  }

  /** Students only ever receive published assignments. */
  async listPublished(): Promise<Assignment[]> {
    if (!this.deps.getUid()) return []
    return this.deps.adapter.listPublishedAssignments()
  }

  async listForLecturer(): Promise<Assignment[]> {
    const uid = this.requireLecturer()
    return this.deps.adapter.listLecturerAssignments(uid)
  }

  async read(assignmentId: string): Promise<Assignment | null> {
    return this.deps.adapter.readAssignment(assignmentId)
  }

  async create(input: Omit<AssignmentInput, 'assignmentId'> & { assignmentId?: string }): Promise<Assignment> {
    const uid = this.requireLecturer()
    const nowIso = new Date((this.deps.now ?? Date.now)()).toISOString()
    const candidate: Assignment = {
      ...input,
      assignmentId: input.assignmentId ?? `asg-${nowIso}-${Math.random().toString(36).slice(2, 8)}`,
      createdByUid: uid,
      createdAt: input.createdAt ?? nowIso,
      updatedAt: nowIso
    }
    const parsed = assignmentSchema.parse(candidate)
    await this.deps.adapter.writeAssignment(parsed)
    return parsed
  }

  async update(assignment: Assignment): Promise<Assignment> {
    this.requireLecturer()
    const updated: Assignment = {
      ...assignment,
      updatedAt: new Date((this.deps.now ?? Date.now)()).toISOString()
    }
    const parsed = assignmentSchema.parse(updated)
    await this.deps.adapter.writeAssignment(parsed)
    return parsed
  }

  async setStatus(assignmentId: string, status: AssignmentStatus): Promise<Assignment> {
    const current = await this.deps.adapter.readAssignment(assignmentId)
    if (!current) throw new Error('Assignment not found.')
    return this.update({ ...current, status })
  }

  /**
   * Destructive delete is only allowed for drafts. Once published (and
   * especially once submissions exist, Phase 7), lecturers archive instead.
   */
  async deleteDraft(assignmentId: string): Promise<void> {
    this.requireLecturer()
    const current = await this.deps.adapter.readAssignment(assignmentId)
    if (!current) return
    if (current.status !== 'draft') {
      throw new Error('Only drafts can be deleted. Archive published assignments instead.')
    }
    await this.deps.adapter.deleteAssignment(assignmentId)
  }

  /** Combined initialization script: starter SQL first, then sample data. */
  buildInitScript(assignment: Assignment): string {
    return [assignment.starterSql.trim(), assignment.sampleData.trim()]
      .filter((part) => part.length > 0)
      .join('\n')
  }
}

/** No-op for local mode. */
export class NoopAssignmentService {
  async listCourses(): Promise<Course[]> {
    return []
  }
  async listPublished(): Promise<Assignment[]> {
    return []
  }
  async listForLecturer(): Promise<Assignment[]> {
    return []
  }
  async read(): Promise<Assignment | null> {
    return null
  }
  async create(): Promise<Assignment> {
    throw new Error('Assignments require Firebase sign-in.')
  }
  async update(assignment: Assignment): Promise<Assignment> {
    return assignment
  }
  async setStatus(): Promise<Assignment> {
    throw new Error('Assignments require Firebase sign-in.')
  }
  async deleteDraft(): Promise<void> {}
  buildInitScript(assignment: Assignment): string {
    return [assignment.starterSql.trim(), assignment.sampleData.trim()]
      .filter((part) => part.length > 0)
      .join('\n')
  }
}

export type AnyAssignmentService = AssignmentService | NoopAssignmentService
