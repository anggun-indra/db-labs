import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProjectsPage } from './ProjectsPage'

function renderProjectsPage() {
  return render(
    <MemoryRouter initialEntries={['/projects']}>
      <Routes>
        <Route path="/projects" element={<ProjectsPage />} />
        <Route
          path="/projects/:projectId/erd"
          element={<div data-testid="erd-editor-stub">ERD EDITOR</div>}
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProjectsPage', () => {
  it('shows an empty state when there are no projects', async () => {
    renderProjectsPage()
    expect(await screen.findByText(/No projects yet/)).toBeInTheDocument()
  })

  it('creates a project and opens the ERD editor', async () => {
    const user = userEvent.setup()
    renderProjectsPage()

    await screen.findByText(/No projects yet/)
    // Two "New project" buttons exist in the empty state (header + empty card).
    const newButtons = screen.getAllByRole('button', { name: /New project/i })
    await user.click(newButtons[0])

    const dialog = await screen.findByRole('dialog')
    const input = dialog.querySelector('input')
    expect(input).not.toBeNull()
    await user.type(input!, 'Coffee Shop')
    await user.click(screen.getByRole('button', { name: /Create/i }))

    expect(await screen.findByTestId('erd-editor-stub')).toBeInTheDocument()

    // The project must be persisted locally (spec §52 acceptance: reload-safe).
    const index = JSON.parse(window.localStorage.getItem('dblab:projects:index') ?? '[]') as {
      name: string
    }[]
    expect(index.some((entry) => entry.name === 'Coffee Shop')).toBe(true)
  })

  it('lists previously saved projects', async () => {
    const user = userEvent.setup()
    renderProjectsPage()

    // Create two projects via the UI, going back between them.
    await user.click(await screen.findByRole('button', { name: /New project/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(dialog.querySelector('input')!, 'Alpha')
    await user.click(screen.getByRole('button', { name: /Create/i }))
    await screen.findByTestId('erd-editor-stub')

    renderProjectsPage()
    expect(await screen.findByText('Alpha')).toBeInTheDocument()
  })

  it('deletes a project from the list', async () => {
    const user = userEvent.setup()
    renderProjectsPage()

    await user.click(await screen.findByRole('button', { name: /New project/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(dialog.querySelector('input')!, 'Doomed')
    await user.click(screen.getByRole('button', { name: /Create/i }))
    await screen.findByTestId('erd-editor-stub')

    renderProjectsPage()
    await screen.findByText('Doomed')
    await user.click(screen.getByLabelText('Delete Doomed'))
    await user.click(await screen.findByRole('button', { name: /^Delete$/ }))

    await waitFor(() => {
      expect(screen.queryByText('Doomed')).not.toBeInTheDocument()
    })
  })
})
