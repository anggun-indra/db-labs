import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  writeBatch
} from 'firebase/firestore'
import { getFirebaseApp } from '@/lib/firebase/config'
import { snapshotMetaSchema, type SnapshotMeta } from '@/features/snapshots/domain/snapshotModel'

export interface CollectionStat {
  name: string
  label: string
  count: number
  estimatedBytes: number
  description: string
}

export interface FirebaseQuotaUsage {
  totalStorageBytes: number
  maxStorageBytes: number
  usedStoragePercentage: number
  remainingStorageMB: number
  totalDocuments: number
  collections: CollectionStat[]
  dailyWritesLimit: number
  dailyReadsLimit: number
  dailyDeletesLimit: number
  monthlyEgressLimitBytes: number
  concurrentUsersLimit: number
  lastScannedAt: string
}

export interface PruneResult {
  prunedSnapshotsCount: number
  prunedChunksCount: number
  freedBytes: number
}

export interface CollectionDocItem {
  id: string
  collectionName: string
  createdAt?: string
  updatedAt?: string
  ownerUid?: string
  title?: string
  name?: string
  sizeBytes: number
  rawData: Record<string, unknown>
}

// 1 GiB Spark Free Tier limit
export const SPARK_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024
export const SPARK_DAILY_WRITES_LIMIT = 20000
export const SPARK_DAILY_READS_LIMIT = 50000
export const SPARK_DAILY_DELETES_LIMIT = 20000
export const SPARK_MONTHLY_EGRESS_BYTES = 10 * 1024 * 1024 * 1024 // 10 GiB
export const SPARK_MAX_CONCURRENT_USERS = 100

function estimateObjectBytes(obj: unknown): number {
  if (!obj) return 0
  try {
    const json = JSON.stringify(obj)
    return new TextEncoder().encode(json).length
  } catch {
    return 200 // conservative fallback
  }
}

import type { UserRole } from '@/lib/firebase/cloudAdapter'

export interface AdminUserItem {
  uid: string
  displayName: string
  email: string
  role: UserRole
  createdAt: string
}

export interface AdminCourseItem {
  courseId: string
  title: string
  description: string
  lecturerUid: string
  lecturerName?: string
  assignmentsCount: number
  studentsCount: number
  createdAt: string
  updatedAt: string
}

export class AdminUsageService {
  private getDb() {
    const app = getFirebaseApp()
    if (!app) throw new Error('Firebase is not initialized.')
    return getFirestore(app)
  }

  async fetchUsageStatistics(): Promise<FirebaseQuotaUsage> {
    const db = this.getDb()
    const nowIso = new Date().toISOString()

    const collectionNames = [
      { name: 'sqliteSnapshots', label: 'SQLite Snapshots & Chunks', desc: 'Database binaries & GZIP chunk documents' },
      { name: 'projects', label: 'ERD Projects', desc: 'Visual database design models' },
      { name: 'submissions', label: 'Student Submissions', desc: 'Submitted lab assignments & grades' },
      { name: 'assignments', label: 'Course Assignments', desc: 'Published & draft assignment modules' },
      { name: 'courses', label: 'Courses', desc: 'Classroom & academic course metadata' },
      { name: 'users', label: 'User Profiles', desc: 'Akun Super Admin, Instruktur, dan Peserta' },
      { name: 'taskProgress', label: 'Task Progress', desc: 'Progres dan status pengerjaan peserta' },
      { name: 'courseMemberships', label: 'Enrollments', desc: 'Data keanggotaan kelas peserta' }
    ]

    const stats: CollectionStat[] = []
    let totalBytes = 0
    let totalDocs = 0

    for (const item of collectionNames) {
      try {
        const snap = await getDocs(collection(db, item.name))
        const count = snap.size
        let colBytes = 0

        if (item.name === 'sqliteSnapshots') {
          // Calculate chunk sizes stored from metadata chunkCount & compressedSize
          let chunkDocsCount = 0
          snap.forEach((d) => {
            const data = d.data()
            const meta = snapshotMetaSchema.safeParse(data)
            if (meta.success) {
              const compSize = meta.data.compressedSize || 0
              colBytes += compSize + 500 // payload + meta doc overhead
              chunkDocsCount += meta.data.chunkCount || 1
            } else {
              colBytes += estimateObjectBytes(data)
            }
          })
          totalDocs += count + chunkDocsCount
          stats.push({
            name: item.name,
            label: item.label,
            count: count + chunkDocsCount,
            estimatedBytes: colBytes,
            description: `${item.desc} (${count} snapshots, ${chunkDocsCount} chunks)`
          })
        } else {
          snap.forEach((d) => {
            colBytes += estimateObjectBytes(d.data())
          })
          totalDocs += count
          stats.push({
            name: item.name,
            label: item.label,
            count,
            estimatedBytes: colBytes,
            description: item.desc
          })
        }

        totalBytes += colBytes
      } catch (err) {
        console.warn(`Could not read stats for collection ${item.name}:`, err)
        stats.push({
          name: item.name,
          label: item.label,
          count: 0,
          estimatedBytes: 0,
          description: `${item.desc} (unavailable)`
        })
      }
    }

    const usedPercentage = Math.min(100, Number(((totalBytes / SPARK_STORAGE_LIMIT_BYTES) * 100).toFixed(2)))
    const remainingMB = Math.max(0, Number(((SPARK_STORAGE_LIMIT_BYTES - totalBytes) / (1024 * 1024)).toFixed(1)))

    return {
      totalStorageBytes: totalBytes,
      maxStorageBytes: SPARK_STORAGE_LIMIT_BYTES,
      usedStoragePercentage: usedPercentage,
      remainingStorageMB: remainingMB,
      totalDocuments: totalDocs,
      collections: stats,
      dailyWritesLimit: SPARK_DAILY_WRITES_LIMIT,
      dailyReadsLimit: SPARK_DAILY_READS_LIMIT,
      dailyDeletesLimit: SPARK_DAILY_DELETES_LIMIT,
      monthlyEgressLimitBytes: SPARK_MONTHLY_EGRESS_BYTES,
      concurrentUsersLimit: SPARK_MAX_CONCURRENT_USERS,
      lastScannedAt: nowIso
    }
  }

  /**
   * Fetches full list of registered users.
   */
  async fetchUsersList(): Promise<AdminUserItem[]> {
    const db = this.getDb()
    const snap = await getDocs(collection(db, 'users'))
    const users: AdminUserItem[] = []

    snap.forEach((d) => {
      const data = d.data()
      users.push({
        uid: d.id,
        displayName: typeof data.displayName === 'string' ? data.displayName : '',
        email: typeof data.email === 'string' ? data.email : '',
        role: (data.role as UserRole) || 'student',
        createdAt: typeof data.createdAt === 'string' ? data.createdAt : ''
      })
    })

    // Sort newest first
    return users.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  }

  /**
   * Creates a new user profile in Firestore (by Super Admin / Lecturer).
   */
  async createUserProfile(user: AdminUserItem): Promise<void> {
    const db = this.getDb()
    const userRef = doc(db, 'users', user.uid)
    const profile = {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt || new Date().toISOString()
    }
    await setDoc(userRef, profile, { merge: true })
  }

  /**
   * Updates a user's role in Firestore.
   */
  async updateUserRole(uid: string, newRole: UserRole): Promise<void> {
    const db = this.getDb()
    const userRef = doc(db, 'users', uid)
    await setDoc(
      userRef,
      {
        role: newRole,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    )
  }

  /**
   * Fetches full list of courses with assignment and student counts.
   */
  async fetchCoursesList(): Promise<AdminCourseItem[]> {
    const db = this.getDb()
    const [coursesSnap, assignmentsSnap, membershipsSnap, usersSnap] = await Promise.all([
      getDocs(collection(db, 'courses')),
      getDocs(collection(db, 'assignments')),
      getDocs(collection(db, 'courseMemberships')),
      getDocs(collection(db, 'users'))
    ])

    const userNames = new Map<string, string>()
    usersSnap.forEach((u) => {
      const data = u.data()
      if (typeof data.displayName === 'string' && data.displayName) {
        userNames.set(u.id, data.displayName)
      }
    })

    const assignmentCounts = new Map<string, number>()
    assignmentsSnap.forEach((a) => {
      const data = a.data()
      const cId = data.courseId
      if (typeof cId === 'string') {
        assignmentCounts.set(cId, (assignmentCounts.get(cId) || 0) + 1)
      }
    })

    const studentCounts = new Map<string, number>()
    membershipsSnap.forEach((m) => {
      const data = m.data()
      const cId = data.courseId
      if (typeof cId === 'string') {
        studentCounts.set(cId, (studentCounts.get(cId) || 0) + 1)
      }
    })

    const courses: AdminCourseItem[] = []
    coursesSnap.forEach((c) => {
      const data = c.data()
      const lecturerUid = typeof data.lecturerUid === 'string' ? data.lecturerUid : ''
      courses.push({
        courseId: c.id,
        title: typeof data.title === 'string' ? data.title : c.id,
        description: typeof data.description === 'string' ? data.description : '',
        lecturerUid,
        lecturerName: userNames.get(lecturerUid) || lecturerUid,
        assignmentsCount: assignmentCounts.get(c.id) || 0,
        studentsCount: studentCounts.get(c.id) || 0,
        createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : ''
      })
    })

    return courses.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  }

  /**
   * Prunes older manual snapshots per project while strictly preserving all
   * immutable submission snapshots (`kind === 'submission'`).
   */
  async pruneManualSnapshots(keepCountPerProject = 1): Promise<PruneResult> {
    const db = this.getDb()
    const snapshotColl = await getDocs(collection(db, 'sqliteSnapshots'))

    const manualByProject = new Map<string, SnapshotMeta[]>()

    snapshotColl.forEach((d) => {
      const parsed = snapshotMetaSchema.safeParse(d.data())
      if (parsed.success && parsed.data.kind === 'manual') {
        const list = manualByProject.get(parsed.data.projectId) ?? []
        list.push(parsed.data)
        manualByProject.set(parsed.data.projectId, list)
      }
    })

    let prunedSnapshotsCount = 0
    let prunedChunksCount = 0
    let freedBytes = 0

    for (const [, list] of manualByProject) {
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      const toDelete = list.slice(keepCountPerProject)

      for (const snap of toDelete) {
        const batch = writeBatch(db)
        for (let i = 0; i < snap.chunkCount; i++) {
          batch.delete(doc(db, 'sqliteSnapshots', snap.snapshotId, 'chunks', String(i)))
          prunedChunksCount++
        }
        batch.delete(doc(db, 'sqliteSnapshots', snap.snapshotId))
        await batch.commit()

        prunedSnapshotsCount++
        freedBytes += snap.compressedSize || 0
      }
    }

    return {
      prunedSnapshotsCount,
      prunedChunksCount,
      freedBytes
    }
  }

  /**
   * Deletes a document from a specified collection. If it's a snapshot,
   * also deletes its chunks subcollection documents.
   */
  async deleteDocument(collectionName: string, docId: string): Promise<void> {
    const db = this.getDb()

    if (collectionName === 'sqliteSnapshots') {
      const metaRef = doc(db, 'sqliteSnapshots', docId)
      const metaSnap = await getDoc(metaRef)
      if (metaSnap.exists()) {
        const meta = snapshotMetaSchema.safeParse(metaSnap.data())
        const chunkCount = meta.success ? meta.data.chunkCount : 20
        const batch = writeBatch(db)
        for (let i = 0; i < chunkCount; i++) {
          batch.delete(doc(db, 'sqliteSnapshots', docId, 'chunks', String(i)))
        }
        batch.delete(metaRef)
        await batch.commit()
        return
      }
    }

    await deleteDoc(doc(db, collectionName, docId))
  }

  /**
   * Lists documents in a collection for the Super Admin explorer.
   */
  async listCollectionDocuments(collectionName: string, limitCount = 50): Promise<CollectionDocItem[]> {
    const db = this.getDb()
    const snap = await getDocs(collection(db, collectionName))
    const items: CollectionDocItem[] = []

    let index = 0
    snap.forEach((d) => {
      if (index >= limitCount) return
      const data = d.data() as Record<string, unknown>
      const sizeBytes = estimateObjectBytes(data)

      items.push({
        id: d.id,
        collectionName,
        createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
        ownerUid: typeof data.ownerUid === 'string' ? data.ownerUid : (typeof data.uid === 'string' ? data.uid : undefined),
        title: typeof data.title === 'string' ? data.title : (typeof data.name === 'string' ? data.name : undefined),
        name: typeof data.name === 'string' ? data.name : undefined,
        sizeBytes,
        rawData: data
      })
      index++
    })

    return items
  }
}

let adminUsageServiceInstance: AdminUsageService | null = null

export function getAdminUsageService(): AdminUsageService {
  if (!adminUsageServiceInstance) {
    adminUsageServiceInstance = new AdminUsageService()
  }
  return adminUsageServiceInstance
}

