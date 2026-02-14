import { type Role, type Permission, ROLE_PERMISSIONS } from "./types"

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => ROLE_PERMISSIONS[role].includes(p))
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => ROLE_PERMISSIONS[role].includes(p))
}
