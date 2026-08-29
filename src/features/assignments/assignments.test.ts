// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { AssignmentService } from './assignmentService'
import type { AssignmentAdapter } from '@/lib/firebase/assignmentAdapter'
import {
  assignmentSchema,
  formatDueDate,
  isOverdue,
  type Assignment,
  type Course
} from './domain/assignmentModel'
import { cloneStarterErd } from './domain/starterClone'
import { deriveProgress, getLink, linkProject, loadLinks } from './domain/assignmentLinks'
import { createProject, createTable } from '@/features/erd/domain/factory'
import { erdProjectSchema } from '@/features/erd/domain/schema'

/**
 * Phase 6 tests: assignment model, starter cloning (template never
 * mutated), local progress links and lecturer workflows against a fake
 * adapter. Authorization itself is enforced by Firestore rules — covered
 * by the emulator rules tests.
 */

class FakeAssignmentAdapter implements AssignmentAdapter {
  assignments = new Map<string, Assignment>()
  courses: Course[] = [{ courseId: 'c1', title: 'Manajemen Database', description: '', lecturerUid: 'lec-1', createdAt: '2024-01-01' }]

  async listCourses(): Promise<Course[]> {
    return this.courses
  }
  async getCourse(courseId: string): Promise<Course | null> {
    return this.courses.find((c) => c.courseId === courseId) ?? null
  }
  async writeCourse(course: Course): Promise<void> {
    const idx = this.courses.findIndex((c) => c.courseId === course.courseId)
    if (idx >= 0) this.courses[idx] = course
    else this.courses.push(course)
  }
  async deleteCourse(courseId: string): Promise<void> {
    this.courses = this.courses.filter((c) => c.courseId !== courseId)
  }
  async listPublishedAssignments(): Promise<Assignment[]> {
    return [...this.assignments.values()].filter((a) => a.status === 'published')
  }
  async listLecturerAssignments(lecturerUid: string): Promise<Assignment[]> {
    return [...this.assignments.values()].filter((a) => a.createdByUid === lecturerUid)
  }
  async listAssignmentsForCourse(courseId: string): Promise<Assignment[]> {
    return [...this.assignments.values()].filter((a) => a.courseId === courseId)
  }
  async readAssignment(assignmentId: string): Promise<Assignment | null> {
    return this.assignments.get(assignmentId) ?? null
  }
  async writeAssignment(assignment: Assignment): Promise<void> {
    this.assignments.set(assignment.assignmentId, assignment)
  }
  async deleteAssignment(assignmentId: string): Promise<void> {
    this.assignments.delete(assignmentId)
  }
}


function makeService(opts: { uid?: string | null; role?: 'student' | 'lecturer' | null } = {}) {
  const adapter = new FakeAssignmentAdapter()
  const service = new AssignmentService({
    adapter,
    getUid: () => (opts.uid === undefined ? 'lec-1' : opts.uid),
    getRole: () => (opts.role === undefined ? 'lecturer' : opts.role),
    now: () => 1700000000000
  })
  return { service, adapter }
}

const validInput = {
  title: 'Marketplace Database',
  courseId: 'c1',
  dueAt: '2025-01-01T00:00:00.000Z',
  description: 'Design a marketplace ERD.',
  instructions: 'Create tables for users, products and orders.',
  learningObjectives: ['Model 1:N relationships'],
  requirements: ['At least 4 tables'],
  status: 'draft' as const,
  starterErd: null,
  starterSql: '',
  sampleData: ''
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('assignment model', () => {
  it('applies defaults for optional teaching fields', () => {
    const parsed = assignmentSchema.parse({
      assignmentId: 'a1',
      courseId: 'c1',
      title: 'Tugas 1',
      status: 'draft',
      createdByUid: 'lec-1',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    })
    expect(parsed.learningObjectives).toEqual([])
    expect(parsed.starterErd).toBeNull()
    expect(parsed.starterSql).toBe('')
  })

  it('rejects unknown statuses', () => {
    const result = assignmentSchema.safeParse({ ...validInput, assignmentId: 'a1', status: 'live' })
    expect(result.success).toBe(false)
  })

  it('renders due dates and detects overdue', () => {
    expect(formatDueDate(null)).toBe('No due date')
    expect(formatDueDate('not-a-date')).toBe('No due date')
    expect(formatDueDate('2025-01-15T10:00:00.000Z')).toMatch(/2025/)
    expect(isOverdue('2020-01-01T00:00:00.000Z')).toBe(true)
    expect(isOverdue('2999-01-01T00:00:00.000Z')).toBe(false)
    expect(isOverdue(null)).toBe(false)
  })
})

describe('starter cloning', () => {
  it('deep-clones the starter ERD with fresh IDs and remapped relationships', () => {
    const template = createProject('Template')
    const users = createTable('users', { x: 0, y: 0 })
    const orders = createTable('orders', { x: 300, y: 0 })
    template.tables = [users, orders]
    template.relationships = [
      {
        id: 'rel-1',
        sourceTableId: orders.id,
        sourceColumnId: orders.columns[0].id,
        targetTableId: users.id,
        targetColumnId: users.columns[0].id,
        cardinality: 'many-to-one'
      }
    ]

    const clone = cloneStarterErd(template, 'Student work')
    expect(erdProjectSchema.parse(clone)).toEqual(clone)
    expect(clone.projectId).not.toBe(template.projectId)
    expect(clone.name).toBe('Student work')
    expect(clone.tables[0].id).not.toBe(template.tables[0].id)
    expect(clone.tables[0].columns[0].id).not.toBe(template.tables[0].columns[0].id)

    const relationship = clone.relationships[0]
    expect(relationship.sourceTableId).toBe(clone.tables[1].id)
    expect(relationship.targetTableId).toBe(clone.tables[0].id)
    expect(relationship.sourceColumnId).toBe(clone.tables[1].columns[0].id)

    // Template stays untouched.
    expect(template.tables[0].id).toBe(users.id)
    expect(template.relationships[0].id).toBe('rel-1')
  })
})

describe('assignment links and progress', () => {
  it('links projects and derives student progress', () => {
    expect(deriveProgress('a1', new Set(['p1']))).toBe('not-started')

    linkProject('a1', 'p1')
    expect(getLink('a1')?.projectId).toBe('p1')
    expect(deriveProgress('a1', new Set(['p1']))).toBe('in-progress')

    // If the linked project was deleted, the assignment looks unstarted.
    expect(deriveProgress('a1', new Set())).toBe('not-started')
  })

  it('ignores malformed stored links', () => {
    window.localStorage.setItem('dblab:assignment-links', JSON.stringify({ bad: { nope: 1 } }))
    expect(loadLinks()).toEqual({})
  })
})

describe('AssignmentService lecturer flows', () => {
  it('creates draft assignments with ownership metadata', async () => {
    const { service, adapter } = makeService()
    const created = await service.create(validInput)
    expect(created.status).toBe('draft')
    expect(created.createdByUid).toBe('lec-1')
    expect(adapter.assignments.size).toBe(1)
  })

  it('publishes, unpublishes and archives', async () => {
    const { service } = makeService()
    const created = await service.create(validInput)
    const published = await service.setStatus(created.assignmentId, 'published')
    expect(published.status).toBe('published')
    const unpublished = await service.setStatus(created.assignmentId, 'draft')
    expect(unpublished.status).toBe('draft')
    const archived = await service.setStatus(created.assignmentId, 'archived')
    expect(archived.status).toBe('archived')
  })

  it('only deletes drafts; published assignments must be archived', async () => {
    const { service } = makeService()
    const created = await service.create(validInput)
    await service.setStatus(created.assignmentId, 'published')
    await expect(service.deleteDraft(created.assignmentId)).rejects.toThrow(/archive/i)

    const draft = await service.create({ ...validInput, title: 'Draft only' })
    await service.deleteDraft(draft.assignmentId)
    expect(await service.read(draft.assignmentId)).toBeNull()
  })

  it('combines starter SQL and sample data into one init script', async () => {
    const { service } = makeService()
    const created = await service.create({
      ...validInput,
      starterSql: 'CREATE TABLE t (id INTEGER);',
      sampleData: 'INSERT INTO t VALUES (1);'
    })
    expect(service.buildInitScript(created)).toBe(
      'CREATE TABLE t (id INTEGER);\nINSERT INTO t VALUES (1);'
    )
  })
})

describe('AssignmentService authorization guards', () => {
  it('rejects management by students (defense in depth; rules are authoritative)', async () => {
    const { service } = makeService({ role: 'student' })
    await expect(service.create(validInput)).rejects.toThrow(/lecturer/i)
    await expect(service.listForLecturer()).rejects.toThrow(/lecturer/i)
  })

  it('rejects management without sign-in', async () => {
    const { service } = makeService({ uid: null })
    await expect(service.create(validInput)).rejects.toThrow(/sign in/i)
  })

  it('students only ever receive published assignments', async () => {
    const { service, adapter } = makeService()
    await service.create(validInput)
    const created = [...adapter.assignments.values()][0]
    await service.setStatus(created.assignmentId, 'published')
    await service.create({ ...validInput, title: 'Hidden draft' })

    const studentService = new AssignmentService({
      adapter,
      getUid: () => 'stu-1',
      getRole: () => 'student'
    })
    const visible = await studentService.listPublished()
    expect(visible.map((a) => a.title)).toEqual(['Marketplace Database'])
  })

  it('supports creating and retrieving courses for lecturers', async () => {
    const { service } = makeService()
    const course = await service.createCourse({
      courseId: 'c-test',
      title: 'Basis Data Lanjut',
      description: 'Materi SQL tingkat lanjut'
    })
    expect(course.courseId).toBe('c-test')
    expect(course.title).toBe('Basis Data Lanjut')

    const fetched = await service.getCourse('c-test')
    expect(fetched?.title).toBe('Basis Data Lanjut')

    const list = await service.listCourses()
    expect(list.some((c) => c.courseId === 'c-test')).toBe(true)

    await service.deleteCourse('c-test')
    expect(await service.getCourse('c-test')).toBeNull()
  })

  it('updates course if user is owner', async () => {
    const { service } = makeService({ uid: 'lec-1' })
    const updated = await service.updateCourse('c1', {
      title: 'Manajemen Database Revisi',
      description: 'Deskripsi baru'
    })
    expect(updated.title).toBe('Manajemen Database Revisi')
    expect(updated.description).toBe('Deskripsi baru')

    const nonOwnerService = new AssignmentService({
      adapter: (service as unknown as { deps: { adapter: AssignmentAdapter } }).deps.adapter,
      getUid: () => 'lec-other',
      getRole: () => 'lecturer'
    })
    await expect(
      nonOwnerService.updateCourse('c1', { title: 'Hijacked title' })
    ).rejects.toThrow(/owner or super admin/i)
  })

  it('duplicates course and its assignments for the requesting lecturer', async () => {
    const { service } = makeService({ uid: 'lec-2' })
    // Seed an assignment in course c1
    await service.create({
      ...validInput,
      assignmentId: 'asg-source-1',
      courseId: 'c1',
      title: 'Modul SQL 1'
    })

    const duplicated = await service.duplicateCourse('c1', 'Manajemen DB Kloning')
    expect(duplicated.courseId).not.toBe('c1')
    expect(duplicated.title).toBe('Manajemen DB Kloning')
    expect(duplicated.lecturerUid).toBe('lec-2')

    // Verify duplicated assignment
    const duplicatedAssignments = await service.listAssignmentsForCourse(duplicated.courseId)
    expect(duplicatedAssignments.length).toBe(1)
    expect(duplicatedAssignments[0].courseId).toBe(duplicated.courseId)
    expect(duplicatedAssignments[0].createdByUid).toBe('lec-2')
    expect(duplicatedAssignments[0].status).toBe('draft')
    expect(duplicatedAssignments[0].title).toBe('Modul SQL 1')
  })
})

