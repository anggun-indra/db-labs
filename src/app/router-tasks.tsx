import { Routes, Route } from 'react-router-dom'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { ErdEditorPage } from '@/features/erd/ErdEditorPage'
import { DatabaseManagementPage } from '@/features/database/DatabaseManagementPage'
import { SqlPlaygroundPage } from '@/features/playground/SqlPlaygroundPage'
import { AssignmentsPage } from '@/features/assignments/AssignmentsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { CourseListPage } from '@/features/courses/CourseListPage'
import { CourseDetailPage } from '@/features/courses/CourseDetailPage'
import { AssignmentTaskPage } from '@/features/assignments/AssignmentTaskPage'
import { CourseCreatePage } from '@/features/courses/CourseCreatePage'

/**
 * Updated routing with Phase 6+ course management features.
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Main sections */}
      <Route path="/" element={<DashboardPage />} />
      
      {/* Courses - Phase 6+ */}
      <Route path="/courses" element={<CourseListPage />} />
      <Route path="/courses/create" element={<CourseCreatePage />} />
      <Route path="/courses/:courseId" element={<CourseDetailPage />} />
      <Route 
        path="/courses/:courseId/assignments/:assignmentId"
        element={<AssignmentTaskPage />}
      />
      
      {/* Projects */}
      <Route path="/projects" element={<ProjectsPage />} />
      <Route 
        path="projects/:projectId/erd" 
        element={<ErdEditorPage />} 
      />
      <Route 
        path="projects/:projectId/database" 
        element={<DatabaseManagementPage />} 
      />
      <Route 
        path="projects/:projectId/sql" 
        element={<SqlPlaygroundPage />} 
      />
      
      {/* Assignments & Settings */}
      <Route path="/assignments" element={<AssignmentsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      
      {/* Fallback */}
      <Route path="*" element={<div>404 Not Found</div>} />
    </Routes>
  )
}
