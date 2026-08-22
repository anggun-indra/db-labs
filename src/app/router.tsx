import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/AppLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { ErdEditorPage } from '@/features/erd/ErdEditorPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:projectId/erd', element: <ErdEditorPage /> },
      { path: '*', element: <Navigate to="/" replace /> }
    ]
  }
])
