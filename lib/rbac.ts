// ============================================================
// Minthy Training – RBAC Model (Roles + Permisos)
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

/** Mapping: role → permissions granted */
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

// –– Demo Users ––––––––––––––––––––––––––––––––––––––––––––––––
export interface AuthUser {
  id: string
  name: string
  email: string
  avatar: string
  role: Role
  permissions: Permission[]
  password: string // plaintext for demo only
}

export const DEMO_USERS: AuthUser[] = [
  {
    id: "admin-1",
    name: "Admin Minthy",
    email: "admin@minty.demo",
    avatar: "AM",
    role: "ADMIN",
    permissions: ROLE_PERMISSIONS.ADMIN,
    password: "Admin123!",
  },
  {
    id: "trainer-1",
    name: "Coach Maria",
    email: "trainer@minty.demo",
    avatar: "CM",
    role: "TRAINER",
    permissions: ROLE_PERMISSIONS.TRAINER,
    password: "Trainer123!",
  },
  {
    id: "u1",
    name: "Alex Trainer",
    email: "user@minty.demo",
    avatar: "AT",
    role: "USER",
    permissions: ROLE_PERMISSIONS.USER,
    password: "User123!",
  },
]

export function findDemoUser(email: string, password: string): AuthUser | null {
  return (
    DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    ) || null
  )
}

export function findDemoUserById(id: string): AuthUser | null {
  return DEMO_USERS.find((u) => u.id === id) || null
}
