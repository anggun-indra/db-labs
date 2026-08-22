/**
 * Course management adapters (Phase 6+).
 * Handles: course CRUD, enrollments/memberships, assignment task tracking.
 */

import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { type UserRole, createFirestoreAdapters } from './cloudAdapter'
import {
  type Course,
  type CourseMembership,
  type TaskProgress,
  enhancedAssignmentSchema,
  assignmentTaskSchema
} from '@/features/assignments/domain/courseModels'

export interface CourseWithMembers extends Course {
  memberCount?: number
  myRole?: CourseRole | null
}

export interface CourseMember {
  uid: string
  name?: string
  role: CourseRole
  joinedAt: string
  completedAssignments: string[]
  currentProgress: Record<string, string>
}

export interface CourseAdapter {
  createCourse(course: Omit<Course, 'courseId' | 'createdAt'>): Promise<string>
  getCourse(courseId: string): Promise<CourseWithMembers | null>
  getCourses(lecturerUid: string): Promise<Course[]>
  getCoursesForStudent(studentUid: string): Promise<CourseWithMembers[]>
  updateCourse(courseId: string, updates: Partial<Course>): Promise<void>
  deleteCourse(courseId: string): Promise<void>
  
  // Membership operations
  joinCourse(courseId: string, uid: string): Promise<void>
  leaveCourse(courseId: string, uid: string): Promise<void>
  getMembers(courseId: string, role?: CourseRole): Promise<CourseMember[]>
  
  // Assignment operations
  createAssignment(courseId: string, assignment: any): Promise<string>
  updateAssignmentStatus(courseId: string, assignmentId: string, status: string): Promise<void>
  
  // Task progression
  recordTaskStarted(uid: string, courseId: string, assignmentId: string, taskId: string): Promise<void>
  recordTaskCompleted(uid: string, courseId: string, assignmentId: string, taskId: string): Promise<void>
  addStudentNote(uid: string, courseId: string, assignmentId: string, taskId: string, note: string): Promise<void>
  getMyProgress(uid: string, courseId: string, assignmentId: string): Promise<TaskProgress[]>
}

export function createCourseAdapter(): CourseAdapter | null {
  const adapters = createFirestoreAdapters()
  if (!adapters) return null
  
  const db = getFirestore()
  
  return {
    async createCourse(data) {
      const courseId = data.title.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
      
      await setDoc(doc(db, 'courses', courseId), {
        ...data,
        courseId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      
      return courseId
    },
    
    async getCourse(courseId) {
      const snapshot = await getDoc(doc(db, 'courses', courseId))
      if (!snapshot.exists()) return null
      
      const course = enhancedAssignmentSchema.shape.courseId.parse(snapshot.data())
      const raw = snapshot.data() as any
      
      // Count members
      const membersQuery = query(collection(db, 'courseMemberships'), where('courseId', '==', courseId))
      const membersSnapshot = await getDocs(membersQuery)
      
      return {
        ...raw,
        memberCount: membersSnapshot.size
      } as CourseWithMembers
    },
    
    async getCourses(lecturerUid) {
      const q = query(collection(db, 'courses'), where('lecturerUid', '==', lecturerUid))
      const snapshot = await getDocs(q)
      
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Course[]
    },
    
    async getCoursesForStudent(studentUid) {
      // Get all memberships for this student
      const membershipQuery = query(collection(db, 'courseMemberships'), where('uid', '==', studentUid))
      const membershipSnapshot = await getDocs(membershipQuery)
      
      const courseIds = membershipSnapshot.docs.map(d => d.data().courseId)
      const courses = []
      
      for (const courseId of courseIds) {
        const courseData = await this.getCourse(courseId)
        if (courseData) {
          const membership = membershipSnapshot.docs.find(d => d.data().courseId === courseId)?.data()
          courses.push({
            ...courseData,
            myRole: membership?.role || null
          } as CourseWithMembers)
        }
      }
      
      return courses
    },
    
    async updateCourse(courseId, updates) {
      await updateDoc(doc(db, 'courses', courseId), {
        ...updates,
        updatedAt: new Date().toISOString()
      })
    },
    
    async deleteCourse(courseId) {
      // Delete related assignments and memberships too
      const courseRef = doc(db, 'courses', courseId)
      const assignmentsQuery = query(collection(db, 'assignments'), where('courseId', '==', courseId))
      const assignmentsSnapshot = await getDocs(assignmentsQuery)
      
      const batch = []
      for (const assignmentDoc of assignmentsSnapshot.docs) {
        batch.push(deleteDoc(assignmentDoc.ref))
      }
      
      const membershipsQuery = query(collection(db, 'courseMemberships'), where('courseId', '==', courseId))
      const membershipsSnapshot = await getDocs(membershipsQuery)
      
      for (const membershipDoc of membershipsSnapshot.docs) {
        batch.push(deleteDoc(membershipDoc.ref))
      }
      
      await Promise.all(batch)
      await deleteDoc(courseRef)
    },
    
    async joinCourse(courseId, uid) {
      const membershipId = `membership-${courseId}-${uid}-${Date.now()}`
      await setDoc(doc(db, 'courseMemberships', membershipId), {
        membershipId,
        courseId,
        uid,
        role: 'student',
        joinedAt: new Date().toISOString(),
        completedAssignments: [],
        currentProgress: {}
      })
    },
    
    async leaveCourse(courseId, uid) {
      const membershipQuery = query(collection(db, 'courseMemberships'), where('uid', '==', uid))
      const snapshot = await getDocs(membershipQuery)
      
      for (const docSnap of snapshot.docs) {
        if (docSnap.data().courseId === courseId) {
          await deleteDoc(docSnap.ref)
        }
      }
    },
    
    async getMembers(courseId, roleFilter?) {
      let q = query(collection(db, 'courseMemberships'), where('courseId', '==', courseId))
      if (roleFilter) {
        q = query(q, where('role', '==', roleFilter))
      }
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as CourseMember[]
    },
    
    async createAssignment(courseId, assignment) {
      const assignmentId = assignment.title.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
      
      await setDoc(doc(db, 'assignments', assignmentId), {
        ...assignment,
        assignmentId,
        courseId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      
      return assignmentId
    },
    
    async updateAssignmentStatus(courseId, assignmentId, status) {
      await updateDoc(doc(db, 'assignments', assignmentId), {
        status,
        updatedAt: new Date().toISOString()
      })
    },
    
    async recordTaskStarted(uid, courseId, assignmentId, taskId) {
      const progressId = `progress-${uid}-${courseId}-${assignmentId}-${taskId}`
      const progressRef = doc(db, 'taskProgress', progressId)
      
      try {
        await setDoc(progressRef, {
          taskProgressId: progressId,
          taskId,
          assignmentId,
          courseId,
          uid,
          startedAt: new Date().toISOString(),
          completedAt: null,
          status: 'in-progress',
          currentStep: 0,
          notes: '',
          submitted: false,
          graded: false,
          score: null,
          feedback: ''
        })
      } catch (error: any) {
        // Document might already exist, just update it
        if (error.code === 'failed-precondition') {
          await updateDoc(progressRef, {
            startedAt: new Date().toISOString(),
            status: 'in-progress'
          })
        } else {
          throw error
        }
      }
    },
    
    async recordTaskCompleted(uid, courseId, assignmentId, taskId) {
      const progressId = `progress-${uid}-${courseId}-${assignmentId}-${taskId}`
      await updateDoc(doc(db, 'taskProgress', progressId), {
        completedAt: new Date().toISOString(),
        status: 'completed',
        submitted: true
      })
    },
    
    async addStudentNote(uid, courseId, assignmentId, taskId, note) {
      const progressId = `progress-${uid}-${courseId}-${assignmentId}-${taskId}`
      await updateDoc(doc(db, 'taskProgress', progressId), {
        notes: note
      })
    },
    
    async getMyProgress(uid, courseId, assignmentId) {
      const q = query(
        collection(db, 'taskProgress'),
        where('uid', '==', uid),
        where('courseId', '==', courseId),
        where('assignmentId', '==', assignmentId)
      )
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TaskProgress[]
    }
  }
}

export function useCourseService() {
  return createCourseAdapter() || {
    async createCourse(c: any) { return ''; },
    async getCourse(id: string) { return null; },
    async getCourses(uid: string) { return []; },
    async getCoursesForStudent(uid: string) { return []; },
    async updateCourse(id: string, u: any) {},
    async deleteCourse(id: string) {},
    async joinCourse(id: string, uid: string) {},
    async leaveCourse(id: string, uid: string) {},
    async getMembers(id: string) { return []; },
    async createAssignment(c: string, a: any) { return ''; },
    async updateAssignmentStatus(c: string, a: string, s: string) {},
    async recordTaskStarted(u: string, c: string, a: string, t: string) {},
    async recordTaskCompleted(u: string, c: string, a: string, t: string) {},
    async addStudentNote(u: string, c: string, a: string, t: string, n: string) {},
    async getMyProgress(u: string, c: string, a: string) { return []; }
  }
}
