import type { UserRole } from './cloudAdapter'

export interface RoleMeta {
  role: UserRole
  label: string
  shortLabel: string
  color: string
  description: string
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleMeta> = {
  super_admin: {
    role: 'super_admin',
    label: 'Super Admin (Administrator)',
    shortLabel: 'Super Admin',
    color: 'purple',
    description: 'Akses penuh ke seluruh konfigurasi sistem, kuota, manajemen instruktur & peserta.'
  },
  admin: {
    role: 'admin',
    label: 'Admin (Administrator)',
    shortLabel: 'Admin',
    color: 'magenta',
    description: 'Akses administrator sistem.'
  },
  lecturer: {
    role: 'lecturer',
    label: 'Instruktur / Lecturer',
    shortLabel: 'Instruktur',
    color: 'blue',
    description: 'Pengajar/Instruktur yang mengelola kursus, modul praktikum, dan penilaian tugas.'
  },
  student: {
    role: 'student',
    label: 'Peserta / Student',
    shortLabel: 'Peserta',
    color: 'green',
    description: 'Peserta pembelajaran/praktikum lab database.'
  }
}

export function getRoleMeta(role?: string | null): RoleMeta {
  if (role === 'super_admin' || role === 'admin' || role === 'lecturer' || role === 'student') {
    return ROLE_DEFINITIONS[role]
  }
  return ROLE_DEFINITIONS.student
}

export function getRoleLabel(role?: string | null): string {
  return getRoleMeta(role).label
}

export function getRoleShortLabel(role?: string | null): string {
  return getRoleMeta(role).shortLabel
}

export function getRoleTagColor(role?: string | null): string {
  return getRoleMeta(role).color
}

export function isLecturerOrAdmin(role?: string | null): boolean {
  return role === 'lecturer' || role === 'super_admin' || role === 'admin'
}

export function isSuperAdmin(role?: string | null): boolean {
  return role === 'super_admin' || role === 'admin'
}
