import { type AppRole, type Permission, ROLE_PERMISSIONS } from './types'

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function hasAllPermissions(role: AppRole, permissions: Permission[]): boolean {
  return permissions.every((p) => ROLE_PERMISSIONS[role].includes(p))
}

export function hasAnyPermission(role: AppRole, permissions: Permission[]): boolean {
  return permissions.some((p) => ROLE_PERMISSIONS[role].includes(p))
}

// Helper: ¿es un rol con acceso de gestión (admin o super_admin)?
export function isAdminRole(role: AppRole): boolean {
  return role === 'admin' || role === 'super_admin'
}

// Helper: ¿es entrenador o admin?
export function isCoachOrAdmin(role: AppRole): boolean {
  return role === 'coach' || role === 'admin' || role === 'super_admin'
}

// Devuelve la ruta de dashboard según el rol
export function getDashboardRoute(role: AppRole): string {
  if (role === 'admin' || role === 'super_admin') return '/admin'
  if (role === 'coach') return '/trainer'
  return '/dashboard'
}
