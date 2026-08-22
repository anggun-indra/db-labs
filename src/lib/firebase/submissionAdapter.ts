import {
  collection,
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
  submissionSchema,
  type Submission
} from '@/features/submissions/domain/submissionModel'

/**
 * Firestore access for submissions (Phase 7). Queries use single-field
 * equality filters only (no composite indexes needed); the latest-version
 * computation filters by assignment client-side.
 */

export interface SubmissionAdapter {
  writeSubmission(submission: Submission): Promise<void>
  readSubmission(submissionId: string): Promise<Submission | null>
  listByStudent(studentUid: string): Promise<Submission[]>
  listByAssignment(assignmentId: string): Promise<Submission[]>
  updateGrading(
    submissionId: string,
    grading: Pick<Submission, 'score' | 'feedback' | 'status' | 'gradedAt' | 'gradedByUid'>
  ): Promise<void>
}

export function createSubmissionAdapter(): SubmissionAdapter | null {
  const app = getFirebaseApp()
  if (!app) return null
  const db = getFirestore(app)

  function parse(snapshot: Awaited<ReturnType<typeof getDocs>>): Submission[] {
    const submissions: Submission[] = []
    snapshot.forEach((d) => {
      const parsed = submissionSchema.safeParse(d.data())
      if (parsed.success) submissions.push(parsed.data)
    })
    return submissions
  }

  return {
    async writeSubmission(submission) {
      await setDoc(doc(db, 'submissions', submission.submissionId), submission)
    },

    async readSubmission(submissionId) {
      const snapshot = await getDoc(doc(db, 'submissions', submissionId))
      if (!snapshot.exists()) return null
      const parsed = submissionSchema.safeParse(snapshot.data())
      return parsed.success ? parsed.data : null
    },

    async listByStudent(studentUid) {
      const snapshot = await getDocs(
        query(collection(db, 'submissions'), where('studentUid', '==', studentUid))
      )
      return parse(snapshot)
    },

    async listByAssignment(assignmentId) {
      const snapshot = await getDocs(
        query(collection(db, 'submissions'), where('assignmentId', '==', assignmentId))
      )
      return parse(snapshot)
    },

    async updateGrading(submissionId, grading) {
      // Read-modify-write restricted to grading fields; rules verify the
      // affected keys server-side as well.
      const current = await getDoc(doc(db, 'submissions', submissionId))
      if (!current.exists()) throw new Error('Submission not found.')
      const parsed = submissionSchema.safeParse(current.data())
      if (!parsed.success) throw new Error('Stored submission is malformed.')
      await setDoc(doc(db, 'submissions', submissionId), { ...parsed.data, ...grading })
    }
  }
}
