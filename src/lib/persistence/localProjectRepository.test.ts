import { describe, expect, it } from 'vitest'
import { LocalProjectRepository } from './localProjectRepository'
import { createProject, createTable } from '@/features/erd/domain/factory'
import type { ErdProject } from '@/features/erd/domain/schema'

function makeRepository(): LocalProjectRepository {
  window.localStorage.clear()
  return new LocalProjectRepository(window.localStorage)
}

function makeProject(name: string): ErdProject {
  return {
    ...createProject(name),
    tables: [createTable('customers', { x: 0, y: 0 })]
  }
}

describe('LocalProjectRepository', () => {
  it('saves and loads a project roundtrip', async () => {
    const repo = makeRepository()
    const project = makeProject('Coffee Shop')

    await repo.saveProject(project)
    const loaded = await repo.loadProject(project.projectId)

    expect(loaded).toEqual(project)
  })

  it('lists projects sorted by most recently updated', async () => {
    const repo = makeRepository()
    const first = makeProject('First')
    const second = makeProject('Second')

    await repo.saveProject(first)
    await repo.saveProject(second)

    const list = await repo.listProjects()
    expect(list.map((entry) => entry.name)).toEqual(['Second', 'First'])
    expect(list[0]).toMatchObject({ id: second.projectId, name: 'Second' })
    expect(list[0].createdAt).toBeTruthy()
  })

  it('updates the index entry on re-save', async () => {
    const repo = makeRepository()
    const project = makeProject('Original')
    await repo.saveProject(project)

    const renamed = { ...project, name: 'Renamed' }
    await repo.saveProject(renamed)

    const list = await repo.listProjects()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('Renamed')
  })

  it('deletes a project and its index entry', async () => {
    const repo = makeRepository()
    const project = makeProject('To Delete')
    await repo.saveProject(project)

    await repo.deleteProject(project.projectId)

    expect(await repo.loadProject(project.projectId)).toBeNull()
    expect(await repo.listProjects()).toEqual([])
  })

  it('returns null for a missing project', async () => {
    const repo = makeRepository()
    expect(await repo.loadProject('nope')).toBeNull()
  })

  it('returns null for corrupted JSON without throwing', async () => {
    const repo = makeRepository()
    window.localStorage.setItem('dblab:project:broken', '{not-json!')
    expect(await repo.loadProject('broken')).toBeNull()
  })

  it('returns null when the stored document fails schema validation', async () => {
    const repo = makeRepository()
    // Missing required fields / wrong schemaVersion.
    window.localStorage.setItem(
      'dblab:project:invalid',
      JSON.stringify({ schemaVersion: 99, tables: 'wrong' })
    )
    expect(await repo.loadProject('invalid')).toBeNull()
  })

  it('survives a corrupted index gracefully', async () => {
    const repo = makeRepository()
    window.localStorage.setItem('dblab:projects:index', 'not-an-array')
    const project = makeProject('After Corruption')
    await repo.saveProject(project)
    const list = await repo.listProjects()
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('After Corruption')
  })
})
