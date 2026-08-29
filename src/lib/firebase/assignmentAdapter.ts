import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where
} from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { getFirebaseApp } from './config'
import {
  assignmentSchema,
  courseSchema,
  type Assignment,
  type Course
} from '@/features/assignments/domain/assignmentModel'

/**
 * Firestore access for courses & assignments (Phase 6). Students only ever
 * see published assignments; draft visibility for lecturers is enforced by
 * security rules as well (defense in depth — spec §39).
 */

export interface AssignmentAdapter {
  listCourses(): Promise<Course[]>
  getCourse(courseId: string): Promise<Course | null>
  writeCourse(course: Course): Promise<void>
  deleteCourse(courseId: string): Promise<void>
  listPublishedAssignments(): Promise<Assignment[]>
  listLecturerAssignments(lecturerUid: string): Promise<Assignment[]>
  listAssignmentsForCourse(courseId: string): Promise<Assignment[]>
  readAssignment(assignmentId: string): Promise<Assignment | null>
  writeAssignment(assignment: Assignment): Promise<void>
  deleteAssignment(assignmentId: string): Promise<void>
}

export function createAssignmentAdapter(): AssignmentAdapter | null {
  const app = getFirebaseApp()
  if (!app) return null
  const db = getFirestore(app)

  function parseAssignments(snapshot: Awaited<ReturnType<typeof getDocs>>): Assignment[] {
    const assignments: Assignment[] = []
    snapshot.forEach((d) => {
      const parsed = assignmentSchema.safeParse(d.data())
      if (parsed.success) assignments.push(parsed.data)
    })
    return assignments
  }

  return {
    async listCourses() {
      const snapshot = await getDocs(collection(db, 'courses'))
      const courses: Course[] = []
      snapshot.forEach((d) => {
        const parsed = courseSchema.safeParse(d.data())
        if (parsed.success) courses.push(parsed.data)
      })
      return courses
    },

    async getCourse(courseId) {
      const snapshot = await getDoc(doc(db, 'courses', courseId))
      if (!snapshot.exists()) return null
      const parsed = courseSchema.safeParse(snapshot.data())
      return parsed.success ? parsed.data : null
    },

    async writeCourse(course) {
      await setDoc(doc(db, 'courses', course.courseId), course)
    },

    async deleteCourse(courseId) {
      await deleteDoc(doc(db, 'courses', courseId))
    },

    async listPublishedAssignments() {
      const snapshot = await getDocs(
        query(collection(db, 'assignments'), where('status', '==', 'published'))
      )
      return parseAssignments(snapshot)
    },

    async listLecturerAssignments(lecturerUid) {
      const snapshot = await getDocs(
        query(collection(db, 'assignments'), where('createdByUid', '==', lecturerUid))
      )
      return parseAssignments(snapshot)
    },

    async listAssignmentsForCourse(courseId) {
      const snapshot = await getDocs(
        query(collection(db, 'assignments'), where('courseId', '==', courseId))
      )
      return parseAssignments(snapshot)
    },

    async readAssignment(assignmentId) {
      const snapshot = await getDoc(doc(db, 'assignments', assignmentId))
      if (!snapshot.exists()) return null
      const parsed = assignmentSchema.safeParse(snapshot.data())
      return parsed.success ? parsed.data : null
    },

    async writeAssignment(assignment) {
      await setDoc(doc(db, 'assignments', assignment.assignmentId), assignment)
    },

    async deleteAssignment(assignmentId) {
      await deleteDoc(doc(db, 'assignments', assignmentId))
    }
  }
}
