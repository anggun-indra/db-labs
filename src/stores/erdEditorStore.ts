import { create } from 'zustand'
import type {
  ErdColumn,
  ErdProject,
  ErdRelationship,
  ErdTable,
  Position,
  Viewport
} from '@/features/erd/domain/schema'
import { createTable, duplicateTable as duplicateTableFactory } from '@/features/erd/domain/factory'
import { projectRepository } from '@/lib/persistence/localProjectRepository'
import { getProjectSync } from '@/lib/firebase/syncInstance'

/**
 * ERD editor state (spec §19: Zustand -> local persistence -> dirty -> save).
 *
 * Undo/redo design (see docs/decisions/0005):
 * - every mutation goes through `commit(label, updater)`
 * - mutations with the same label inside COALESCE_WINDOW_MS share one history
 *   entry, so typing a table name produces a single undo step
 * - node drags use a "gesture": history is pushed once on the first position
 *   change, later drag frames only mutate the present
 * - viewport changes never enter history
 */

const HISTORY_LIMIT = 100
const COALESCE_WINDOW_MS = 1200
export const AUTOSAVE_DEBOUNCE_MS = 1000

export type SaveStatus = 'saved' | 'saving' | 'dirty' | 'offline'

export interface PendingConnection {
  sourceTableId: string
  sourceColumnId: string
  targetTableId: string
  targetColumnId: string
}

interface InternalFields {
  lastLabel: string | null
  lastCommitAt: number
  gestureActive: boolean
}

export interface ErdEditorState {
  project: ErdProject | null
  past: ErdProject[]
  future: ErdProject[]
  selectedTableId: string | null
  selectedRelationshipId: string | null
  pendingConnection: PendingConnection | null
  saveStatus: SaveStatus

  loadProject(project: ErdProject): void
  closeProject(): void

  renameProject(name: string): void
  addTable(position?: Position): string
  renameTable(tableId: string, name: string): void
  moveTable(tableId: string, position: Position, transient: boolean): void
  removeTable(tableId: string): void
  duplicateTable(tableId: string): string | null

  addColumn(tableId: string): string | null
  updateColumn(tableId: string, columnId: string, patch: Partial<Omit<ErdColumn, 'id'>>): void
  removeColumn(tableId: string, columnId: string): void

  addRelationship(relationship: Omit<ErdRelationship, 'id'> & { id?: string }): string
  removeRelationship(relationshipId: string): void

  setViewport(viewport: Viewport): void
  selectTable(tableId: string | null): void
  selectRelationship(relationshipId: string | null): void
  setPendingConnection(connection: PendingConnection | null): void
  endGesture(): void

  undo(): void
  redo(): void
  setSaveStatus(status: SaveStatus): void
}

function updateTable(
  project: ErdProject,
  tableId: string,
  updater: (table: ErdTable) => ErdTable
): ErdProject {
  return {
    ...project,
    tables: project.tables.map((t) => (t.id === tableId ? updater(t) : t))
  }
}

function removeOrphanRelationships(project: ErdProject): ErdProject {
  const tableIds = new Set(project.tables.map((t) => t.id))
  const columnIds = new Set(project.tables.flatMap((t) => t.columns.map((c) => c.id)))
  return {
    ...project,
    relationships: project.relationships.filter(
      (r) =>
        tableIds.has(r.sourceTableId) &&
        tableIds.has(r.targetTableId) &&
        columnIds.has(r.sourceColumnId) &&
        columnIds.has(r.targetColumnId)
    )
  }
}

let autosaveTimer: ReturnType<typeof setTimeout> | undefined

export function flushAutosave(): Promise<void> {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer)
    autosaveTimer = undefined
  }
  const { project, saveStatus } = useErdEditorStore.getState()
  if (!project || saveStatus === 'saving' || saveStatus === 'offline') return Promise.resolve()
  useErdEditorStore.setState({ saveStatus: 'saving' })
  return projectRepository
    .saveProject(project)
    .then(() => {
      useErdEditorStore.setState({ saveStatus: 'saved' })
      // Write-behind cloud sync (Phase 4): debounced, no-op in local mode.
      getProjectSync().schedulePush(project.projectId)
    })
    .catch((error) => {
      console.error('Autosave failed:', error)
      useErdEditorStore.setState({ saveStatus: 'dirty' })
    })
}

function scheduleAutosave(): void {
  if (typeof window === 'undefined') return
  if (autosaveTimer) clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => {
    void flushAutosave()
  }, AUTOSAVE_DEBOUNCE_MS)
}

export const useErdEditorStore = create<ErdEditorState & InternalFields>()((set, get) => {
  /**
   * Apply a mutation to the present project with history bookkeeping.
   * `label === null` always creates a fresh history entry.
   */
  function commit(label: string | null, updater: (project: ErdProject) => ErdProject): void {
    const state = get()
    if (!state.project) return
    const next = updater(state.project)
    if (next === state.project) return

    const now = Date.now()
    const coalesce =
      label !== null && state.lastLabel === label && now - state.lastCommitAt < COALESCE_WINDOW_MS

    set({
      project: next,
      past: coalesce ? state.past : [...state.past, state.project].slice(-HISTORY_LIMIT),
      future: coalesce ? state.future : [],
      lastLabel: label,
      lastCommitAt: now,
      saveStatus: 'dirty'
    })
    scheduleAutosave()
  }

  return {
    project: null,
    past: [],
    future: [],
    selectedTableId: null,
    selectedRelationshipId: null,
    pendingConnection: null,
    saveStatus: 'saved',
    lastLabel: null,
    lastCommitAt: 0,
    gestureActive: false,

    loadProject(project) {
      set({
        project,
        past: [],
        future: [],
        selectedTableId: null,
        selectedRelationshipId: null,
        pendingConnection: null,
        saveStatus: 'saved',
        lastLabel: null,
        lastCommitAt: 0,
        gestureActive: false
      })
    },

    closeProject() {
      const { project, saveStatus } = get()
      if (autosaveTimer) {
        clearTimeout(autosaveTimer)
        autosaveTimer = undefined
        // Leaving the page must not drop unsaved edits (spec §19 autosave).
        if (project && saveStatus === 'dirty') {
          const projectId = project.projectId
          void projectRepository
            .saveProject(project)
            .then(() => getProjectSync().pushNow(projectId))
            .catch((error) => {
              console.error('Autosave on close failed:', error)
            })
        }
      }
      set({
        project: null,
        past: [],
        future: [],
        selectedTableId: null,
        selectedRelationshipId: null,
        pendingConnection: null,
        saveStatus: 'saved'
      })
    },

    renameProject(name) {
      commit('rename-project', (p) => ({ ...p, name }))
    },

    addTable(position) {
      const state = get()
      if (!state.project) return ''
      const count = state.project.tables.length
      const table = createTable(
        `table_${count + 1}`,
        position ?? {
          x: 80 + (count % 4) * 280,
          y: 80 + Math.floor(count / 4) * 220
        }
      )
      commit(null, (p) => ({ ...p, tables: [...p.tables, table] }))
      set({ selectedTableId: table.id })
      return table.id
    },

    renameTable(tableId, name) {
      commit(`rename-table-${tableId}`, (p) => updateTable(p, tableId, (t) => ({ ...t, name })))
    },

    moveTable(tableId, position, transient) {
      const state = get()
      if (!state.project) return

      const applyMove = (p: ErdProject): ErdProject =>
        updateTable(p, tableId, (t) => ({ ...t, position }))

      if (transient && state.gestureActive) {
        // Drag in progress: mutate present only (history already pushed).
        set({ project: applyMove(state.project), saveStatus: 'dirty' })
      } else {
        // First drag frame (transient) or programmatic move: one history entry.
        set({
          project: applyMove(state.project),
          past: [...state.past, state.project].slice(-HISTORY_LIMIT),
          future: [],
          gestureActive: transient,
          lastLabel: null,
          lastCommitAt: Date.now(),
          saveStatus: 'dirty'
        })
      }
      scheduleAutosave()
    },

    endGesture() {
      if (get().gestureActive) set({ gestureActive: false })
    },

    removeTable(tableId) {
      commit(null, (p) =>
        removeOrphanRelationships({ ...p, tables: p.tables.filter((t) => t.id !== tableId) })
      )
      const { selectedTableId } = get()
      if (selectedTableId === tableId) set({ selectedTableId: null })
    },

    duplicateTable(tableId) {
      const state = get()
      const source = state.project?.tables.find((t) => t.id === tableId)
      if (!state.project || !source) return null
      const copy = duplicateTableFactory(source)
      commit(null, (p) => ({ ...p, tables: [...p.tables, copy] }))
      set({ selectedTableId: copy.id })
      return copy.id
    },

    addColumn(tableId) {
      const state = get()
      const table = state.project?.tables.find((t) => t.id === tableId)
      if (!state.project || !table) return null
      const columnId = `col-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      commit(`add-column-${tableId}`, (p) =>
        updateTable(p, tableId, (t) => ({
          ...t,
          columns: [
            ...t.columns,
            {
              id: columnId,
              name: `column_${t.columns.length + 1}`,
              type: 'TEXT',
              primaryKey: false,
              nullable: true,
              unique: false
            }
          ]
        }))
      )
      return columnId
    },

    updateColumn(tableId, columnId, patch) {
      commit(`column-${columnId}`, (p) =>
        updateTable(p, tableId, (t) => ({
          ...t,
          columns: t.columns.map((c) => (c.id === columnId ? { ...c, ...patch } : c))
        }))
      )
    },

    removeColumn(tableId, columnId) {
      commit(null, (p) =>
        removeOrphanRelationships(
          updateTable(p, tableId, (t) => ({
            ...t,
            columns: t.columns.filter((c) => c.id !== columnId)
          }))
        )
      )
    },

    addRelationship(relationship) {
      const id =
        relationship.id ??
        `rel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      commit(null, (p) => ({
        ...p,
        relationships: [
          ...p.relationships,
          {
            id,
            sourceTableId: relationship.sourceTableId,
            sourceColumnId: relationship.sourceColumnId,
            targetTableId: relationship.targetTableId,
            targetColumnId: relationship.targetColumnId,
            cardinality: relationship.cardinality
          }
        ]
      }))
      return id
    },

    removeRelationship(relationshipId) {
      commit(null, (p) => ({
        ...p,
        relationships: p.relationships.filter((r) => r.id !== relationshipId)
      }))
      const { selectedRelationshipId } = get()
      if (selectedRelationshipId === relationshipId) set({ selectedRelationshipId: null })
    },

    setViewport(viewport) {
      const state = get()
      if (!state.project) return
      // Viewport is editor chrome, not student work: never enters history.
      set({
        project: { ...state.project, viewport },
        saveStatus: 'dirty'
      })
      scheduleAutosave()
    },

    selectTable(tableId) {
      set({ selectedTableId: tableId, selectedRelationshipId: null })
    },

    selectRelationship(relationshipId) {
      set({ selectedRelationshipId: relationshipId, selectedTableId: null })
    },

    setPendingConnection(connection) {
      set({ pendingConnection: connection })
    },

    undo() {
      const state = get()
      if (!state.project || state.past.length === 0) return
      const past = [...state.past]
      const previous = past.pop()
      if (!previous) return
      set({
        project: previous,
        past,
        future: [state.project, ...state.future].slice(0, HISTORY_LIMIT),
        lastLabel: null,
        gestureActive: false,
        saveStatus: 'dirty'
      })
      scheduleAutosave()
    },

    redo() {
      const state = get()
      if (!state.project || state.future.length === 0) return
      const [next, ...future] = state.future
      set({
        project: next,
        past: [...state.past, state.project].slice(-HISTORY_LIMIT),
        future,
        lastLabel: null,
        gestureActive: false,
        saveStatus: 'dirty'
      })
      scheduleAutosave()
    },

    setSaveStatus(status) {
      set({ saveStatus: status })
    }
  }
})

/** Flush pending local changes before the tab closes (spec §19). */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const { project, saveStatus } = useErdEditorStore.getState()
    if (!project || saveStatus === 'saved' || saveStatus === 'offline') return
    try {
      // Synchronous flush: localStorage writes are synchronous.
      void projectRepository.saveProject(project)
    } catch {
      // Nothing else we can do on unload; local data was dirty.
    }
  })
}
