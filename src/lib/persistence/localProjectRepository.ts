import { erdProjectSchema, type ErdProject } from '@/features/erd/domain/schema'

/**
 * Local-first project persistence (spec §3, §13, §19).
 *
 * Phase 1 stores ERD projects in localStorage behind a repository interface.
 * The ERD JSON is small (tens of KB), so localStorage is sufficient for now;
 * the interface is async so a later phase can swap in IndexedDB (or Firestore
 * sync) without touching callers. See docs/decisions/0004.
 */

export interface ProjectSummary {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface ProjectRepository {
  listProjects(): Promise<ProjectSummary[]>
  loadProject(id: string): Promise<ErdProject | null>
  saveProject(project: ErdProject): Promise<void>
  deleteProject(id: string): Promise<void>
}

const INDEX_KEY = 'dblab:projects:index'
const projectKey = (id: string) => `dblab:project:${id}`

interface StoredIndexEntry extends ProjectSummary {
  createdAt: string
  updatedAt: string
}

function readIndex(storage: Storage): StoredIndexEntry[] {
  const raw = storage.getItem(INDEX_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is StoredIndexEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as StoredIndexEntry).id === 'string' &&
        typeof (entry as StoredIndexEntry).name === 'string'
    )
  } catch {
    return []
  }
}

function writeIndex(storage: Storage, entries: StoredIndexEntry[]): void {
  storage.setItem(INDEX_KEY, JSON.stringify(entries))
}

export class LocalProjectRepository implements ProjectRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  async listProjects(): Promise<ProjectSummary[]> {
    const entries = readIndex(this.storage)
    return entries
      .map((entry, storedIndex) => ({
        summary: {
          id: entry.id,
          name: entry.name,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt
        },
        storedIndex
      }))
      .sort(
        (a, b) =>
          b.summary.updatedAt.localeCompare(a.summary.updatedAt) ||
          // Same-millisecond saves: newest-stored wins (entries are appended).
          b.storedIndex - a.storedIndex
      )
      .map(({ summary }) => summary)
  }

  async loadProject(id: string): Promise<ErdProject | null> {
    const raw = this.storage.getItem(projectKey(id))
    if (!raw) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      const result = erdProjectSchema.safeParse(parsed)
      if (!result.success) {
        // Spec §39: validate imported/local ERD JSON. Never crash on bad data;
        // report and leave the document untouched for inspection/recovery.
        console.error(`ERD project ${id} failed validation:`, result.error.issues)
        return null
      }
      return result.data
    } catch (error) {
      console.error(`ERD project ${id} could not be parsed:`, error)
      return null
    }
  }

  async saveProject(project: ErdProject): Promise<void> {
    const now = new Date().toISOString()
    this.storage.setItem(projectKey(project.projectId), JSON.stringify(project))

    const index = readIndex(this.storage)
    const existing = index.find((entry) => entry.id === project.projectId)
    if (existing) {
      existing.name = project.name
      existing.updatedAt = now
    } else {
      index.push({
        id: project.projectId,
        name: project.name,
        createdAt: now,
        updatedAt: now
      })
    }
    writeIndex(this.storage, index)
  }

  async deleteProject(id: string): Promise<void> {
    this.storage.removeItem(projectKey(id))
    writeIndex(
      this.storage,
      readIndex(this.storage).filter((entry) => entry.id !== id)
    )
  }
}

/** Singleton used by the app; tests construct their own instance. */
export const projectRepository: ProjectRepository =
  typeof window !== 'undefined' ? new LocalProjectRepository() : (undefined as never)
