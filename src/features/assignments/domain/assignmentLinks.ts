import type { StudentProgress } from './assignmentModel'

/**
 * Assignment ↔ project links (Phase 6), stored locally per user-less key:
 * the link map belongs to this browser profile. Firestore remains the
 * source of truth for assignment definitions; links only record which
 * local project a student started for which assignment.
 */

const LINKS_KEY = 'dblab:assignment-links'

export interface AssignmentLink {
  assignmentId: string
  projectId: string
  startedAt: string
}

export type AssignmentLinks = Record<string, AssignmentLink>

export function loadLinks(storage: Storage = window.localStorage): AssignmentLinks {
  const raw = storage.getItem(LINKS_KEY)
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const links: AssignmentLinks = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as AssignmentLink).assignmentId === 'string' &&
        typeof (value as AssignmentLink).projectId === 'string'
      ) {
        links[key] = value as AssignmentLink
      }
    }
    return links
  } catch {
    return {}
  }
}

export function saveLinks(links: AssignmentLinks, storage: Storage = window.localStorage): void {
  storage.setItem(LINKS_KEY, JSON.stringify(links))
}

export function linkProject(
  assignmentId: string,
  projectId: string,
  storage: Storage = window.localStorage
): void {
  const links = loadLinks(storage)
  links[assignmentId] = { assignmentId, projectId, startedAt: new Date().toISOString() }
  saveLinks(links, storage)
}

export function getLink(
  assignmentId: string,
  storage: Storage = window.localStorage
): AssignmentLink | null {
  return loadLinks(storage)[assignmentId] ?? null
}

/** Phase 6 progress: 'submitted' arrives with Phase 7 submissions. */
export function deriveProgress(
  assignmentId: string,
  existingProjectIds: Set<string>,
  storage: Storage = window.localStorage
): StudentProgress {
  const link = getLink(assignmentId, storage)
  if (!link || !existingProjectIds.has(link.projectId)) return 'not-started'
  return 'in-progress'
}
