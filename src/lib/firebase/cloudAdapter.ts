import { getAuth, GoogleAuthProvider, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile,
  type User } from 'firebase/auth'
import { getFirestore, collection, deleteDoc, doc, getDocs, query, setDoc,
  where, getDoc } from 'firebase/firestore'
import { getFirebaseApp } from './config'
import { erdProjectSchema } from '@/features/erd/domain/schema'
import { z } from 'zod'

/**
 * Cloud adapters for Phase 4. Everything is guarded by isFirebaseConfigured():
 * in local mode these factories return null and the app keeps working fully
 * offline (spec §6 local-first).
 *
 * Only Firebase Auth + Firestore are used — never Storage or paid services
 * (spec §2.1).
 */

export interface FirebaseUserLike {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
}

export interface AuthAdapter {
  onAuthChange(cb: (user: FirebaseUserLike | null) => void): () => void
  signInGoogle(): Promise<FirebaseUserLike>
  signInEmail(email: string, password: string): Promise<FirebaseUserLike>
  signUpEmail(name: string, email: string, password: string): Promise<FirebaseUserLike>
  signOutUser(): Promise<void>
}

const toUserLike = (user: User): FirebaseUserLike => ({
  uid: user.uid,
  displayName: user.displayName,
  email: user.email,
  photoURL: user.photoURL
})

export function createFirebaseAuthAdapter(): AuthAdapter | null {
  const app = getFirebaseApp()
  if (!app) return null
  const auth = getAuth(app)

  return {
    onAuthChange(cb) {
      return onAuthStateChanged(auth, (user) => cb(user ? toUserLike(user) : null))
    },
    async signInGoogle() {
      const { signInWithPopup } = await import('firebase/auth')
      const credential = await signInWithPopup(auth, new GoogleAuthProvider())
      return toUserLike(credential.user)
    },
    async signInEmail(email, password) {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      return toUserLike(credential.user)
    },
    async signUpEmail(name, email, password) {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      if (name) await updateProfile(credential.user, { displayName: name })
      return { ...toUserLike(credential.user), displayName: name || credential.user.displayName }
    },
    async signOutUser() {
      await signOut(auth)
    }
  }
}

/* ------------------------------------------------------------------------ */
/* Firestore data contracts (see FIRESTORE-DATA-MODEL.md)                    */
/* ------------------------------------------------------------------------ */

export const userRoleSchema = z.enum(['student', 'lecturer', 'super_admin', 'admin'])

export const userProfileSchema = z.object({
  uid: z.string().min(1),
  displayName: z.string().default(''),
  email: z.string().default(''),
  role: userRoleSchema.default('student'),
  createdAt: z.string().default('')
})

export type UserRole = z.infer<typeof userRoleSchema>

export interface UserProfile {
  uid: string
  displayName: string
  email: string
  role: UserRole
  createdAt: string
}


export const remoteProjectSchema = z.object({
  projectId: z.string().min(1),
  ownerUid: z.string().min(1),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  erd: erdProjectSchema
})

export type RemoteProjectDoc = z.infer<typeof remoteProjectSchema>

export interface CloudProjectAdapter {
  pullProjects(uid: string): Promise<RemoteProjectDoc[]>
  pushProject(doc: RemoteProjectDoc): Promise<void>
  deleteProject(uid: string, projectId: string): Promise<void>
}

export interface CloudUserAdapter {
  loadProfile(uid: string): Promise<UserProfile | null>
  createProfile(profile: UserProfile): Promise<void>
}

export function createFirestoreAdapters(): {
  projects: CloudProjectAdapter
  users: CloudUserAdapter
} | null {
  const app = getFirebaseApp()
  if (!app) return null
  const db = getFirestore(app)

  return {
    projects: {
      async pullProjects(uid) {
        // No orderBy on purpose: avoids a composite index requirement and
        // keeps Spark-plan Firestore usage minimal. Sorting happens locally.
        const snapshot = await getDocs(
          query(collection(db, 'projects'), where('ownerUid', '==', uid))
        )
        const docs: RemoteProjectDoc[] = []
        snapshot.forEach((d) => {
          const parsed = remoteProjectSchema.safeParse(d.data())
          // Malformed remote documents are skipped, never thrown at the user.
          if (parsed.success) docs.push(parsed.data)
        })
        return docs
      },
      async pushProject(projectDoc) {
        await setDoc(doc(db, 'projects', projectDoc.projectId), projectDoc)
      },
      async deleteProject(uid, projectId) {
        const ref = doc(db, 'projects', projectId)
        const existing = await getDoc(ref)
        // Never delete documents owned by someone else.
        if (existing.exists() && existing.data().ownerUid === uid) {
          await deleteDoc(ref)
        }
      }
    },
    users: {
      async loadProfile(uid) {
        const snapshot = await getDoc(doc(db, 'users', uid))
        if (!snapshot.exists()) return null
        const parsed = userProfileSchema.safeParse(snapshot.data())
        return parsed.success ? parsed.data : null
      },
      async createProfile(profile) {
        await setDoc(doc(db, 'users', profile.uid), profile)
      }
    }
  }
}

