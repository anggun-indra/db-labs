import { Result } from 'antd'
import { CloudOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import { isLecturerOrAdmin } from '@/lib/firebase/roles'
import { StudentAssignments } from './StudentAssignments'
import { LecturerAssignments } from './LecturerAssignments'
import './assignments.css'

/**
 * Assignments entry (Phase 6 / Phase 8 Generic Roles).
 * Instruktur / Lecturers and Admins get the management view;
 * Peserta / Students see published assignments only (rules enforce both).
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
          subTitle="Modul tugas dan praktikum dibuat oleh Instruktur dan dibagikan melalui Firestore. Masuk menggunakan akun terhubung untuk mengaksesnya. Proyek ERD lokal dan latihan SQL tetap dapat digunakan secara offline."
        />
      </div>
    )
  }

  return isLecturerOrAdmin(user.role) ? <LecturerAssignments /> : <StudentAssignments />
}
