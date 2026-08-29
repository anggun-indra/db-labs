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

import type { UserRole } from '@/lib/firebase/cloudAdapter'

export interface AssignmentServiceDeps {
  adapter: AssignmentAdapter
  getUid: () => string | null
  getRole: () => UserRole | null
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
    const role = this.deps.getRole()
    if (role !== 'lecturer' && role !== 'super_admin' && role !== 'admin') {
      throw new Error('Only lecturers can manage assignments.')
    }
    return uid
  }


  async listCourses(): Promise<Course[]> {
    if (!this.deps.getUid()) return []
    return this.deps.adapter.listCourses()
  }

  async getCourse(courseId: string): Promise<Course | null> {
    if (!this.deps.getUid()) return null
    return this.deps.adapter.getCourse(courseId)
  }

  async createCourse(input: { courseId?: string; title: string; description?: string }): Promise<Course> {
    const uid = this.requireLecturer()
    const nowIso = new Date((this.deps.now ?? Date.now)()).toISOString()
    const course: Course = {
      courseId: input.courseId ?? `course-${Date.now()}`,
      title: input.title,
      description: input.description ?? '',
      lecturerUid: uid,
      createdAt: nowIso
    }
    await this.deps.adapter.writeCourse(course)
    return course
  }

  async updateCourse(courseId: string, input: { title: string; description?: string }): Promise<Course> {
    const uid = this.requireLecturer()
    const current = await this.deps.adapter.getCourse(courseId)
    if (!current) throw new Error('Course not found.')
    const role = this.deps.getRole()
    if (current.lecturerUid !== uid && role !== 'super_admin' && role !== 'admin') {
      throw new Error('Only the course owner or super admin can edit this course.')
    }
    const updated: Course = {
      ...current,
      title: input.title.trim(),
      description: input.description?.trim() ?? ''
    }
    await this.deps.adapter.writeCourse(updated)
    return updated
  }

  async duplicateCourse(sourceCourseId: string, customTitle?: string): Promise<Course> {
    const uid = this.requireLecturer()
    const sourceCourse = await this.deps.adapter.getCourse(sourceCourseId)
    if (!sourceCourse) throw new Error('Source course not found.')

    const nowIso = new Date((this.deps.now ?? Date.now)()).toISOString()
    const newCourseId = `course-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const duplicatedCourse: Course = {
      courseId: newCourseId,
      title: customTitle?.trim() || `${sourceCourse.title} (Salinan)`,
      description: sourceCourse.description,
      lecturerUid: uid,
      createdAt: nowIso
    }

    await this.deps.adapter.writeCourse(duplicatedCourse)

    // Also duplicate all assignments belonging to the source course
    try {
      const sourceAssignments = await this.deps.adapter.listAssignmentsForCourse(sourceCourseId)
      for (let i = 0; i < sourceAssignments.length; i++) {
        const asg = sourceAssignments[i]
        const newAssignmentId = `asg-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`
        const duplicatedAssignment: Assignment = {
          ...asg,
          assignmentId: newAssignmentId,
          courseId: newCourseId,
          createdByUid: uid,
          status: 'draft',
          createdAt: nowIso,
          updatedAt: nowIso
        }
        await this.deps.adapter.writeAssignment(duplicatedAssignment)
      }
    } catch (err) {
      console.warn('Could not duplicate all assignments:', err)
    }

    return duplicatedCourse
  }

  async listAssignmentsForCourse(courseId: string): Promise<Assignment[]> {
    if (!this.deps.getUid()) return []
    return this.deps.adapter.listAssignmentsForCourse(courseId)
  }

  async deleteCourse(courseId: string): Promise<void> {
    this.requireLecturer()
    await this.deps.adapter.deleteCourse(courseId)
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
  async getCourse(): Promise<Course | null> {
    return null
  }
  async createCourse(): Promise<Course> {
    throw new Error('Course management requires Firebase sign-in.')
  }
  async updateCourse(): Promise<Course> {
    throw new Error('Course management requires Firebase sign-in.')
  }
  async duplicateCourse(): Promise<Course> {
    throw new Error('Course duplication requires Firebase sign-in.')
  }
  async listAssignmentsForCourse(): Promise<Assignment[]> {
    return []
  }
  async deleteCourse(): Promise<void> {}
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
