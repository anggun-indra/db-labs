import { Suspense, lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { AppLayout } from '@/components/AppLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { ErdEditorPage } from '@/features/erd/ErdEditorPage'
import { DatabasePage } from '@/features/database/DatabasePage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { AssignmentsPage } from '@/features/assignments/AssignmentsPage'

/**
 * The SQL Playground is lazy: it pulls Monaco and the playground feature
 * only when visited, keeping the initial bundle for ERD/database small.
 */
const SqlPlaygroundPage = lazy(() =>
  import('@/features/playground/SqlPlaygroundPage').then((m) => ({
    default: m.SqlPlaygroundPage
  }))
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'assignments', element: <AssignmentsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'projects/:projectId/erd', element: <ErdEditorPage /> },
      { path: 'projects/:projectId/database', element: <DatabasePage /> },
      {
        path: 'projects/:projectId/sql',
        element: (
          <Suspense
            fallback={
              <div className="page-centered">
                <Spin size="large" tip="Loading SQL Playground…" />
              </div>
            }
          >
            <SqlPlaygroundPage />
          </Suspense>
        )
      },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
])
