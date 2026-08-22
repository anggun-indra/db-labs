import { Result } from 'antd'
import { CloudOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import { StudentAssignments } from './StudentAssignments'
import { LecturerAssignments } from './LecturerAssignments'
import './assignments.css'

/**
 * Assignments entry (Phase 6). Requires Firebase + sign-in: in local mode
 * the page explains itself. Lecturers get the management view; students
 * see published assignments only (rules enforce both).
 */
export function AssignmentsPage() {
  const user = useAuthStore((s) => s.user)
  const mode = useAuthStore((s) => s.mode)

  if (!isFirebaseConfigured() || mode === 'local' || !user) {
    return (
      <div className="page-centered" data-testid="assignments-local-mode">
        <Result
          icon={<CloudOutlined />}
          title="Assignments need cloud sync"
          subTitle="Assignments are created by lecturers and shared through Firestore. Sign in with a Firebase-enabled deployment to see them. Your local ERD projects and SQL practice are unaffected."
        />
      </div>
    )
  }

  return user.role === 'lecturer' ? <LecturerAssignments /> : <StudentAssignments />
}
