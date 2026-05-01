// ============================================================
// Minthy Training - RBAC Model (Roles + Permisos)
// ============================================================

export type Permission =
  | "workouts:read"
  | "workouts:write"
  | "clients:read"
  | "clients:assign"
  | "machines:manage"
  | "rankings:manage"
  | "billing:manage"
  | "staff:manage"
  | "gym:settings"

export type Role = "USER" | "TRAINER" | "ADMIN"

/** Mapping: role -> permissions granted */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  USER: ["workouts:read", "workouts:write"],
  TRAINER: ["workouts:read", "workouts:write", "clients:read", "clients:assign"],
  ADMIN: [
    "workouts:read",
    "workouts:write",
    "clients:read",
    "clients:assign",
    "machines:manage",
    "rankings:manage",
    "billing:manage",
    "staff:manage",
    "gym:settings",
  ],
}

/** Check if a role has ALL the required permissions */
export function hasPermissions(role: Role, required: Permission[]): boolean {
  const granted = ROLE_PERMISSIONS[role]
  return required.every((p) => granted.includes(p))
}

/** Check if a role has ANY of the required permissions */
export function hasAnyPermission(role: Role, required: Permission[]): boolean {
  const granted = ROLE_PERMISSIONS[role]
  return required.some((p) => granted.includes(p))
}
