export type Role = "USER" | "TRAINER" | "ADMIN"

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

export interface AuthUser {
  id: string
  name: string
  email: string
  passwordHash: string
  role: Role
  avatar: string
}

export interface SessionPayload {
  userId: string
  email: string
  name: string
  role: Role
  avatar: string
  iat: number
  exp: number
}
