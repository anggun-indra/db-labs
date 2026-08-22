import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTOSAVE_DEBOUNCE_MS, flushAutosave, useErdEditorStore } from './erdEditorStore'
import { createColumn, createProject, createTable } from '@/features/erd/domain/factory'
import { projectRepository } from '@/lib/persistence/localProjectRepository'
import type { ErdProject } from '@/features/erd/domain/schema'

function makeProject(): ErdProject {
  const customers = createTable('customers', { x: 0, y: 0 }, [
    createColumn({
      id: 'c-cust-pk',
      name: 'id',
      type: 'INTEGER',
      primaryKey: true,
      nullable: false
    }),
    createColumn({ id: 'c-cust-name', name: 'name', type: 'TEXT' })
  ])
  const orders = createTable('orders', { x: 300, y: 0 }, [
    createColumn({
      id: 'c-ord-pk',
      name: 'id',
      type: 'INTEGER',
      primaryKey: true,
      nullable: false
    }),
    createColumn({ id: 'c-ord-cust', name: 'customer_id', type: 'INTEGER', nullable: false })
  ])
  return {
    ...createProject('Test Project'),
    tables: [customers, orders],
    relationships: [
      {
        id: 'rel-1',
        sourceTableId: orders.id,
        sourceColumnId: 'c-ord-cust',
        targetTableId: customers.id,
        targetColumnId: 'c-cust-pk',
        cardinality: 'many-to-one'
      }
    ]
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  window.localStorage.clear()
  useErdEditorStore.getState().closeProject()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('erdEditorStore', () => {
  it('loads a project and resets history', () => {
    const project = makeProject()
    useErdEditorStore.getState().loadProject(project)
    const state = useErdEditorStore.getState()
    expect(state.project?.projectId).toBe(project.projectId)
    expect(state.past).toHaveLength(0)
    expect(state.future).toHaveLength(0)
    expect(state.saveStatus).toBe('saved')
  })

  it('adds a table and selects it', () => {
    useErdEditorStore.getState().loadProject(makeProject())
    const id = useErdEditorStore.getState().addTable({ x: 100, y: 100 })
    const state = useErdEditorStore.getState()
    expect(state.project?.tables).toHaveLength(3)
    expect(state.selectedTableId).toBe(id)
    expect(state.past).toHaveLength(1)
  })

  it('coalesces rapid same-label mutations into one undo step', () => {
    useErdEditorStore.getState().loadProject(makeProject())
    const store = useErdEditorStore.getState()
    const tableId = store.project!.tables[0].id

    store.renameTable(tableId, 'c')
    useErdEditorStore.getState().renameTable(tableId, 'cu')
    useErdEditorStore.getState().renameTable(tableId, 'cus')

    const state = useErdEditorStore.getState()
    expect(state.project?.tables[0].name).toBe('cus')
    // One history entry for the whole typing burst.
    expect(state.past).toHaveLength(1)

    state.undo()
    expect(useErdEditorStore.getState().project?.tables[0].name).toBe('customers')
  })

  it('does not coalesce mutations separated by more than the window', () => {
    useErdEditorStore.getState().loadProject(makeProject())
    const tableId = useErdEditorStore.getState().project!.tables[0].id

    useErdEditorStore.getState().renameTable(tableId, 'first')
    vi.advanceTimersByTime(2000)
    useErdEditorStore.getState().renameTable(tableId, 'second')

    expect(useErdEditorStore.getState().past).toHaveLength(2)
  })

  it('records a drag gesture as a single undo step', () => {
    useErdEditorStore.getState().loadProject(makeProject())
    const tableId = useErdEditorStore.getState().project!.tables[0].id
    const store = () => useErdEditorStore.getState()

    // Simulated drag: first frame transient=true pushes history once,
    // subsequent frames only mutate the present.
    store().moveTable(tableId, { x: 10, y: 10 }, true)
    store().moveTable(tableId, { x: 20, y: 20 }, true)
    store().moveTable(tableId, { x: 30, y: 30 }, true)
    store().endGesture()

    expect(store().project?.tables[0].position).toEqual({ x: 30, y: 30 })
    expect(store().past).toHaveLength(1)

    store().undo()
    expect(useErdEditorStore.getState().project?.tables[0].position).toEqual({ x: 0, y: 0 })
  })

  it('supports undo and redo roundtrips', () => {
    useErdEditorStore.getState().loadProject(makeProject())
    const store = () => useErdEditorStore.getState()

    const before = store().project!
    store().addTable({ x: 500, y: 500 })
    expect(store().project?.tables).toHaveLength(3)

    store().undo()
    expect(useErdEditorStore.getState().project?.tables).toHaveLength(2)

    store().redo()
    expect(useErdEditorStore.getState().project?.tables).toHaveLength(3)

    // A new action after undo clears the redo stack.
    store().undo()
    store().addTable({ x: 1, y: 1 })
    expect(useErdEditorStore.getState().future).toHaveLength(0)
    expect(store().project?.projectId).toBe(before.projectId)
  })

  it('undo does nothing when history is empty', () => {
    useErdEditorStore.getState().loadProject(makeProject())
    const store = () => useErdEditorStore.getState()
    store().undo()
    store().undo()
    expect(useErdEditorStore.getState().project).not.toBeNull()
    expect(useErdEditorStore.getState().past).toHaveLength(0)
  })

  it('removes relationships that reference a deleted table', () => {
    useErdEditorStore.getState().loadProject(makeProject())
    const customersId = useErdEditorStore.getState().project!.tables[0].id
    useErdEditorStore.getState().removeTable(customersId)

    const state = useErdEditorStore.getState()
    expect(state.project?.tables).toHaveLength(1)
    expect(state.project?.relationships).toHaveLength(0)
    expect(state.selectedTableId).toBeNull()
  })

  it('removes relationships that reference a deleted column', () => {
    useErdEditorStore.getState().loadProject(makeProject())
    const ordersId = useErdEditorStore.getState().project!.tables[1].id
    useErdEditorStore.getState().removeColumn(ordersId, 'c-ord-cust')

    const state = useErdEditorStore.getState()
    expect(state.project?.tables[1].columns).toHaveLength(1)
    expect(state.project?.relationships).toHaveLength(0)
  })

  it('adds and removes relationships', () => {
    useErdEditorStore.getState().loadProject(makeProject())
    const store = () => useErdEditorStore.getState()
    const [customers, orders] = store().project!.tables

    const id = store().addRelationship({
      sourceTableId: orders.id,
      sourceColumnId: 'c-ord-pk',
      targetTableId: customers.id,
      targetColumnId: 'c-cust-name',
      cardinality: 'one-to-one'
    })
    expect(useErdEditorStore.getState().project?.relationships).toHaveLength(2)

    store().removeRelationship(id)
    expect(useErdEditorStore.getState().project?.relationships).toHaveLength(1)
  })

  it('duplicateTable creates a copy with fresh ids', () => {
    useErdEditorStore.getState().loadProject(makeProject())
    const store = () => useErdEditorStore.getState()
    const originalId = store().project!.tables[0].id

    const copyId = store().duplicateTable(originalId)
    const state = useErdEditorStore.getState()
    expect(copyId).not.toBe(originalId)
    expect(state.project?.tables).toHaveLength(3)
    const copy = state.project?.tables.find((t) => t.id === copyId)
    expect(copy?.name).toBe('customers_copy')
    expect(copy?.columns[0].id).not.toBe('c-cust-pk')
  })

  it('updates columns via patches', () => {
    useErdEditorStore.getState().loadProject(makeProject())
    const store = () => useErdEditorStore.getState()
    const tableId = store().project!.tables[0].id

    store().updateColumn(tableId, 'c-cust-name', { name: 'full_name', unique: true })
    const column = useErdEditorStore
      .getState()
      .project?.tables[0].columns.find((c) => c.id === 'c-cust-name')
    expect(column).toMatchObject({ name: 'full_name', unique: true })
  })

  it('viewport changes never enter history', () => {
    useErdEditorStore.getState().loadProject(makeProject())
    const store = () => useErdEditorStore.getState()
    store().setViewport({ x: 100, y: 100, zoom: 1.5 })
    store().setViewport({ x: 120, y: 110, zoom: 1.4 })
    expect(useErdEditorStore.getState().past).toHaveLength(0)
    expect(useErdEditorStore.getState().project?.viewport).toEqual({ x: 120, y: 110, zoom: 1.4 })
  })

  it('autosaves to local persistence after the debounce', async () => {
    useErdEditorStore.getState().loadProject(makeProject())
    const projectId = useErdEditorStore.getState().project!.projectId

    useErdEditorStore.getState().renameProject('Renamed')
    expect(useErdEditorStore.getState().saveStatus).toBe('dirty')

    await vi.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS + 10)
    expect(useErdEditorStore.getState().saveStatus).toBe('saved')

    const loaded = await projectRepository.loadProject(projectId)
    expect(loaded?.name).toBe('Renamed')
  })

  it('flushAutosave writes immediately', async () => {
    useErdEditorStore.getState().loadProject(makeProject())
    const projectId = useErdEditorStore.getState().project!.projectId
    useErdEditorStore.getState().renameProject('Flushed')

    await flushAutosave()
    const loaded = await projectRepository.loadProject(projectId)
    expect(loaded?.name).toBe('Flushed')
    expect(useErdEditorStore.getState().saveStatus).toBe('saved')
  })

  it('closeProject saves pending edits instead of dropping them', async () => {
    useErdEditorStore.getState().loadProject(makeProject())
    const projectId = useErdEditorStore.getState().project!.projectId
    useErdEditorStore.getState().addTable({ x: 0, y: 0 })
    expect(useErdEditorStore.getState().saveStatus).toBe('dirty')

    // Navigate away before the debounce fires.
    useErdEditorStore.getState().closeProject()
    await vi.advanceTimersByTimeAsync(0)

    const loaded = await projectRepository.loadProject(projectId)
    expect(loaded?.tables).toHaveLength(3)
  })
})
